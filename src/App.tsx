import{SignInButton,SignUpButton,UserButton,useUser}from"@clerk/react";
import{Activity,BookOpenText,Camera,Check,ChevronRight,CircleHelp,Clock3,Gauge,Keyboard,Laptop,Lightbulb,LockKeyhole,Settings2,UserPlus,X}from"lucide-react";
import{useEffect,useRef,useState,type ReactNode}from"react";
import{load,save}from"./lib/storage";
import{adaptive,learn,randomWord}from"./lib/typing";
import{GazeMonitor}from"./lib/gaze";
import{scoreWebNN}from"./lib/webnn";
import{createQuiz,scoreQuiz,type QuizScore}from"./lib/quiz";
import{PersonalModel}from"./lib/personal-model";
import{VisionBridge}from"./lib/vision-bridge";
import{FUNCTION_ROW,MAC_BOTTOM_ROW,MAC_ROWS,WINDOWS_BOTTOM_ROW,WINDOWS_NUMBER_ROW,WINDOWS_ROWS,nextKey,normalizeKey,type KeyDef}from"./lib/keyboard";
import{animateDefinition,animateKeyGuide,animateKeyPress,animateModal,animatePanel,animateSession,animateWord,animateWordExit}from"./lib/animations";
import{quietlyRefineProfile}from"./lib/local-model";
import{probeDeviceRuntime,runtimeSummary,type DeviceRuntimeProfile}from"./lib/device-runtime";
import{connectPhysicalKeyboard,hasWebHID,observeKeyboardKey,readKeyboardProfile,type KeyboardProfile}from"./lib/keyboard-profile";
import{readPerformanceMode,savePerformanceMode,performanceModeLabel,type PerformanceMode}from"./lib/performance";
import{fetchPracticeBatch,fetchSimpleDefinition,fetchWordDetails,type PracticeWord,type WordDetails}from"./lib/word-api";
import type{GazeState,Progress,QuizResult}from"./types";

type KeyboardStyle="windows"|"mac";

export default function App({clerk=false}:{clerk?:boolean}){
  const[p,setP]=useState<Progress>(()=>load());
  const[word,setWord]=useState("type");
  const[index,setIndex]=useState(0);
  const[wrong,setWrong]=useState(false);
  const[stuck,setStuck]=useState(false);
  const[definition,setDefinition]=useState<string|null>(null);
  const[wordIsNew,setWordIsNew]=useState(false);
  const[wordDetails,setWordDetails]=useState<WordDetails|null>(null);
  const[detailsOpen,setDetailsOpen]=useState(false);
  const[detailsLoading,setDetailsLoading]=useState(false);
  const[detailsError,setDetailsError]=useState(false);
  const[account,setAccount]=useState(false);
  const[quiz,setQuiz]=useState(false);
  const[help,setHelp]=useState(false);
  const[settings,setSettings]=useState(false);
  const[keyboardStyle,setKeyboardStyle]=useState<KeyboardStyle>(()=>localStorage.getItem("typing-pro-keyboard-style")==="mac"?"mac":"windows");
  const[visionEnabled,setVisionEnabled]=useState(()=>localStorage.getItem("typing-pro-vision-enabled")==="true");
  const[performanceMode,setPerformanceMode]=useState<PerformanceMode>(()=>readPerformanceMode());
  const[runtimeProfile,setRuntimeProfile]=useState<DeviceRuntimeProfile|null>(null);
  const[physicalKeyboard,setPhysicalKeyboard]=useState<KeyboardProfile|null>(()=>readKeyboardProfile());
  const[keyboardError,setKeyboardError]=useState<string|null>(null);
  const learner=useRef<PersonalModel|null>(null);
  const vision=useRef(new VisionBridge());
  const skills=useRef(p.skillMap);
  const active=useRef(p.activeSeconds);
  const lastActivity=useRef(Date.now());
  const lastKey=useRef(performance.now());
  const wordStarted=useRef(performance.now());
  const hadError=useRef(false);
  const refineAt=useRef(0);
  const wordRef=useRef<HTMLDivElement>(null);
  const sessionRef=useRef<HTMLDivElement>(null);
  const definitionRef=useRef<HTMLButtonElement>(null);
  const keyboardRef=useRef<HTMLDivElement>(null);
  const shownWords=useRef<Set<string>>(readShownWords());
  const wordQueue=useRef<PracticeWord[]>([]);
  const queueRequest=useRef<AbortController|null>(null);
  const detailsRequest=useRef<AbortController|null>(null);
  const workspaceRef=useRef<HTMLElement>(null);

  useEffect(()=>{skills.current=p.skillMap},[p.skillMap]);

  useEffect(()=>{
    savePerformanceMode(performanceMode);
    let cancelled=false;
    setRuntimeProfile(null);
    void probeDeviceRuntime(performanceMode).then(profile=>{if(!cancelled)setRuntimeProfile(profile)}).catch(()=>{});
    return()=>{cancelled=true};
  },[performanceMode]);
  useEffect(()=>save(p),[p]);

  useEffect(()=>{
    learner.current=new PersonalModel({skills:p.skillMap,transitions:{},fatigue:0});
    learner.current.onUpdate(snapshot=>{skills.current=snapshot.skills});
    const sync=window.setInterval(()=>setP(current=>({...current,skillMap:skills.current})),2500);

    const controller=new AbortController();
    queueRequest.current=controller;
    const blocked=new Set([...shownWords.current,word]);
    void fetchPracticeBatch(shownWords.current,blocked,controller.signal)
      .then(batch=>{
        if(controller.signal.aborted)return;
        wordQueue.current.push(...batch);
      })
      .catch(()=>{})
      .finally(()=>{
        if(queueRequest.current===controller)queueRequest.current=null;
      });

    return()=>{
      controller.abort();
      queueRequest.current=null;
      window.clearInterval(sync);
      learner.current?.dispose();
    };
  },[]);

  useEffect(()=>{
    animatePanel(workspaceRef.current?.querySelector(".practice-area")??null);
    animatePanel(workspaceRef.current?.querySelector(".practice-side")??null);
  },[]);

  useEffect(()=>{
    if(!word)return;
    setStuck(false);
    const id=window.setTimeout(()=>{if(!wrong)setStuck(true)},1500);
    return()=>clearTimeout(id);
  },[word,index,wrong]);

  useEffect(()=>{
    if(!word)return;
    requestAnimationFrame(()=>animateWord(wordRef.current));
    if(wordQueue.current.length<=3&&queueRequest.current===null){
      const controller=new AbortController();
      queueRequest.current=controller;
      const blocked=new Set([...shownWords.current,word,...wordQueue.current.map(item=>item.word)]);
      void fetchPracticeBatch(shownWords.current,blocked,controller.signal)
        .then(batch=>{
          if(controller.signal.aborted)return;
          const queued=new Set(wordQueue.current.map(item=>item.word));
          for(const item of batch){
            if(item.word!==word&&!queued.has(item.word)){
              wordQueue.current.push(item);
              queued.add(item.word);
            }
          }
        })
        .catch(()=>{})
        .finally(()=>{
          if(queueRequest.current===controller)queueRequest.current=null;
        });
    }
  },[word]);

  useEffect(()=>{
    if(definition)requestAnimationFrame(()=>animateDefinition(definitionRef.current));
  },[definition]);

  useEffect(()=>{
    if(!wordIsNew)return;
    let cancelled=false;
    void fetchSimpleDefinition(word,definition).then(simple=>{
      if(cancelled||!simple)return;
      setDefinition(simple);
    });
    return()=>{cancelled=true};
  },[word,wordIsNew]);

  useEffect(()=>{
    requestAnimationFrame(()=>animateSession(sessionRef.current));
  },[word]);

  useEffect(()=>{
    const currentTarget=nextKey(word,index);
    if(!currentTarget||!stuck)return;
    const key=keyboardRef.current?.querySelector<HTMLElement>('[data-key="'+currentTarget+'"]')??null;
    animateKeyGuide(key);
  },[stuck,word,index]);

  useEffect(()=>{
    localStorage.setItem("typing-pro-keyboard-style",keyboardStyle);
  },[keyboardStyle]);

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
    const onKey=(event:KeyboardEvent)=>{
      if(quiz||account||help||settings||detailsOpen)return;
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
      setPhysicalKeyboard(observeKeyboardKey(actual));
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
        const targetEl=keyboardRef.current?.querySelector<HTMLElement>('[data-key="'+normalizedExpected+'"]')??null;
        animateKeyGuide(targetEl);
        return;
      }
      event.preventDefault();
      setWrong(false);
      setStuck(false);
      const keyEl=keyboardRef.current?.querySelector<HTMLElement>('[data-key="'+normalizedExpected+'"]')??null;
      animateKeyPress(keyEl);
      if(index===word.length-1){
        learner.current?.record({kind:"word",word,correct:!hadError.current,duration:now-wordStarted.current});
        setP(current=>({...current,totalPracticeWords:current.totalPracticeWords+1}));
        hadError.current=false;
        const next=wordQueue.current.shift()??{word:randomWord(skills.current,word),definition:null,isNew:false};
        const advance=()=>{
          setWord(next.word);
          setWordIsNew(next.isNew);
          setDefinition(next.isNew ? (next.definition ?? "Meaning unavailable") : null);
          if(next.isNew)markShownWord(next.word,shownWords.current);
          setIndex(0);
          wordStarted.current=performance.now();
        };
        animateWordExit(wordRef.current,advance);
      }else{
        setIndex(value=>value+1);
      }
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[word,index,quiz,account,help,settings,detailsOpen]);

  useEffect(()=>{
    if(p.totalPracticeWords===0||p.totalPracticeWords%20!==0)return;
    if(Date.now()-refineAt.current<120000)return;
    refineAt.current=Date.now();
    const run=()=>void quietlyRefineProfile("activeSeconds="+p.activeSeconds+";totalWords="+p.totalPracticeWords+";skills="+JSON.stringify(skills.current),performanceMode);
    if("requestIdleCallback"in window){
      (window as any).requestIdleCallback(run,{timeout:8000});
    }else{
      globalThis.setTimeout(run,3000);
    }
  },[p.totalPracticeWords,performanceMode]);

  useEffect(()=>{if(p.activeSeconds>=1800)setQuiz(true)},[p.activeSeconds]);

  const target=nextKey(word,index);
  const remaining=Math.max(0,1800-p.activeSeconds);
  const percent=word ? Math.min(100,Math.round((index/word.length)*100)) : 0;
  const rows=keyboardStyle==="windows"?WINDOWS_ROWS:MAC_ROWS;
  const bottom=keyboardStyle==="windows"?WINDOWS_BOTTOM_ROW:MAC_BOTTOM_ROW;

  function openWordDetails(){
    detailsRequest.current?.abort();
    const controller=new AbortController();
    detailsRequest.current=controller;
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError(false);
    setWordDetails(null);
    void fetchWordDetails(word,controller.signal).then(result=>{
      if(controller.signal.aborted)return;
      setWordDetails(result);
      setDetailsLoading(false);
      setDetailsError(!result);
    }).catch(()=>{
      if(controller.signal.aborted)return;
      setDetailsLoading(false);
      setDetailsError(true);
    }).finally(()=>{
      if(detailsRequest.current===controller)detailsRequest.current=null;
    });
  }

  function closeWordDetails(){
    detailsRequest.current?.abort();
    detailsRequest.current=null;
    setDetailsOpen(false);
    setDetailsLoading(false);
  }

  function finishQuiz(result:QuizResult,targetText:string,answer:string){
    active.current=0;
    setP(current=>({...current,activeSeconds:0,bestScore:Math.max(current.bestScore,result.score),skillMap:learn(current.skillMap,targetText,answer),history:[result,...current.history].slice(0,30)}));
  }

  function renderKeys(row:KeyDef[],rowName:string){
    return <div className="key-row" key={rowName}>{row.map(key=><div key={key.k} data-key={key.k} className={"key "+(key.kind==="modifier"?"modifier-key ":"")+(key.k===target?"target ":"")} style={{flex:key.w??1}}>{key.label??(key.k.length===1?key.k.toUpperCase():key.k.toUpperCase())}</div>)}</div>
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

    <main className="workspace" ref={workspaceRef}>
      <section className="practice-area">
        <div className="word-stage">
          <div className="session-line" ref={sessionRef}><span>Practice</span><span>{percent}%</span></div>
          {wordIsNew && definition&&<button type="button" className="word-definition" ref={definitionRef} aria-label={"Open full meaning for "+word} onClick={openWordDetails}><span>meaning</span><strong>{definition}</strong></button>}
          <div className="word" ref={wordRef} aria-live="polite">{[...word].map((char,i)=><span key={i} className={"word-char "+(i<index?"typed":i===index?(wrong?"wrong":"current"):"")}>{char}</span>)}</div>
          <div className="subtle-hint">
            {stuck?<><Lightbulb size={15}/><span>press <strong>{target==="space"?"SPACE":target.toUpperCase()}</strong> next</span></>:wrong?<><X size={14}/><span>try that key again</span></>:<span>type the highlighted key</span>}
          </div>
        </div>

        <div className="keyboard-stage">
          <div className="keyboard" ref={keyboardRef} aria-label={keyboardStyle==="windows"?"Windows keyboard visualization":"Mac keyboard visualization"}>
            <div className="function-row">{FUNCTION_ROW.map(key=><div key={key.k} className="key function-key" data-key={key.k} style={{flex:key.w??1}}>{key.label}</div>)}</div>
            {renderKeys(WINDOWS_NUMBER_ROW,"number-row")}
            {rows.map((row,i)=>renderKeys(row,"main-row-"+i))}
            {renderKeys(bottom,"bottom-row")}
          </div>
          <div className="keyboard-note"><Activity size={13}/><span>{physicalKeyboard?.exactDevice?physicalKeyboard.name:(keyboardStyle==="windows"?"Windows keyboard":"Mac keyboard")} · the trainer learns from every correct and incorrect press</span></div>
        </div>
      </section>

      <aside className="practice-side">
        <div className="mini-card"><div className="mini-label">Words</div><div className="big-stat">{p.totalPracticeWords}</div><div className="muted">completed this device</div></div>
        <div className="mini-card"><div className="mini-label">Check-in</div><div className="check-row"><span>{remaining?formatTime(remaining):"Ready"}</span><Clock3 size={15}/></div><button className="solid-action" onClick={()=>setQuiz(true)}><span>Take check-in</span><ChevronRight size={16}/></button></div>
        <div className="mini-card privacy-card"><LockKeyhole size={16}/><div><strong>Private by default</strong><p>Your typing stays on this device unless you choose to sync an account.</p></div></div>
      </aside>
    </main>

    {account&&<AccountWarning clerk={clerk} close={()=>setAccount(false)}/>}
    {help&&<SimpleModal title="How it works" icon={<CircleHelp size={20}/>} close={()=>setHelp(false)}><p>Type the highlighted letters without looking down. When you pause for a moment, the trainer shows the exact key to press next.</p><p>Each completed word is replaced with another randomized word so practice keeps moving.</p></SimpleModal>}
    {settings&&<SettingsModal
      close={()=>setSettings(false)}
      keyboardStyle={keyboardStyle}
      setKeyboardStyle={setKeyboardStyle}
      physicalKeyboard={physicalKeyboard}
      setPhysicalKeyboard={setPhysicalKeyboard}
      hasWebHID={hasWebHID()}
      connectPhysicalKeyboard={connectPhysicalKeyboard}
      keyboardError={keyboardError}
      setKeyboardError={setKeyboardError}
      performanceMode={performanceMode}
      setPerformanceMode={setPerformanceMode}
      runtimeProfile={runtimeProfile}
      visionEnabled={visionEnabled}
      setVisionEnabled={setVisionEnabled}
    />}
    {detailsOpen&&<WordDetailsModal word={word} details={wordDetails} loading={detailsLoading} error={detailsError} close={closeWordDetails}/>}
    {quiz&&<QuizModal skillMap={p.skillMap} onClose={()=>setQuiz(false)} onRecord={event=>learner.current?.record(event)} onFinish={(result,targetText,answer)=>finishQuiz(result,targetText,answer)}/>}
  </div>
}

export function ComputerRequiredScreen(){
  return <main className="computer-only-screen">
    <div className="computer-only-card">
      <div className="computer-only-icon"><Laptop size={28}/></div>
      <div className="modal-step">Computer required</div>
      <h1>Open Typing-Pro on a computer</h1>
      <p>Typing-Pro is built for a physical computer keyboard and currently supports desktop and laptop computers only.</p>
      <div className="computer-only-note"><Keyboard size={16}/><span>Come back from a Windows, Mac, Linux, or Chromebook computer to start practicing.</span></div>
    </div>
  </main>
}

function SettingsModal({close,keyboardStyle,setKeyboardStyle,physicalKeyboard,setPhysicalKeyboard,hasWebHID,connectPhysicalKeyboard,keyboardError,setKeyboardError,performanceMode,setPerformanceMode,runtimeProfile,visionEnabled,setVisionEnabled}:{
  close:()=>void;
  keyboardStyle:KeyboardStyle;
  setKeyboardStyle:(value:KeyboardStyle)=>void;
  physicalKeyboard:KeyboardProfile|null;
  setPhysicalKeyboard:(value:KeyboardProfile)=>void;
  hasWebHID:boolean;
  connectPhysicalKeyboard:()=>Promise<KeyboardProfile>;
  keyboardError:string|null;
  setKeyboardError:(value:string|null)=>void;
  performanceMode:PerformanceMode;
  setPerformanceMode:(value:PerformanceMode)=>void;
  runtimeProfile:DeviceRuntimeProfile|null;
  visionEnabled:boolean;
  setVisionEnabled:(value:boolean)=>void;
}){
  const modal=useRef<HTMLDivElement>(null);
  useEffect(()=>animateModal(modal.current),[]);
  return <div className="overlay">
    <div className="settings-modal" ref={modal} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header className="settings-header">
        <div className="settings-header-main">
          <div className="modal-icon"><Settings2 size={20}/></div>
          <div><div className="modal-step">Preferences</div><h2 id="settings-title">Settings</h2></div>
        </div>
        <button className="icon-action" onClick={close} aria-label="Close settings"><X size={17}/></button>
      </header>
      <div className="settings-scroll">
        <section className="settings-card settings-performance">
          <div className="settings-card-head"><div className="settings-card-icon"><Gauge size={17}/></div><div><strong>Performance</strong><p>Control how the background training model uses your device and the cloud.</p></div></div>
          <div className="performance-options" role="group" aria-label="Performance mode">
            <button className={performanceMode==="low"?"performance-option active":"performance-option"} onClick={()=>setPerformanceMode("low")}><strong>Low</strong><span>100% cloud</span></button>
            <button className={performanceMode==="balanced"?"performance-option active":"performance-option"} onClick={()=>setPerformanceMode("balanced")}><strong>Balanced</strong><span>70% cloud · 30% device</span></button>
            <button className={performanceMode==="max"?"performance-option active":"performance-option"} onClick={()=>setPerformanceMode("max")}><strong>Max</strong><span>100% device</span></button>
          </div>
          <div className="settings-caption"><Gauge size={14}/><span>It does use the cloud because your device may not handle the on device model that this site has to load.</span></div>
          <div className="settings-caption secondary"><span>Max automatically falls back to cloud when the device fails the safety check.</span></div>
        </section>

        <div className="settings-grid">
          <section className="settings-card">
            <div className="settings-card-head"><div className="settings-card-icon"><Keyboard size={17}/></div><div><strong>Keyboard style</strong><p>Choose the keyboard visualization shown during practice.</p></div></div>
            <div className="choice-row settings-choice-row" role="group" aria-label="Keyboard style">
              <button className={keyboardStyle==="windows"?"choice active":"choice"} onClick={()=>setKeyboardStyle("windows")}>Windows</button>
              <button className={keyboardStyle==="mac"?"choice active":"choice"} onClick={()=>setKeyboardStyle("mac")}>Mac</button>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-head"><div className="settings-card-icon"><Activity size={17}/></div><div><strong>Physical keyboard</strong><p>{physicalKeyboard?.exactDevice?<>Detected <strong>{physicalKeyboard.name}</strong>.</>:physicalKeyboard?"Your key layout is being learned locally.":"Learn your layout from typing or connect the keyboard when supported."}</p></div></div>
            <button className="settings-button" onClick={async()=>{
              setKeyboardError(null);
              try{
                const profile=await connectPhysicalKeyboard();
                setPhysicalKeyboard(profile);
                setKeyboardStyle(profile.layout==="mac"?"mac":"windows");
              }catch(error){
                setKeyboardError(error instanceof Error?error.message:"Keyboard connection was cancelled.");
              }
            }}>{hasWebHID?"Connect keyboard":"Detect from typing"}</button>
            {keyboardError&&<div className="permission-error">{keyboardError}</div>}
          </section>

          <section className="settings-card">
            <div className="settings-card-head"><div className="settings-card-icon"><Gauge size={17}/></div><div><strong>AI runtime</strong><p>{runtimeProfile?runtimeSummary(runtimeProfile):"Checking this device before loading the local model…"}</p></div></div>
            <div className="settings-status"><span>Selected backend</span><strong>{runtimeProfile?.preferredBackend??"checking"}</strong></div>
          </section>

          <section className="settings-card">
            <div className="settings-card-head"><div className="settings-card-icon"><Activity size={17}/></div><div><strong>Vision signals</strong><p>Use aggregate gaze or hand-pose signals from the Keyboard Vision extension you paired yourself.</p></div></div>
            <label className="settings-toggle"><span>Use paired vision signals</span><input type="checkbox" checked={visionEnabled} onChange={event=>setVisionEnabled(event.target.checked)}/></label>
          </section>
        </div>

        <div className="settings-privacy"><LockKeyhole size={15}/><div><strong>Privacy</strong><span>Camera access for Typing-Pro itself is limited to check-ins. Paired vision signals are optional.</span></div></div>
      </div>
      <footer className="settings-footer"><span>Changes save automatically.</span><button className="solid-action" onClick={close}>Done</button></footer>
    </div>
  </div>
}

function AccountControl({open}:{open:()=>void}){
  const{isSignedIn}=useUser();
  if(isSignedIn)return <UserButton/>;
  return <><button className="outline-action" onClick={open}><UserPlus size={16}/><span>Sign up</span></button><SignInButton><button className="quiet-action">Sign in</button></SignInButton></>
}

function AccountWarning({clerk,close}:{clerk:boolean;close:()=>void}){
  const[stage,setStage]=useState<0|1>(0);
  const modal=useRef<HTMLDivElement>(null);
  useEffect(()=>animateModal(modal.current),[]);
  return <div className="overlay"><div className="account-modal" ref={modal}>
    <div className="modal-icon">{stage===0?<UserPlus size={21}/>:<Check size={21}/>}</div>
    <div className="modal-step">{stage===0?"Optional account":"One last choice"}</div>
    <h2>{stage===0?"Create an account?":"Save your progress across devices"}</h2>
    <p>{stage===0?"You can type normally on this device without signing up. An account is only for carrying your progress between devices.":"Your typing practice can stay local, or you can sign up and keep your progress available when you switch devices."}</p>
    <div className="modal-actions">
      <button className="outline-action" onClick={close}>Not now</button>
      {stage===0?<button className="solid-action" onClick={()=>setStage(1)}>Continue</button>:clerk?<SignUpButton><button className="solid-action">Yes, save progress</button></SignUpButton>:<button className="solid-action" onClick={close}>Yes, save progress</button>}
    </div>
  </div></div>
}

function SimpleModal({title,icon,close,children}:{title:string;icon:ReactNode;close:()=>void;children:ReactNode}){
  const modal=useRef<HTMLDivElement>(null);
  useEffect(()=>animateModal(modal.current),[]);
  return <div className="overlay"><div className="account-modal" ref={modal}><div className="modal-top"><div><div className="modal-icon">{icon}</div><h2>{title}</h2></div><button className="icon-action" onClick={close} aria-label="Close"><X size={17}/></button></div>{children}<div className="modal-actions"><button className="solid-action" onClick={close}>Done</button></div></div></div>
}

function WordDetailsModal({word,details,loading,error,close}:{word:string;details:WordDetails|null;loading:boolean;error:boolean;close:()=>void}){
  const modal=useRef<HTMLDivElement>(null);
  useEffect(()=>animateModal(modal.current),[]);
  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="word-details-title">
    <div className="details-modal" ref={modal}>
      <div className="modal-top">
        <div>
          <div className="modal-icon"><BookOpenText size={20}/></div>
          <div className="modal-step">Word meaning</div>
          <h2 id="word-details-title">{word}</h2>
        </div>
        <button className="icon-action" onClick={close} aria-label="Close"><X size={17}/></button>
      </div>
      {loading&&<div className="details-loading">Loading the full meaning…</div>}
      {error&&<div className="permission-error">The full word details could not be loaded. The short meaning can still be used.</div>}
      {details&&<>
        {details.alternateOf&&<div className="word-form-notice">
          <div className="word-form-notice-icon"><BookOpenText size={15}/></div>
          <div>
            <strong>This word is {details.alternateOfType?.startsWith("alternative")||details.alternateOfType?.startsWith("archaic")||details.alternateOfType?.startsWith("obsolete")||details.alternateOfType?.startsWith("informal")||details.alternateOfType?.startsWith("inflected")||details.alternateOfType?.startsWith("adjective")?"an":"a"} {details.alternateOfType||"an alternative form"} of <b>{details.alternateOf}</b>.</strong>
            {details.alternateOfSimpleDefinition&&<span>The original word means: <b>{details.alternateOfSimpleDefinition}</b></span>}
          </div>
        </div>}
        {details.alternateOf&&details.alternateOfDefinition&&<section className="details-section original-word-section">
          <div className="details-label">Original word · {details.alternateOf}</div>
          <div className="details-definition">{details.alternateOfDefinition}</div>
        </section>
        <section className="details-section">
          <div className="details-label">Full definition</div>
          <div className="details-definition">{details.fullDefinition}</div>
        </section>
        <section className="details-grid">
          <div className="details-section">
            <div className="details-label">Synonyms</div>
            <div className="details-chips">{details.synonyms.length?details.synonyms.map(item=><span className="details-chip" key={item}>{item}</span>):<span className="details-empty">None found</span>}</div>
          </div>
          <div className="details-section">
            <div className="details-label">Antonyms</div>
            <div className="details-chips">{details.antonyms.length?details.antonyms.map(item=><span className="details-chip" key={item}>{item}</span>):<span className="details-empty">None found</span>}</div>
          </div>
        </section>
        <section className="details-section">
          <div className="details-label">Example sentences</div>
          <div className="details-examples">
            {(details.examples.length?details.examples:["Example sentences are not available right now.","Try the word in a sentence of your own."]).map((item,index)=><div className="details-example" key={item}><span>{index+1}</span><p>{item}</p></div>)}
          </div>
        </section>
      </>}
      <div className="modal-actions"><button className="solid-action" onClick={close}>Done</button></div>
    </div>
  </div>
}

function QuizModal({skillMap,onClose,onFinish,onRecord}:{skillMap:Progress["skillMap"];onClose:()=>void;onFinish:(result:QuizResult,target:string,answer:string)=>void;onRecord:(event:{kind:"key";expected:string;actual:string;latency:number}|{kind:"word";word:string;correct:boolean;duration:number})=>void}){
  const[phase,setPhase]=useState<"intro"|"running"|"result">("intro"),[gaze,setGaze]=useState<GazeState>("unknown"),[paused,setPaused]=useState(false),[answer,setAnswer]=useState(""),[score,setScore]=useState<QuizScore|null>(null),[error,setError]=useState(""),[elapsed,setElapsed]=useState(0);
  const target=useRef(createQuiz(skillMap)),started=useRef(0),times=useRef<number[]>([]),backspaces=useRef(0),focus=useRef(0),lastKey=useRef(performance.now()),video=useRef<HTMLVideoElement>(null),monitor=useRef<GazeMonitor|null>(null),previous=useRef<GazeState>("unknown"),hadError=useRef(false),modal=useRef<HTMLDivElement>(null);
  useEffect(()=>animateModal(modal.current),[]);
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

  if(phase==="result"&&score)return <div className="overlay"><div className="quiz-modal result-modal" ref={modal}><div className="result-top"><div><div className="modal-step">Check-in complete</div><h2>{score.score}/100</h2></div><button className="icon-action" onClick={onClose} aria-label="Close"><X size={17}/></button></div><div className="result-metrics"><div><span>WPM</span><strong>{score.stats.wpm.toFixed(0)}</strong></div><div><span>Accuracy</span><strong>{(score.stats.accuracy*100).toFixed(0)}%</strong></div><div><span>Consistency</span><strong>{(score.stats.consistency*100).toFixed(0)}%</strong></div><div><span>Focus pauses</span><strong>{score.focusPauses}</strong></div></div><div className="result-list"><div className="mini-label">Things to work on</div>{score.tips.map(item=><div className="tip" key={item}><Check size={14}/><span>{item}</span></div>)}</div><div className="result-footer"><span>scored locally with {score.backend}</span><button className="solid-action" onClick={onClose}>Done</button></div></div></div>;

  return <div className="overlay"><div className="quiz-modal" ref={modal}><div className="result-top"><div><div className="modal-step">60 second check-in</div><h2>Stay on the screen.</h2></div><button className="icon-action" onClick={onClose} aria-label="Close"><X size={17}/></button></div><div className="camera-preview"><video ref={video} muted playsInline/><div><Camera size={15}/><span>{phase==="intro"?"camera will be used for this check-in":paused?"check-in paused":"focus assist on"}</span></div></div>{phase==="intro"?<><p>Camera permission is required to continue. Local vision pauses the check-in when it detects a downward keyboard-looking pose.</p>{error&&<div className="permission-error">{error}</div>}<div className="modal-actions"><button className="outline-action" onClick={onClose}>Not now</button><button className="solid-action" onClick={start}>Allow camera & start</button></div></>:<><div className="quiz-status"><span>{paused?"Paused · look back at the screen":gaze==="screen"?"Screen focus":"Checking focus"}</span><span>00:{String(Math.min(60,elapsed)).padStart(2,"0")}</span></div><div className="quiz-target">{[...target.current].map((char,i)=><span key={i} className={i<answer.length?(answer[i]===char?"typed":"miss"):""}>{char}</span>)}</div><textarea autoFocus value={answer} readOnly={paused} onChange={onType} onPaste={event=>event.preventDefault()} placeholder={paused?"Look back at the screen…":"Type the check-in text…"} spellCheck={false}/><div className="quiz-foot"><div><Camera size={14}/><span>camera frames stay out of progress data</span></div><button className="quiet-action" onClick={finish}>Finish</button></div></>}</div></div>
}

function formatTime(seconds:number){const m=Math.floor(seconds/60),s=seconds%60;return m+":"+String(s).padStart(2,"0")}


function readShownWords(){
  try{
    const raw=localStorage.getItem("typing-pro-shown-words-v2");
    const parsed=JSON.parse(raw||"[]");
    return new Set<string>(Array.isArray(parsed)?parsed.filter((word):word is string=>typeof word==="string"):[]);
  }catch{
    return new Set<string>();
  }
}

function markShownWord(word:string,set:Set<string>){
  set.add(word);
  try{
    localStorage.setItem("typing-pro-shown-words-v2",JSON.stringify([...set].slice(-1000)));
  }catch{
    // Storage is optional; practice still works without it.
  }
}
