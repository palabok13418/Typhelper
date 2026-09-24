import{SignInButton,SignUpButton,UserButton,useUser}from"@clerk/react";
import{Activity,Camera,Check,ChevronRight,CircleHelp,Clock3,Keyboard,Lightbulb,LockKeyhole,Settings2,UserPlus,X}from"lucide-react";
import{useEffect,useRef,useState}from"react";
import{load,save}from"./lib/storage";
import{adaptive,learn}from"./lib/typing";
import{GazeMonitor}from"./lib/gaze";
import{scoreWebNN}from"./lib/webnn";
import{createQuiz,scoreQuiz,type QuizScore}from"./lib/quiz";
import{PersonalModel}from"./lib/personal-model";
import{VisionBridge}from"./lib/vision-bridge";
import{nextKey,normalizeKey,ROWS}from"./lib/keyboard";
import{quietlyRefineProfile}from"./lib/local-model";
import type{GazeState,Progress,QuizResult}from"./types";

export default function App({clerk=false}:{clerk?:boolean}){
  const[p,setP]=useState<Progress>(()=>load());
  const[word,setWord]=useState("");
  const[index,setIndex]=useState(0);
  const[wrong,setWrong]=useState(false);
  const[stuck,setStuck]=useState(false);
  const[account,setAccount]=useState(false);
  const[quiz,setQuiz]=useState(false);
  const[help,setHelp]=useState(false);
  const[settings,setSettings]=useState(false);
  const[visionEnabled,setVisionEnabled]=useState(()=>localStorage.getItem("typing-pro-vision-enabled")==="true");
  const learner=useRef<PersonalModel|null>(null);
  const vision=useRef(new VisionBridge());
  const skills=useRef(p.skillMap);
  const active=useRef(p.activeSeconds);
  const lastActivity=useRef(Date.now());
  const lastKey=useRef(performance.now());
  const wordStarted=useRef(performance.now());
  const hadError=useRef(false);
  const refineAt=useRef(0);

  useEffect(()=>{skills.current=p.skillMap},[p.skillMap]);
  useEffect(()=>save(p),[p]);

  useEffect(()=>{
    const first=adaptive(p.skillMap,1)[0]??"type";
    setWord(first);
    learner.current=new PersonalModel({skills:p.skillMap,transitions:{},fatigue:0});
    learner.current.onUpdate(snapshot=>{
      skills.current=snapshot.skills;
      const now=Date.now();
      if(now-lastKey.current>700){
        setP(current=>({...current,skillMap:snapshot.skills}));
      }
    });
    return()=>learner.current?.dispose();
  },[]);

  useEffect(()=>{
    const bridge=vision.current;
    bridge.start(signal=>{
      if(!visionEnabled)return;
      learner.current?.record({kind:"vision",gaze:signal.gaze,hand:signal.hand??null});
    });
    const activity=()=>{lastActivity.current=Date.now()};
    const timer=window.setInterval(()=>{
      if(document.visibilityState!=="visible"||quiz)return;
      if(Date.now()-lastActivity.current<12000){
        active.current=Math.min(1800,active.current+1);
        setP(current=>({...current,activeSeconds:Math.min(1800,current.activeSeconds+1)}));
      }
      if(active.current>=1800)setQuiz(true);
    },1000);
    window.addEventListener("keydown",activity);
    window.addEventListener("pointerdown",activity);
    return()=>{window.clearInterval(timer);window.removeEventListener("keydown",activity);window.removeEventListener("pointerdown",activity);bridge.stop()};
  },[quiz,visionEnabled]);

  useEffect(()=>{
    localStorage.setItem("typing-pro-vision-enabled",String(visionEnabled));
  },[visionEnabled]);

  useEffect(()=>{
    if(!word)return;
    setStuck(false);
    const id=window.setTimeout(()=>{if(!wrong)setStuck(true)},1500);
    return()=>clearTimeout(id);
  },[word,index,wrong]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(quiz||account||help||settings)return;
      if(event.metaKey||event.ctrlKey||event.altKey)return;
      if(event.key==="Backspace"){
        event.preventDefault();
        setIndex(value=>Math.max(0,value-1));
        setWrong(false);
        setStuck(false);
        lastActivity.current=Date.now();
        return;
      }
      if(event.key.length!==1&&event.key!==" ")return;
      const expected=word[index]??"";
      const actual=event.key;
      const normalizedExpected=normalizeKey(expected);
      const normalizedActual=normalizeKey(actual);
      const now=performance.now();
      const latency=now-lastKey.current;
      lastKey.current=now;
      lastActivity.current=Date.now();
      learner.current?.record({kind:"key",expected,actual,latency});
      if(normalizedActual!==normalizedExpected){
        hadError.current=true;
        setWrong(true);
        return;
      }
      event.preventDefault();
      setWrong(false);
      setStuck(false);
      if(index===word.length-1){
        learner.current?.record({kind:"word",word,correct:!hadError.current,duration:now-wordStarted.current});
        setP(current=>({...current,totalPracticeWords:current.totalPracticeWords+1}));
        hadError.current=false;
        const next=adaptive(skills.current,1)[0]??"type";
        setWord(next);
        setIndex(0);
        wordStarted.current=performance.now();
      }else{
        setIndex(value=>value+1);
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[word,index,quiz,account,help,settings]);

  useEffect(()=>{
    if(Date.now()-refineAt.current<120000)return;
    if(!("gpu"in navigator))return;
    refineAt.current=Date.now();
    const run=()=>void quietlyRefineProfile("activeSeconds="+p.activeSeconds+";totalWords="+p.totalPracticeWords+";skills="+JSON.stringify(skills.current));
    if("requestIdleCallback"in window){
      (window as any).requestIdleCallback(run,{timeout:4000});
    }else{
      window.setTimeout(run,1000);
    }
  },[p.activeSeconds,p.totalPracticeWords]);

  useEffect(()=>{if(p.activeSeconds>=1800)setQuiz(true)},[p.activeSeconds]);

  const target=nextKey(word,index);
  const remaining=Math.max(0,1800-p.activeSeconds);
  const percent=word?Math.round(index/word.length*100):0;

  function finishQuiz(result:QuizResult,targetText:string,answer:string){
    active.current=0;
    setP(current=>({...current,activeSeconds:0,bestScore:Math.max(current.bestScore,result.score),skillMap:learn(current.skillMap,targetText,answer),history:[result,...current.history].slice(0,30)}));
  }

  return <div className="app">
    <header className="topbar">
      <div className="left-controls">
        {clerk?<AccountControl open={()=>setAccount(true)}/>:<button className="outline-action" onClick={()=>setAccount(true)}><UserPlus size={16}/><span>Sign up</span></button>}
      </div>
      <div className="wordmark"><Keyboard size={18}/><span>Typing-Pro</span></div>
      <div className="right-controls">
        <button className="icon-action" aria-label="Help" onClick={()=>setHelp(true)}><CircleHelp size={17}/></button>
        <button className="icon-action" aria-label="Settings" onClick={()=>setSettings(true)}><Settings2 size={17}/></button>
        <div className="next-check"><Clock3 size={14}/><span>{remaining?formatTime(remaining):"check-in ready"}</span></div>
      </div>
    </header>
    <main className="workspace">
      <section className="practice-area">
        <div className="session-line"><span>Practice</span><span>{percent}%</span></div>
        <div className="word-stage">
          <div className="word" aria-live="polite">{[...word].map((char,i)=><span key={i} className={i<index?"typed":i===index?(wrong?"wrong":"current"):""}>{char}</span>)}</div>
          <div className="subtle-hint">
            {stuck?<><Lightbulb size={15}/><span>press <strong>{target==="space"?"SPACE":target.toUpperCase()}</strong> next</span></>:wrong?<><X size={14}/><span>try that key again</span></>:<span>type the highlighted key</span>}
          </div>
        </div>
        <div className="keyboard-stage">
          <div className="keyboard" aria-label="Keyboard visualization">
            <div className="key-row">{[..."1234567890"].map(key=><div className="key" key={key}>{key}</div>)}</div>
            {ROWS.map((row,rowIndex)=><div className="key-row" key={rowIndex}>{row.map(key=><div key={key.k} className={"key "+(key.k===target?"target":"")} style={{flex:key.w}}>{key.k.toUpperCase()}</div>)}</div>)}
            <div className="key-row">
              <div className="key wide">SHIFT</div>
              <div className="key space" />
              <div className="key wide">SHIFT</div>
            </div>
            <div className="key-row"><div className={"key space "+(target==="space"?"target":"")}>SPACE</div></div>
          </div>
          <div className="keyboard-note"><Activity size={13}/><span>the trainer learns from every correct and incorrect press</span></div>
        </div>
      </section>
      <aside className="practice-side">
        <div className="mini-card"><div className="mini-label">Words</div><div className="big-stat">{p.totalPracticeWords}</div><div className="muted">completed this device</div></div>
        <div className="mini-card"><div className="mini-label">Check-in</div><div className="check-row"><span>{remaining?formatTime(remaining):"Ready"}</span><Clock3 size={15}/></div><button className="solid-action" onClick={()=>setQuiz(true)}><span>Take check-in</span><ChevronRight size={16}/></button></div>
        <div className="mini-card privacy-card"><LockKeyhole size={16}/><div><strong>Private by default</strong><p>Your typing stays on this device unless you choose to sync an account.</p></div></div>
      </aside>
    </main>
    {account&&<AccountWarning clerk={clerk} close={()=>setAccount(false)}/>}
    {help&&<SimpleModal title="How it works" icon={<CircleHelp size={20}/>} close={()=>setHelp(false)}><p>Type the highlighted letters without looking down. When you pause for a moment, the trainer shows which key to press next.</p><p>Every result updates your personal practice profile on this device.</p></SimpleModal>}
    {settings&&<SimpleModal title="Settings" icon={<Settings2 size={20}/>} close={()=>setSettings(false)}><label className="toggle-row"><span><strong>Use paired vision signals</strong><small>Accept aggregate gaze or hand-pose signals from the Keyboard Vision extension you paired yourself.</small></span><input type="checkbox" checked={visionEnabled} onChange={event=>setVisionEnabled(event.target.checked)}/></label><div className="setting-note"><LockKeyhole size={14}/><span>Camera access for Typing-Pro itself is limited to check-ins.</span></div></SimpleModal>}
    {quiz&&<QuizModal skillMap={p.skillMap} onClose={()=>setQuiz(false)} onRecord={event=>learner.current?.record(event)} onFinish={(result,targetText,answer)=>finishQuiz(result,targetText,answer)}/>}
  </div>
}

function AccountControl({open}:{open:()=>void}){
  const{isSignedIn}=useUser();
  if(isSignedIn)return <UserButton/>;
  return <><button className="outline-action" onClick={open}><UserPlus size={16}/><span>Sign up</span></button><SignInButton><button className="quiet-action">Sign in</button></SignInButton></>
}

function AccountWarning({clerk,close}:{clerk:boolean;close:()=>void}){
  const[stage,setStage]=useState(0),[pos,setPos]=useState({x:0,y:0});
  const messages=["do you really want to make an account","Really?","You can do the typing only on this device. no account needed.","You can still back out"];
  const dodge=()=>setPos({x:(Math.random()-.5)*220,y:(Math.random()-.5)*120});
  return <div className="overlay"><div className="account-modal"><div className="modal-icon"><LockKeyhole size={21}/></div><div className="modal-step">Privacy check {stage+1}/4</div><h2>{messages[stage]}</h2><p>An account is optional. It only carries your progress to another device.</p><div className="modal-actions"><button className="outline-action" onClick={close}>No thanks</button>{stage<3?<button className="solid-action" onClick={()=>setStage(stage+1)}>Continue</button>:<div onPointerEnter={dodge} onPointerMove={dodge}><span className="dodge" style={{transform:"translate("+pos.x+"px,"+pos.y+"px)"}}>{clerk?<SignUpButton><button className="solid-action">Yes, save progress</button></SignUpButton>:<button className="solid-action" onClick={close}>Yes</button>}</span></div>}</div><div className="modal-note">You can still back out.</div></div></div>
}

function SimpleModal({title,icon,close,children}:{title:string;icon:React.ReactNode;close:()=>void;children:React.ReactNode}){
  return <div className="overlay"><div className="account-modal"><div className="modal-top"><div><div className="modal-icon">{icon}</div><h2>{title}</h2></div><button className="icon-action" onClick={close} aria-label="Close"><X size={17}/></button></div>{children}<div className="modal-actions"><button className="solid-action" onClick={close}>Done</button></div></div></div>
}

function QuizModal({skillMap,onClose,onFinish,onRecord}:{skillMap:Progress["skillMap"];onClose:()=>void;onFinish:(result:QuizResult,target:string,answer:string)=>void;onRecord:(event:{kind:"key";expected:string;actual:string;latency:number}|{kind:"word";word:string;correct:boolean;duration:number})=>void}){
  const[phase,setPhase]=useState<"intro"|"running"|"result">("intro"),[gaze,setGaze]=useState<GazeState>("unknown"),[paused,setPaused]=useState(false),[answer,setAnswer]=useState(""),[score,setScore]=useState<QuizScore|null>(null),[error,setError]=useState(""),[elapsed,setElapsed]=useState(0);
  const target=useRef(createQuiz(skillMap)),started=useRef(0),times=useRef<number[]>([]),backspaces=useRef(0),focus=useRef(0),lastKey=useRef(performance.now()),video=useRef<HTMLVideoElement>(null),monitor=useRef<GazeMonitor|null>(null),previous=useRef<GazeState>("unknown"),hadError=useRef(false);
  useEffect(()=>()=>monitor.current?.stop(video.current||undefined),[]);
  useEffect(()=>{if(phase!=="running")return;const id=window.setInterval(()=>{if(!paused)setElapsed(value=>value+1)},1000);return()=>window.clearInterval(id)},[phase,paused]);
  useEffect(()=>{if(elapsed>=60&&phase==="running")void finish()},[elapsed]);
  async function start(){
    setError("");
    try{
      const m=new GazeMonitor();monitor.current=m;
      await m.start(video.current!,state=>{
        setGaze(state);
        if(state==="keyboard"&&previous.current!=="keyboard"){focus.current+=1;setPaused(true)}
        if(state==="screen")setPaused(false);
        previous.current=state;
      });
      started.current=Date.now();lastKey.current=performance.now();setPhase("running");
    }catch(e){setError(e instanceof Error?e.message:"Camera permission was denied.");}
  }
  async function finish(){
    if(phase!=="running")return;
    monitor.current?.stop(video.current||undefined);
    const local=scoreQuiz(target.current,answer,started.current,times.current,backspaces.current,focus.current);
    const nn=await scoreWebNN([local.stats.accuracy,Math.min(1,local.stats.wpm/70),local.stats.consistency,Math.max(0,1-local.stats.backspaceRate),Math.max(0,1-focus.current/6)]);
    const final={...local,score:nn.score,backend:nn.backend};
    setScore(final);setPhase("result");
    onFinish({id:crypto.randomUUID(),createdAt:Date.now(),score:final.score,stats:final.stats,focusPauses:final.focusPauses},target.current,answer);
  }
  function onType(event:React.ChangeEvent<HTMLTextAreaElement>){
    if(paused)return;
    const next=event.target.value.slice(0,target.current.length);
    if(next.length>answer.length){
      const position=next.length-1;
      const expected=target.current[position]??"";
      const actual=next[position]??"";
      const now=performance.now();
      const latency=now-lastKey.current;lastKey.current=now;
      times.current.push(now);
      if(actual!==expected)hadError.current=true;
      onRecord({kind:"key",expected,actual,latency});
    }
    if(next.length<answer.length){backspaces.current+=answer.length-next.length;hadError.current=true}
    setAnswer(next);
    if(next.length===target.current.length){
      onRecord({kind:"word",word:target.current,correct:!hadError.current,duration:Date.now()-started.current});
      void finish();
    }
  }
  if(phase==="result"&&score)return <div className="overlay"><div className="quiz-modal result-modal"><div className="result-top"><div><div className="modal-step">Check-in complete</div><h2>{score.score}/100</h2></div><button className="icon-action" onClick={onClose} aria-label="Close"><X size={17}/></button></div><div className="result-metrics"><div><span>WPM</span><strong>{score.stats.wpm.toFixed(0)}</strong></div><div><span>Accuracy</span><strong>{(score.stats.accuracy*100).toFixed(0)}%</strong></div><div><span>Consistency</span><strong>{(score.stats.consistency*100).toFixed(0)}%</strong></div><div><span>Focus pauses</span><strong>{score.focusPauses}</strong></div></div><div className="result-list"><div className="mini-label">Things to work on</div>{score.tips.map(item=><div className="tip" key={item}><Check size={14}/><span>{item}</span></div>)}</div><div className="result-footer"><span>scored locally with {score.backend}</span><button className="solid-action" onClick={onClose}>Done</button></div></div></div>;
  return <div className="overlay"><div className="quiz-modal"><div className="result-top"><div><div className="modal-step">60 second check-in</div><h2>Stay on the screen.</h2></div><button className="icon-action" onClick={onClose} aria-label="Close"><X size={17}/></button></div><div className="camera-preview"><video ref={video} muted playsInline/><div><Camera size={15}/><span>{phase==="intro"?"camera will be used for this check-in":paused?"check-in paused":"focus assist on"}</span></div></div>{phase==="intro"?<><p>Camera permission is required to continue. Local vision pauses the check-in when it detects a downward keyboard-looking pose.</p>{error&&<div className="permission-error">{error}</div>}<div className="modal-actions"><button className="outline-action" onClick={onClose}>Not now</button><button className="solid-action" onClick={start}>Allow camera & start</button></div></>:<><div className="quiz-status"><span>{paused?"Paused · look back at the screen":gaze==="screen"?"Screen focus":"Checking focus"}</span><span>00:{String(Math.min(60,elapsed)).padStart(2,"0")}</span></div><div className="quiz-target">{[...target.current].map((char,i)=><span key={i} className={i<answer.length?(answer[i]===char?"typed":"miss"):""}>{char}</span>)}</div><textarea autoFocus value={answer} readOnly={paused} onChange={onType} onPaste={event=>event.preventDefault()} placeholder={paused?"Look back at the screen…":"Type the check-in text…"} spellCheck={false}/><div className="quiz-foot"><div><Camera size={14}/><span>camera frames stay out of progress data</span></div><button className="quiet-action" onClick={finish}>Finish</button></div></>}</div></div>
}
function formatTime(seconds:number){const m=Math.floor(seconds/60),s=seconds%60;return m+":"+String(s).padStart(2,"0")}