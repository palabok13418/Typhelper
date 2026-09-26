import{Peer}from"peerjs";
import type{DataConnection}from"peerjs";
import{ArrowLeft,ChevronRight,Gamepad2,Hash,Play,RotateCcw,Share2,Swords,Trophy,Users,X,Zap}from"lucide-react";
import{useEffect,useMemo,useRef,useState,type KeyboardEvent as ReactKeyboardEvent,type ReactNode}from"react";
import{CASCADE_KEYS,PRECISION_WORDS,SPRINT_PASSAGES,cascadeScore,chooseItem,duelPassageForCode,loadGameStats,precisionScore,reportGameWpm,saveGameResult,sprintScore}from"../lib/games";
import{isValidUsername,loadGuestUsername,sanitizeUsername,saveGuestUsername}from"../lib/social";

type HubGame="sprint"|"cascade"|"precision"|"duel";
interface Props{open:boolean;close:()=>void;accountUsername:string|null}

const GAME_META=[
  {id:"sprint" as const,title:"Typing Sprint",tag:"FLOW",description:"45 seconds of focused passage typing. Build speed without losing control.",icon:Zap},
  {id:"cascade" as const,title:"Key Cascade",tag:"REACTION",description:"Incoming keys accelerate as your combo grows. Catch the target before it drops.",icon:Gamepad2},
  {id:"precision" as const,title:"Precision Run",tag:"ACCURACY",description:"Clear a stream of short words. Clean inputs keep your multiplier alive.",icon:Trophy},
  {id:"duel" as const,title:"Duelity",tag:"1V1",description:"Race another Typhelper player in a synchronized browser-to-browser typing duel.",icon:Swords}
];

const GAME_WORDS=PRECISION_WORDS;
const PEER_PREFIX="typhelper-duel-";
const DUEL_LIMIT_MS=60000;

export default function GameHub({open,close,accountUsername}:Props){
  const[selected,setSelected]=useState<HubGame|null>(null);
  const[stats,setStats]=useState(loadGameStats);

  useEffect(()=>{
    if(!open){setSelected(null);return}
    const refresh=()=>setStats(loadGameStats());
    window.addEventListener("typhelper-game-stats-changed",refresh);
    return()=>window.removeEventListener("typhelper-game-stats-changed",refresh);
  },[open]);

  if(!open)return null;
  return <div className="games-overlay">
    <div className="games-modal" role="dialog" aria-modal="true" aria-label="Typing games">
      <header className="games-header">
        <div>
          <div className="modal-step">Skill arcade</div>
          <h2>{selected?GAME_META.find(game=>game.id===selected)?.title:"Games"}</h2>
          <p>{selected?"A focused game session built to train the same typing skills you use in practice.":"Short, replayable challenges for speed, accuracy, rhythm, reaction, and head-to-head practice."}</p>
        </div>
        <button className="icon-action" onClick={selected?()=>setSelected(null):close} aria-label={selected?"Back to games":"Close games"}>{selected?<ArrowLeft size={17}/>:<X size={17}/>}</button>
      </header>
      {!selected&&<div className="games-home">
        <div className="games-hero">
          <div className="games-hero-icon"><Gamepad2 size={21}/></div>
          <div><strong>Train longer without feeling like you are drilling.</strong><span>Every game feeds your local session stats, while the signed-in account sync keeps the important results available across devices.</span></div>
        </div>
        <div className="games-grid">
          {GAME_META.map(game=>{
            const Icon=game.icon;
            const gameStat=stats[game.id];
            return <button key={game.id} className="game-card" onClick={()=>setSelected(game.id)}>
              <div className="game-card-top"><span className="game-tag">{game.tag}</span><Icon size={18}/></div>
              <h3>{game.title}</h3>
              <p>{game.description}</p>
              <div className="game-card-footer"><span>{gameStat?.plays??0} plays · best {gameStat?.best??0}</span><ChevronRight size={16}/></div>
            </button>;
          })}
        </div>
        <div className="games-rule"><Users size={14}/><span>Duelity supports logged-in names or a guest username saved on this device.</span></div>
      </div>}
      {selected==="sprint"&&<TypingSprint onExit={()=>setSelected(null)}/>}
      {selected==="cascade"&&<KeyCascade onExit={()=>setSelected(null)}/>}
      {selected==="precision"&&<PrecisionRun onExit={()=>setSelected(null)}/>}
      {selected==="duel"&&<Duelity accountUsername={accountUsername} onExit={()=>setSelected(null)}/>}
    </div>
  </div>
}

function GameTop({label,score,time,onExit}:{label:string;score:number|string;time:string;onExit:()=>void}){
  return <div className="game-run-top">
    <button className="game-back" onClick={onExit}><ArrowLeft size={14}/> Games</button>
    <div className="game-run-stat"><span>Score</span><strong>{score}</strong></div>
    <div className="game-run-stat"><span>Time</span><strong>{time}</strong></div>
  </div>
}

function Countdown({value}:{value:number|null}){
  if(value===null)return null;
  return <div className="game-countdown" aria-live="assertive"><span>{value>0?value:"GO"}</span></div>
}

function TypingSprint({onExit}:{onExit:()=>void}){
  const[target,setTarget]=useState(()=>chooseItem(SPRINT_PASSAGES));
  const[answer,setAnswer]=useState("");
  const[errors,setErrors]=useState(0);
  const[status,setStatus]=useState<"ready"|"countdown"|"playing"|"finished">("ready");
  const[countdown,setCountdown]=useState<number|null>(null);
  const[timeLeft,setTimeLeft]=useState(45);
  const[startAt,setStartAt]=useState(0);
  const[score,setScore]=useState(0);
  const[result,setResult]=useState<{score:number;wpm:number;accuracy:number}|null>(null);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const finishedRef=useRef(false);
  const answerRef=useRef("");
  const errorsRef=useRef(0);
  const targetRef=useRef(target);
  const startAtRef=useRef(0);

  useEffect(()=>{
    if(status!=="countdown")return;
    if(countdown===null){return}
    if(countdown===0){
      const timer=window.setTimeout(()=>{setStatus("playing");setStartAt(Date.now());setCountdown(null);inputRef.current?.focus()},450);
      return()=>window.clearTimeout(timer);
    }
    const timer=window.setTimeout(()=>setCountdown(value=>value===null?null:value-1),900);
    return()=>window.clearTimeout(timer);
  },[status,countdown]);

  useEffect(()=>{
    if(status!=="playing")return;
    const timer=window.setInterval(()=>{
      const elapsed=Math.max(0,Date.now()-startAt);
      const remaining=Math.max(0,45-Math.floor(elapsed/1000));
      setTimeLeft(remaining);
      if(remaining<=0)finish(elapsed);
    },100);
    return()=>window.clearInterval(timer);
  },[status,startAt]);

  function begin(){
    finishedRef.current=false;
    const nextTarget=chooseItem(SPRINT_PASSAGES);
    targetRef.current=nextTarget;
    answerRef.current="";
    errorsRef.current=0;
    setTarget(nextTarget);
    setAnswer("");
    setErrors(0);
    setScore(0);
    setResult(null);
    setTimeLeft(45);
    setCountdown(3);
    setStartAt(0);
    setStatus("countdown");
  }

  function finish(elapsed=Math.max(1,Date.now()-startAt)){
    if(finishedRef.current)return;
    finishedRef.current=true;
    const correct=Math.max(0,answer.split("").filter((char,index)=>char===target[index]).length);
    const total=Math.max(currentAnswer.length,1);
    const nextScore=sprintScore(correct,total,Math.min(elapsed,45000));
    const minutes=Math.max(1/60,Math.min(elapsed,45000)/60000);
    const wpm=(correct/5)/minutes;
    const accuracy=total?correct/total:0;
    setScore(nextScore);setResult({score:nextScore,wpm,accuracy});
    setStatus("finished");
    saveGameResult("sprint",nextScore);reportGameWpm(wpm);
  }

  function handleKey(event:ReactKeyboardEvent<HTMLTextAreaElement>){
    if(status!=="playing")return;
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    event.preventDefault();
    if(event.key==="Backspace"){
      setAnswer(value=>value.slice(0,-1));return;
    }
    if(event.key.length!==1)return;
    setAnswer(prev=>{
      if(prev.length>=target.length)return prev;
      const expected=target[prev.length];
      if(event.key!==expected){errorsRef.current+=1;setErrors(errorsRef.current)}
      const next=prev+event.key;
      answerRef.current=next;
      if(next.length===currentTarget.length)window.setTimeout(()=>finish(Date.now()-startAtRef.current),0);
      return next;
    });
  }

  const correctChars=Math.min(answer.length,target.length)-errors;
  const accuracy=answer.length?Math.max(0,correctChars/answer.length):1;
  const progress=Math.round(answer.length/Math.max(1,target.length)*100);

  return <div className="game-screen">
    <GameTop label="Typing Sprint" score={score} time={status==="finished"?"done":status==="ready"?"45":String(timeLeft)} onExit={onExit}/>
    {status==="ready"&&<GameLaunch title="Typing Sprint" description="Type the passage as far as you can in 45 seconds. Accuracy is worth almost as much as speed." button="Start sprint" onStart={begin}><div className="game-stat-strip"><span><strong>45s</strong> round</span><span><strong>+accuracy</strong> weighted</span><span><strong>combo</strong> driven</span></div></GameLaunch>}
    {status==="countdown"&&<div className="game-stage"><Countdown value={countdown}/></div>}
    {status==="playing"&&<div className="typing-game-stage">
      <div className="game-metrics"><span><strong>{Math.round((correctChars/5)/Math.max(1,(Date.now()-startAt)/60000))}</strong> WPM</span><span><strong>{Math.round(accuracy*100)}%</strong> accuracy</span><span><strong>{progress}%</strong> passage</span><span><strong>{errors}</strong> misses</span></div>
      <div className="game-progress"><i style={{width:progress+"%"}}/></div>
      <div className="game-target-text">{[...target].map((char,index)=><span key={index} className={index<answer.length?(answer[index]===char?"good":"bad"):index===answer.length?"active":""}>{char}</span>)}</div>
      <textarea ref={inputRef} className="game-capture" value={answer} onChange={()=>{}} onKeyDown={handleKey} aria-label="Typing Sprint input" autoFocus/>
      <div className="game-helper"><span>Keep the rhythm. Corrections cost accuracy.</span><span>Esc backs out to games</span></div>
    </div>}
    {status==="finished"&&result&&<GameResult icon={<Zap size={18}/>} title="Sprint complete" score={result.score} stats={[{label:"WPM",value:result.wpm.toFixed(0)},{label:"Accuracy",value:Math.round(result.accuracy*100)+"%"},{label:"Mistakes",value:String(errors)}]} onRetry={begin} onExit={onExit}/>}
  </div>
}

function KeyCascade({onExit}:{onExit:()=>void}){
  const[status,setStatus]=useState<"ready"|"countdown"|"playing"|"finished">("ready");
  const[countdown,setCountdown]=useState<number|null>(null);
  const[target,setTarget]=useState(()=>chooseItem(CASCADE_KEYS));
  const[rounds,setRounds]=useState(0);
  const[correct,setCorrect]=useState(0);
  const[errors,setErrors]=useState(0);
  const[lives,setLives]=useState(3);
  const[combo,setCombo]=useState(0);
  const[score,setScore]=useState(0);
  const[elapsed,setElapsed]=useState(0);
  const[drop,setDrop]=useState(0);
  const[startAt,setStartAt]=useState(0);
  const[finishedScore,setFinishedScore]=useState(0);
  const finishedRef=useRef(false);
  const scoreRef=useRef(0);
  const correctRef=useRef(0);
  const errorsRef=useRef(0);
  const livesRef=useRef(3);
  const comboRef=useRef(0);
  const targetRef=useRef(target);
  const startAtRef=useRef(0);

  useEffect(()=>{
    if(status!=="countdown")return;
    if(countdown===null)return;
    if(countdown===0){const t=window.setTimeout(()=>{const start=Date.now();startAtRef.current=start;setStatus("playing");setStartAt(start);setCountdown(null)},450);return()=>window.clearTimeout(t)}
    const t=window.setTimeout(()=>setCountdown(value=>value===null?null:value-1),850);return()=>window.clearTimeout(t);
  },[status,countdown]);

  useEffect(()=>{
    if(status!=="playing")return;
    const timer=window.setInterval(()=>{
      const now=Date.now();
      setElapsed(now-startAt);
      setDrop(value=>{
        const speed=0.0065+Math.min(.0075,comboRef.current*.00025);
        const next=value+speed;
        if(next>=1){
          livesRef.current=Math.max(0,livesRef.current-1);errorsRef.current+=1;comboRef.current=0;
          setLives(livesRef.current);setErrors(errorsRef.current);setCombo(0);
          return 0;
        }
        return next;
      });
      if(now-startAtRef.current>=60000)finish();
    },50);
    return()=>window.clearInterval(timer);
  },[status,startAt,combo]);

  useEffect(()=>{
    if(status==="playing"&&lives<=0)finish();
  },[lives,status]);

  function begin(){
    finishedRef.current=false;
    const nextTarget=chooseItem(CASCADE_KEYS);targetRef.current=nextTarget;scoreRef.current=0;correctRef.current=0;errorsRef.current=0;livesRef.current=3;comboRef.current=0;
    setTarget(nextTarget);setRounds(0);setCorrect(0);setErrors(0);setLives(3);setCombo(0);setScore(0);setDrop(0);setElapsed(0);setFinishedScore(0);setCountdown(3);setStatus("countdown");
  }
  function finish(){
    if(finishedRef.current)return;
    finishedRef.current=true;
    const currentCorrect=correctRef.current;
    const currentErrors=errorsRef.current;
    const currentLives=livesRef.current;
    const currentScore=scoreRef.current;
    const accuracy=(currentCorrect+currentErrors)?currentCorrect/(currentCorrect+currentErrors):0;
    const final=cascadeScore(currentScore,accuracy,currentLives);
    setFinishedScore(final);setStatus("finished");saveGameResult("cascade",final);
  }
  useEffect(()=>{
    if(status!=="playing")return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.key.length!==1)return;
      event.preventDefault();
      if(event.key.toLowerCase()===targetRef.current.toLowerCase()){
        const nextCombo=comboRef.current+1;const nextScore=scoreRef.current+100+Math.min(220,nextCombo*12);
        comboRef.current=nextCombo;correctRef.current+=1;scoreRef.current=nextScore;
        const nextTarget=chooseItem(CASCADE_KEYS);targetRef.current=nextTarget;
        setCorrect(correctRef.current);setRounds(value=>value+1);setCombo(nextCombo);setScore(nextScore);
        setDrop(0);setTarget(nextTarget);
      }else{
        errorsRef.current+=1;livesRef.current=Math.max(0,livesRef.current-1);comboRef.current=0;
        setErrors(errorsRef.current);setCombo(0);setLives(livesRef.current);setDrop(value=>Math.min(1,value+.12));
      }
    };
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[status,target,combo]);

  const accuracy=(correct+errors)?correct/(correct+errors):1;
  const time=Math.max(0,60-Math.floor(elapsed/1000));

  return <div className="game-screen">
    <GameTop label="Key Cascade" score={score} time={status==="finished"?"done":String(time)} onExit={onExit}/>
    {status==="ready"&&<GameLaunch title="Key Cascade" description="One key falls at a time. Catch it before it reaches the bottom. Misses cost lives, long combos increase the drop speed." button="Start cascade" onStart={begin}><div className="cascade-preview"><span>A</span><i></i><span>J</span><span>K</span></div></GameLaunch>}
    {status==="countdown"&&<div className="game-stage"><Countdown value={countdown}/></div>}
    {status==="playing"&&<div className="cascade-stage">
      <div className="game-metrics"><span><strong>{combo}</strong> combo</span><span><strong>{Math.round(accuracy*100)}%</strong> accuracy</span><span><strong>{"♥".repeat(lives)}</strong> lives</span></div>
      <div className="cascade-field">
        <div className="cascade-target" style={{top:(drop*78+6)+"%"}}><span>{target.toUpperCase()}</span></div>
        <div className="cascade-line"/>
        <div className="cascade-floor"/>
      </div>
      <div className="game-helper"><span>Press <strong>{target.toUpperCase()}</strong> before the key drops.</span><span>60 seconds · faster every combo</span></div>
    </div>}
    {status==="finished"&&<GameResult icon={<Gamepad2 size={18}/>} title="Cascade complete" score={finishedScore} stats={[{label:"Hits",value:String(correct)},{label:"Accuracy",value:Math.round(accuracy*100)+"%"},{label:"Lives",value:String(lives)}]} onRetry={begin} onExit={onExit}/>}
  </div>
}

function PrecisionRun({onExit}:{onExit:()=>void}){
  const[current,setCurrent]=useState(()=>chooseItem(GAME_WORDS));
  const[answer,setAnswer]=useState("");
  const[status,setStatus]=useState<"ready"|"countdown"|"playing"|"finished">("ready");
  const[countdown,setCountdown]=useState<number|null>(null);
  const[startAt,setStartAt]=useState(0);
  const[correctWords,setCorrectWords]=useState(0);
  const[totalWords,setTotalWords]=useState(0);
  const[misses,setMisses]=useState(0);
  const[streak,setStreak]=useState(0);
  const[score,setScore]=useState(0);
  const[finalScore,setFinalScore]=useState(0);
  const[timeLeft,setTimeLeft]=useState(60);
  const[wrong,setWrong]=useState(false);
  const finishedRef=useRef(false);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    if(status!=="countdown")return;
    if(countdown===null)return;
    if(countdown===0){const t=window.setTimeout(()=>{const start=Date.now();startAtRef.current=start;setStatus("playing");setStartAt(start);setCountdown(null);inputRef.current?.focus()},450);return()=>window.clearTimeout(t)}
    const t=window.setTimeout(()=>setCountdown(value=>value===null?null:value-1),850);return()=>window.clearTimeout(t);
  },[status,countdown]);

  useEffect(()=>{
    if(status!=="playing")return;
    const timer=window.setInterval(()=>{
      const remaining=Math.max(0,60-Math.floor((Date.now()-startAt)/1000));
      setTimeLeft(remaining);
      if(remaining<=0)finish();
    },100);
    return()=>window.clearInterval(timer);
  },[status,startAt]);

  function begin(){
    finishedRef.current=false;correctWordsRef.current=0;totalWordsRef.current=0;answerRef.current="";setCurrent(chooseItem(GAME_WORDS));setAnswer("");setCorrectWords(0);setTotalWords(0);setMisses(0);setStreak(0);setScore(0);setFinalScore(0);setTimeLeft(60);setWrong(false);setCountdown(3);setStatus("countdown");
  }
  function finish(){
    if(finishedRef.current)return;
    finishedRef.current=true;
    const wpm=(correctWordsRef.current)/(Math.max(1,(Date.now()-startAtRef.current)/60000));
    const final=precisionScore(correctWords,totalWords,wpm);
    setFinalScore(final);setStatus("finished");saveGameResult("precision",final);reportGameWpm(wpm);
  }
  function handleKey(event:ReactKeyboardEvent<HTMLInputElement>){
    if(status!=="playing")return;
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.key==="Backspace"){event.preventDefault();setAnswer(value=>value.slice(0,-1));return}
    if(event.key.length!==1&&event.key!==" ")return;
    event.preventDefault();
    const next=answer+event.key;
    if(event.key===" "){
      const typed=answer.trim().toLowerCase();
      if(!typed)return;
      const good=typed===current;
      totalWordsRef.current+=1;setTotalWords(totalWordsRef.current);
      if(good){
        const nextStreak=streak+1;correctWordsRef.current+=1;setCorrectWords(correctWordsRef.current);setStreak(nextStreak);setScore(value=>value+100+Math.min(300,nextStreak*18));setWrong(false);
      }else{
        setMisses(value=>value+1);setStreak(0);setWrong(true);
      }
      answerRef.current="";setAnswer("");setCurrent(chooseItem(GAME_WORDS.filter(word=>word!==current)));
      return;
    }
    setWrong(false);answerRef.current=next;setAnswer(next);
  }

  const liveWpm=Math.round(correctWords/Math.max(1,(Date.now()-startAt)/60000));

  return <div className="game-screen">
    <GameTop label="Precision Run" score={score} time={status==="finished"?"done":String(timeLeft)} onExit={onExit}/>
    {status==="ready"&&<GameLaunch title="Precision Run" description="Type one word at a time and finish it with Space. Clean runs build a multiplier; sloppy runs reset it." button="Start precision run" onStart={begin}><div className="precision-preview"><span>accuracy</span><strong>×{streak||1}</strong><span>multiplier</span></div></GameLaunch>}
    {status==="countdown"&&<div className="game-stage"><Countdown value={countdown}/></div>}
    {status==="playing"&&<div className="precision-stage">
      <div className="game-metrics"><span><strong>{liveWpm}</strong> WPM</span><span><strong>{streak}</strong> streak</span><span><strong>{misses}</strong> misses</span><span><strong>{totalWords?Math.round(correctWords/totalWords*100):100}%</strong> accuracy</span></div>
      <div className={"precision-word "+(wrong?"wrong":"")}>{current}</div>
      <div className="precision-input-shell"><input ref={inputRef} value={answer} onChange={()=>{}} onKeyDown={handleKey} aria-label="Precision Run input" autoFocus/><span>press Space to submit the word</span></div>
      <div className="game-helper"><span>Do not chase speed. Protect the streak.</span><span>60 seconds</span></div>
    </div>}
    {status==="finished"&&<GameResult icon={<Trophy size={18}/>} title="Precision complete" score={finalScore} stats={[{label:"WPM",value:String(liveWpm)},{label:"Words",value:String(correctWords)},{label:"Accuracy",value:(totalWords?Math.round(correctWords/totalWords*100):100)+"%"}]} onRetry={begin} onExit={onExit}/>}
  </div>
}

function GameLaunch({title,description,button,onStart,children}:{title:string;description:string;button:string;onStart:()=>void;children:ReactNode}){
  return <div className="game-launch"><div className="game-launch-copy"><div className="game-launch-orb"><Play size={19}/></div><div><div className="modal-step">Ready</div><h3>{title}</h3><p>{description}</p></div></div><div className="game-launch-preview">{children}</div><button className="solid-action game-start" onClick={onStart}>{button}<ChevronRight size={16}/></button></div>
}

function GameResult({icon,title,score,stats,onRetry,onExit}:{icon:ReactNode;title:string;score:number;stats:{label:string;value:string}[];onRetry:()=>void;onExit:()=>void}){
  return <div className="game-result"><div className="game-result-icon">{icon}</div><div className="modal-step">Run complete</div><h3>{title}</h3><div className="game-score">{score}<span>/100</span></div><div className="game-result-stats">{stats.map(stat=><div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div><div className="game-result-actions"><button className="outline-action" onClick={onExit}>Games</button><button className="solid-action" onClick={onRetry}><RotateCcw size={15}/>Play again</button></div></div>
}

type DuelMessage=
  |{type:"hello";name:string;role:"host"|"guest";code:string}
  |{type:"start";target:string;startsAt:number}
  |{type:"progress";chars:number;wpm:number;accuracy:number}
  |{type:"result";name:string;wpm:number;accuracy:number;elapsedMs:number;completed:boolean}
  |{type:"leave"};

interface DuelResult{name:string;wpm:number;accuracy:number;elapsedMs:number;completed:boolean}

function Duelity({accountUsername,onExit}:{accountUsername:string|null;onExit:()=>void}){
  const[screen,setScreen]=useState<"menu"|"hosting"|"joining"|"race"|"result">("menu");
  const[guestUsername,setGuestUsername]=useState(loadGuestUsername());
  const[joinCode,setJoinCode]=useState(new URLSearchParams(window.location.search).get("duel")?.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6)??"");
  const[roomCode,setRoomCode]=useState("");
  const[status,setStatus]=useState("");
  const[opponent,setOpponent]=useState("");
  const[target,setTarget]=useState("");
  const[startsAt,setStartsAt]=useState(0);
  const[opponentProgress,setOpponentProgress]=useState({chars:0,wpm:0,accuracy:0});
  const[localResult,setLocalResult]=useState<DuelResult|null>(null);
  const[opponentResult,setOpponentResult]=useState<DuelResult|null>(null);
  const[peerReady,setPeerReady]=useState(false);
  const peerRef=useRef<Peer|null>(null);
  const connRef=useRef<DataConnection|null>(null);
  const roleRef=useRef<"host"|"guest"|null>(null);

  const identity=accountUsername?.trim()||guestUsername.trim();
  const usingGuest=!accountUsername;

  useEffect(()=>()=>cleanup(),[]);

  useEffect(()=>{
    if(localResult&&opponentResult)setScreen("result");
  },[localResult,opponentResult]);

  function cleanup(){
    connRef.current?.close();
    connRef.current=null;
    peerRef.current?.destroy();
    peerRef.current=null;
    setPeerReady(false);
  }

  function peerOptions(){
    const host=import.meta.env.VITE_PEER_HOST as string|undefined;
    if(!host)return{secure:true,debug:1};
    const port=Number(import.meta.env.VITE_PEER_PORT||443);
    const path=String(import.meta.env.VITE_PEER_PATH||"/");
    return{host,port,path,secure:true,debug:1};
  }

  function ensureGuestName(){
    const clean=sanitizeUsername(guestUsername);
    if(!isValidUsername(clean))return false;
    setGuestUsername(clean);saveGuestUsername(clean);return true;
  }

  function setupConnection(connection:DataConnection,role:"host"|"guest",code:string){
    connRef.current=connection;
    connection.on("open",()=>{
      setPeerReady(true);
      setStatus("Connected. Waiting for both players.");
      connection.send({type:"hello",name:identity,role,code} satisfies DuelMessage);
    });
    connection.on("data",(raw)=>{
      const message=raw as DuelMessage;
      if(message.type==="hello"){
        if(message.name!==identity)setOpponent(message.name);
        if(role==="host")connection.send({type:"hello",name:identity,role:"host",code} satisfies DuelMessage);
      }else if(message.type==="start"){
        setTarget(message.target);setStartsAt(message.startsAt);setLocalResult(null);setOpponentResult(null);setOpponentProgress({chars:0,wpm:0,accuracy:0});setScreen("race");
      }else if(message.type==="progress"){
        setOpponentProgress(message);
      }else if(message.type==="result"){
        setOpponentResult(message);
      }else if(message.type==="leave"){
        setStatus("Opponent left the duel.");setOpponent("");setScreen("menu");cleanup();
      }
    });
    connection.on("close",()=>{setStatus("Connection closed.");setPeerReady(false)});
    connection.on("error",error=>setStatus(error instanceof Error?error.message:"Connection error."));
  }

  function host(){
    if(usingGuest&&!ensureGuestName()){setStatus("Choose a guest username with 2–20 letters, numbers, spaces, dots, dashes, or underscores.");return}
    cleanup();
    const code=Array.from(crypto.getRandomValues(new Uint8Array(6))).map(value=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[value%32]).join("");
    setRoomCode(code);roleRef.current="host";setStatus("Opening your room…");setScreen("hosting");
    const peer=new Peer(PEER_PREFIX+code.toLowerCase(),peerOptions());
    peerRef.current=peer;
    peer.on("open",()=>setStatus("Room ready. Share the code with your opponent."));
    peer.on("connection",connection=>setupConnection(connection,"host",code));
    peer.on("error",error=>setStatus(error.type==="unavailable-id"?"That room code is already active. Start another duel.":error.message));
  }

  function join(){
    if(!joinCode.trim()){setStatus("Enter a room code.");return}
    if(usingGuest&&!ensureGuestName()){setStatus("Choose a guest username with 2–20 letters, numbers, spaces, dots, dashes, or underscores.");return}
    const code=joinCode.trim().toUpperCase();cleanup();roleRef.current="guest";setRoomCode(code);setScreen("joining");setStatus("Connecting to room…");
    const peer=new Peer(undefined,peerOptions());
    peerRef.current=peer;
    peer.on("open",()=>{const connection=peer.connect(PEER_PREFIX+code.toLowerCase(),{reliable:true,serialization:"json"});setupConnection(connection,"guest",code)});
    peer.on("error",error=>setStatus(error.message));
  }

  function startRound(){
    if(roleRef.current!=="host"||!connRef.current?.open)return;
    const starts=Date.now()+3200;
    const nextTarget=duelPassageForCode(roomCode);
    setTarget(nextTarget);setStartsAt(starts);setLocalResult(null);setOpponentResult(null);setOpponentProgress({chars:0,wpm:0,accuracy:0});setScreen("race");
    connRef.current.send({type:"start",target:nextTarget,startsAt:starts} satisfies DuelMessage);
  }

  function sendProgress(payload:{chars:number;wpm:number;accuracy:number}){
    if(connRef.current?.open)connRef.current.send({type:"progress",...payload} satisfies DuelMessage);
  }

  function sendResult(result:DuelResult){
    setLocalResult(result);
    if(connRef.current?.open)connRef.current.send({type:"result",...result} satisfies DuelMessage);
  }

  async function shareRoom(){
    const url=window.location.origin+"?duel="+roomCode;
    const text="Join my Typhelper Duelity room "+roomCode+".";
    try{
      if(navigator.share){await navigator.share({title:"Typhelper Duelity",text,url});return}
      await navigator.clipboard.writeText(url);
      setStatus("Room link copied.");
    }catch{}
  }

  function backToMenu(){
    if(connRef.current?.open)connRef.current.send({type:"leave"} satisfies DuelMessage);
    cleanup();setScreen("menu");setOpponent("");setStatus("");setLocalResult(null);setOpponentResult(null);
  }

  const resultWinner=useMemo(()=>{
    if(!localResult||!opponentResult)return"Waiting for results";
    if(localResult.completed!==opponentResult.completed)return localResult.completed?"You finished first":"Opponent finished first";
    if(localResult.elapsedMs===opponentResult.elapsedMs)return"Tied race";
    return localResult.elapsedMs<opponentResult.elapsedMs?"You finished first":"Opponent finished first";
  },[localResult,opponentResult]);

  return <div className="game-screen duel-screen">
    <GameTop label="Duelity" score={screen==="result"?"done":"1v1"} time={screen==="menu"?"∞":screen==="result"?"done":"live"} onExit={onExit}/>
    {screen==="menu"&&<div className="duel-menu">
      <div className="duel-hero"><div className="game-launch-orb"><Swords size={20}/></div><div><div className="modal-step">Live typing duel</div><h3>One room. One passage. One result.</h3><p>Use your Clerk username when signed in. Guests choose a name once and keep it on this device until they sign in.</p></div></div>
      {usingGuest&&<label className="duel-field"><span>Guest username</span><input value={guestUsername} maxLength={20} onChange={event=>setGuestUsername(sanitizeUsername(event.target.value))} placeholder="e.g. typist_01"/><small>Saved to this device when you start a room.</small></label>}
      {!usingGuest&&<div className="duel-account-pill"><Users size={15}/><span>Playing as <strong>{identity}</strong> from Clerk</span></div>}
      <div className="duel-actions">
        <button className="solid-action" onClick={host}>Create room <ChevronRight size={16}/></button>
        <div className="duel-divider"><span>or</span></div>
        <div className="duel-join"><input value={joinCode} maxLength={6} onChange={event=>setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} placeholder="ROOM CODE"/><button className="outline-action" onClick={join}>Join</button></div>
      </div>
      {status&&<div className="duel-status"><Hash size={14}/>{status}</div>}
      <div className="duel-note"><Zap size={14}/><span>After the handshake, the typing progress is carried directly between browsers through the WebRTC data connection.</span></div>
    </div>}
    {(screen==="hosting"||screen==="joining")&&<div className="duel-lobby">
      <div className="duel-room-card"><span>{screen==="hosting"?"Your room":"Joining room"}</span><strong>{roomCode}</strong><button className="outline-action" onClick={shareRoom}><Share2 size={15}/>Share</button></div>
      <div className="duel-lobby-players"><div><span>You</span><strong>{identity}</strong><small>ready</small></div><div className="duel-versus">VS</div><div><span>Opponent</span><strong>{opponent||"Waiting…"}</strong><small>{peerReady?"connected":"not connected"}</small></div></div>
      <div className="duel-lobby-actions">{screen==="hosting"&&<button className="solid-action" disabled={!peerReady} onClick={startRound}>{peerReady?"Start duel":"Waiting for opponent…"} <ChevronRight size={16}/></button>}<button className="quiet-action" onClick={backToMenu}>Leave room</button></div>
      {status&&<div className="duel-status"><Hash size={14}/>{status}</div>}
    </div>}
    {screen==="race"&&<DuelRace target={target} startsAt={startsAt} localName={identity} opponentName={opponent||"Opponent"} opponentProgress={opponentProgress} sendProgress={sendProgress} onResult={sendResult}/>}
    {screen==="result"&&localResult&&opponentResult&&<div className="duel-result">
      <div className="game-result-icon"><Swords size={18}/></div><div className="modal-step">Duel complete</div><h3>{resultWinner}</h3>
      <div className="duel-scoreboard"><div className="duel-player-card"><span>{localResult.name}</span><strong>{localResult.wpm.toFixed(0)} WPM</strong><small>{Math.round(localResult.accuracy*100)}% accuracy</small></div><div className="duel-vs-badge">VS</div><div className="duel-player-card"><span>{opponentResult.name}</span><strong>{opponentResult.wpm.toFixed(0)} WPM</strong><small>{Math.round(opponentResult.accuracy*100)}% accuracy</small></div></div>
      <div className="game-result-actions"><button className="outline-action" onClick={backToMenu}>New duel</button><button className="solid-action" onClick={shareRoom}><Share2 size={15}/>Share room</button></div>
    </div>}
  </div>
}

function DuelRace({target,startsAt,localName,opponentName,opponentProgress,sendProgress,onResult}:{target:string;startsAt:number;localName:string;opponentName:string;opponentProgress:{chars:number;wpm:number;accuracy:number};sendProgress:(payload:{chars:number;wpm:number;accuracy:number})=>void;onResult:(result:DuelResult)=>void}){
  const[answer,setAnswer]=useState("");
  const[now,setNow]=useState(Date.now());
  const[finished,setFinished]=useState(false);
  const[inputErrors,setInputErrors]=useState(0);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const resultSent=useRef(false);
  const resultHandler=useRef(onResult);
  useEffect(()=>{resultHandler.current=onResult},[onResult]);

  useEffect(()=>{inputRef.current?.focus()},[]);
  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),80);
    return()=>window.clearInterval(timer);
  },[]);

  const elapsed=Math.max(0,Math.min(DUEL_LIMIT_MS,now-startsAt));
  const active=now>=startsAt;
  const remaining=Math.max(0,startsAt-now);
  const correct=answer.split("").reduce((sum,char,index)=>sum+(char===target[index]?1:0),0);
  const accuracy=answer.length?correct/answer.length:1;
  const wpm=active?(correct/5)/Math.max(1/60,elapsed/60000):0;
  const progress=Math.round(answer.length/Math.max(1,target.length)*100);

  useEffect(()=>{
    if(finished)return;
    if(elapsed>=DUEL_LIMIT_MS){
      setFinished(true);
      if(!resultSent.current){resultSent.current=true;reportGameWpm(wpm);resultHandler.current({name:localName,wpm,accuracy,elapsedMs:DUEL_LIMIT_MS,completed:false})}
    }
  },[elapsed,finished,localName,wpm,accuracy]);

  function handleKey(event:ReactKeyboardEvent<HTMLTextAreaElement>){
    if(!active||finished)return;
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    event.preventDefault();
    if(event.key==="Backspace"){setAnswer(value=>value.slice(0,-1));return}
    if(event.key.length!==1)return;
    setAnswer(prev=>{
      if(prev.length>=target.length)return prev;
      const next=prev+event.key;
      const nextCorrect=next.split("").reduce((sum,char,index)=>sum+(char===target[index]?1:0),0);
      const nextAccuracy=next.length?nextCorrect/next.length:1;
      const nextWpm=nextCorrect? (nextCorrect/5)/Math.max(1/60,(Date.now()-startsAt)/60000):0;
      sendProgress({chars:next.length,wpm:nextWpm,accuracy:nextAccuracy});
      if(event.key!==target[prev.length])setInputErrors(value=>value+1);
      if(next.length===target.length&&!resultSent.current){
        resultSent.current=true;setFinished(true);
        resultHandler.current({name:localName,wpm:nextWpm,accuracy:nextAccuracy,elapsedMs:Math.max(1,Date.now()-startsAt),completed:true});
      }
      return next;
    });
  }

  return <div className="duel-race">
    <div className="game-metrics"><span><strong>{Math.max(0,Math.ceil(remaining/1000))}</strong> to start</span><span><strong>{wpm.toFixed(0)}</strong> WPM</span><span><strong>{Math.round(accuracy*100)}%</strong> accuracy</span><span><strong>{Math.round(opponentProgress.chars/Math.max(1,target.length)*100)}%</strong> opponent</span></div>
    <div className="duel-progress"><div><span>{localName}</span><i style={{width:progress+"%"}}/></div><div><span>{opponentName}</span><i style={{width:Math.round(opponentProgress.chars/Math.max(1,target.length)*100)+"%"}}/></div></div>
    {!active&&!finished&&<Countdown value={Math.ceil(remaining/1000)}/>}
    <div className="duel-target-text">{[...target].map((char,index)=><span key={index} className={index<answer.length?(answer[index]===char?"good":"bad"):index===answer.length&&active?"active":""}>{char}</span>)}</div>
    <textarea ref={inputRef} className="game-capture duel-capture" value={answer} onChange={()=>{}} onKeyDown={handleKey} aria-label="Duelity input" disabled={!active||finished} autoFocus/>
    <div className="game-helper"><span>{finished?"Result sent. Waiting for your opponent.":!active?"Get ready…":"Finish the passage as cleanly as you can."}</span><span>{inputErrors} misses</span></div>
  </div>
}
