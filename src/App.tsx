import{SignInButton,SignUpButton,UserButton,useUser}from"@clerk/react";
import{Activity,BookOpenText,Camera,Check,ChevronRight,CircleHelp,Gamepad2,Gauge,Keyboard,Laptop,Lightbulb,Settings2,UserPlus,X}from"lucide-react";
import{useCallback,useEffect,useRef,useState,type ReactNode}from"react";
import{load,loadGeneratedWords,mergeProgress,normalizeCloudProgress,rememberGeneratedWord,save,saveGeneratedWords}from"./lib/storage";
import{learn,randomWord}from"./lib/typing";
import{GazeMonitor}from"./lib/gaze";
import{scoreWebNN}from"./lib/webnn";
import{createQuiz,nextChallengeWord,scoreQuiz,scoreSentenceChallenge,type ChallengeWord,type QuizScore,type SentenceChallengeScore}from"./lib/quiz";
import{PersonalModel}from"./lib/personal-model";
import{VisionBridge}from"./lib/vision-bridge";
import{ARROW_GRID,FUNCTION_CLUSTERS,MAC_BOTTOM_ROW,MAC_ROWS,NAVIGATION_GRID,NUMPAD_GRID,WINDOWS_BOTTOM_ROW,WINDOWS_COPILOT_BOTTOM_ROW,WINDOWS_NUMBER_ROW,WINDOWS_ROWS,nextKey,normalizeKey,type KeyDef}from"./lib/keyboard";
import{fingerClass}from"./lib/finger-map";
import{animateDefinition,animateKeyGuide,animateKeyPress,animateModal,animatePanel,animateSession,animateWord,animateWordExit}from"./lib/animations";
import{analyzePractice,analyzeQuiz}from"./lib/ai-coach";
import{connectPhysicalKeyboard,hasWebHID,observeKeyboardKey,readKeyboardProfile,type KeyboardProfile}from"./lib/keyboard-profile";
import{readPerformanceMode,savePerformanceMode,performanceModeLabel,type PerformanceMode}from"./lib/performance";
import{fetchPracticeBatch,fetchSimpleDefinition,fetchWordDetails,type PracticeWord,type WordDetails}from"./lib/word-api";
import MilestoneToast from"./components/MilestoneToast";
import GameHub from"./components/GameHub";
import{crossedMilestones,milestoneProgress}from"./lib/milestones";
import{loadGuestUsername}from"./lib/social";
import{loadGameStats,type GameStats}from"./lib/games";
import Counter from "./components/Counter";
import CountUp from "./components/CountUp";
import type{GazeState,Progress,QuizResult}from"./types";

type KeyboardStyle="windows"|"mac";
type WindowsLayout="legacy"|"copilot";
const CHECKIN_INTERVAL_SECONDS=30*60;

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
  const[liveWpm,setLiveWpm]=useState(0);
  const[animateWordsOnEntry,setAnimateWordsOnEntry]=useState(()=>p.totalPracticeWords>0);
  const[quiz,setQuiz]=useState(false);
  const[generatedWordCount,setGeneratedWordCount]=useState(()=>loadGeneratedWords().length);
  const[help,setHelp]=useState(false);
  const[gamesOpen,setGamesOpen]=useState(false);
  const[accountUsername,setAccountUsername]=useState<string|null>(null);
  const[milestoneQueue,setMilestoneQueue]=useState<ReturnType<typeof crossedMilestones>>([]);
  const[settings,setSettings]=useState(false);
  const[keyboardStyle,setKeyboardStyle]=useState<KeyboardStyle>(()=>localStorage.getItem("typing-pro-keyboard-style")==="mac"?"mac":"windows");
  const[windowsLayout,setWindowsLayout]=useState<WindowsLayout>(()=>localStorage.getItem("typhelper-windows-layout")==="copilot"?"copilot":"legacy");
  const[fingerColors,setFingerColors]=useState(()=>localStorage.getItem("typing-pro-finger-colors")!=="false");
  const[visionEnabled,setVisionEnabled]=useState(()=>localStorage.getItem("typing-pro-vision-enabled")==="true");
  const[performanceMode,setPerformanceMode]=useState<PerformanceMode>(()=>readPerformanceMode());
  const[physicalKeyboard,setPhysicalKeyboard]=useState<KeyboardProfile|null>(()=>readKeyboardProfile());
  const[keyboardError,setKeyboardError]=useState<string|null>(null);
  const learner=useRef<PersonalModel|null>(null);
  const vision=useRef(new VisionBridge());
  const skills=useRef(p.skillMap);
  const active=useRef(p.activeSeconds);
  const lastActivity=useRef(Date.now());
  const lastKey=useRef(performance.now());
  const wordStarted=useRef(performance.now());
  const entryWordCount=useRef(p.totalPracticeWords);
  const liveTypedChars=useRef(0);
  const liveActiveMs=useRef(0);
  const liveLastKeyAt=useRef<number|null>(null);
  const liveWpmLastTick=useRef<number|null>(null);
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
  const recentPractice=useRef<Array<{word:string;correct:boolean;duration:number}>>([]);
  const practiceAiBusy=useRef(false);
  const workspaceRef=useRef<HTMLElement>(null);
  const checkinTriggered=useRef(false);
  const progressRef=useRef(p);
  const lastMilestoneSnapshot=useRef({words:p.totalPracticeWords,wpm:p.bestWpm});
  useEffect(()=>{progressRef.current=p},[p]);
  useEffect(()=>{
    const previous=lastMilestoneSnapshot.current;
    if(previous.words!==p.totalPracticeWords||previous.wpm!==p.bestWpm){
      const crossed=crossedMilestones(previous.words,p.totalPracticeWords,previous.wpm,p.bestWpm);
      if(crossed.length)setMilestoneQueue(current=>[...current,...crossed]);
      lastMilestoneSnapshot.current={words:p.totalPracticeWords,wpm:p.bestWpm};
    }
  },[p.totalPracticeWords,p.bestWpm]);

  useEffect(()=>{skills.current=p.skillMap},[p.skillMap]);

  useEffect(()=>{savePerformanceMode(performanceMode)},[performanceMode]);
  useEffect(()=>save(p),[p]);

  const finishEntryCountUp=useCallback(()=>setAnimateWordsOnEntry(false),[]);

  useEffect(()=>{
    const timer=window.setInterval(()=>{
      const now=Date.now();
      const lastKeyTime=liveLastKeyAt.current;
      const previousTick=liveWpmLastTick.current;
      if(previousTick!==null&&lastKeyTime!==null&&now-lastKeyTime<3000){
        liveActiveMs.current+=now-previousTick;
      }
      liveWpmLastTick.current=now;
      const minutes=liveActiveMs.current/60000;
      const value=liveTypedChars.current>0&&minutes>0?Math.min(240,Math.round((liveTypedChars.current/5)/minutes)):0;
      setLiveWpm(value);
    },250);
    return()=>window.clearInterval(timer);
  },[]);

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
    const onGeneratedWord=()=>setGeneratedWordCount(loadGeneratedWords().length);
    window.addEventListener("typhelper-generated-word",onGeneratedWord);
    return()=>window.removeEventListener("typhelper-generated-word",onGeneratedWord);
  },[]);

  useEffect(()=>{
    if(!quiz&&p.activeSeconds<CHECKIN_INTERVAL_SECONDS)checkinTriggered.current=false;
  },[quiz,p.activeSeconds]);

  useEffect(()=>{
    if(!quiz&&p.activeSeconds>=CHECKIN_INTERVAL_SECONDS&&!checkinTriggered.current){
      checkinTriggered.current=true;
      setQuiz(true);
    }
  },[p.activeSeconds,quiz]);

  useEffect(()=>{localStorage.setItem("typing-pro-keyboard-style",keyboardStyle)},[keyboardStyle]);
  useEffect(()=>{localStorage.setItem("typhelper-windows-layout",windowsLayout)},[windowsLayout]);
  useEffect(()=>{
    localStorage.setItem("typing-pro-finger-colors",String(fingerColors));
  },[fingerColors]);

  useEffect(()=>{
    const bridge=vision.current;
    bridge.start(signal=>{
      if(!visionEnabled)return;
      learner.current?.record({kind:"vision",gaze:signal.gaze,hand:signal.hand??null});
    });
    const activity=()=>{lastActivity.current=Date.now()};
    const timer=window.setInterval(()=>{
      if(document.visibilityState!=="visible"||quiz)return;
      if(Date.now()-lastActivity.current<12000&&active.current<CHECKIN_INTERVAL_SECONDS){
        const next=Math.min(CHECKIN_INTERVAL_SECONDS,active.current+1);
        active.current=next;
        setP(current=>({...current,activeSeconds:next}));
        if(next>=CHECKIN_INTERVAL_SECONDS&&!checkinTriggered.current){
          checkinTriggered.current=true;
          setQuiz(true);
        }
      }
    },1000);
    window.addEventListener("keydown",activity);
    window.addEventListener("pointerdown",activity);
    return()=>{window.clearInterval(timer);window.removeEventListener("keydown",activity);window.removeEventListener("pointerdown",activity);bridge.stop()};
  },[quiz,visionEnabled]);

  async function runPracticeCoach(){
    if(practiceAiBusy.current||recentPractice.current.length<10)return;
    practiceAiBusy.current=true;
    try{
      const result=await analyzePractice(skills.current,recentPractice.current,performanceMode);
      if(result?.recommendedWords.length){
        const existing=new Set(wordQueue.current.map(item=>item.word));
        const additions=result.recommendedWords.filter(item=>item!==word&&!existing.has(item)&&!shownWords.current.has(item));
        if(additions.length)wordQueue.current.unshift(...additions.map(item=>({word:item,definition:null,isNew:true})));
      }
    }finally{practiceAiBusy.current=false}
  }
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(quiz||account||help||settings||detailsOpen||gamesOpen)return;
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
      const wpmNow=Date.now();
      liveTypedChars.current+=1;
      if(liveLastKeyAt.current===null)liveWpmLastTick.current=wpmNow;
      liveLastKeyAt.current=wpmNow;
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
        const correct=!hadError.current;
        const duration=now-wordStarted.current;
        learner.current?.record({kind:"word",word,correct,duration});
        recentPractice.current=[...recentPractice.current,{word,correct,duration}].slice(-30);
        const wordMinutes=Math.max(.4,duration/60000);
        const wordWpm=Math.round(Math.min(240,(word.length/5)/wordMinutes));
        const nextTotal=progressRef.current.totalPracticeWords+1;
        setP(current=>({...current,totalPracticeWords:current.totalPracticeWords+1,bestWpm:Math.max(current.bestWpm,wordWpm)}));
        if(nextTotal%10===0)void runPracticeCoach();
        hadError.current=false;
        const next=wordQueue.current.shift()??{word:randomWord(skills.current,word),definition:null,isNew:false};
        rememberGeneratedWord(next.word);
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
  },[word,index,quiz,account,help,settings,detailsOpen,gamesOpen]);

  const target=nextKey(word,index);
  const percent=word ? Math.min(100,Math.round((index/word.length)*100)) : 0;
  const rows=keyboardStyle==="windows"?WINDOWS_ROWS:MAC_ROWS;
  const bottom=keyboardStyle==="windows"?(windowsLayout==="copilot"?WINDOWS_COPILOT_BOTTOM_ROW:WINDOWS_BOTTOM_ROW):MAC_BOTTOM_ROW;

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
    checkinTriggered.current=false;
    setP(current=>({...current,activeSeconds:0,bestScore:Math.max(current.bestScore,result.score),bestWpm:Math.max(current.bestWpm,result.stats.wpm),skillMap:learn(current.skillMap,targetText,answer),history:[result,...current.history].slice(0,30)}));
  }

  function renderKeys(row:KeyDef[],rowName:string){
    return <div className="key-row" key={rowName}>{row.map(key=>{
      const finger=fingerColors?fingerClass(key.k):"";
      return <div key={key.k} data-key={key.k} className={"key "+(key.kind==="modifier"?"modifier-key ":"")+finger+(key.k===target?" target":"")} style={{flex:key.w??1,gridColumn:key.gridColumn,gridRow:key.gridRow}}>
        <span className="key-glyph">{key.glyph??""}</span><span className="key-label">{key.label??key.k.toUpperCase()}</span>
      </div>
    })}</div>
  }

  useEffect(()=>{
    const onGameWpm=(event:Event)=>{
      const detail=(event as CustomEvent<{wpm?:unknown}>).detail;
      const wpm=typeof detail?.wpm==="number"&&Number.isFinite(detail.wpm)?detail.wpm:0;
      if(wpm<=0)return;
      setP(current=>current.bestWpm>=wpm?current:{...current,bestWpm:Math.min(300,Math.round(wpm))});
    };
    window.addEventListener("typhelper-game-wpm",onGameWpm);
    return()=>window.removeEventListener("typhelper-game-wpm",onGameWpm);
  },[]);

  return <div className="app">
    <header className="topbar">
      <div className="left-controls">
        {clerk?<AccountControl open={()=>setAccount(true)}/>:<button className="outline-action" onClick={()=>setAccount(true)}><UserPlus size={16}/><span>Sign up</span></button>}
      </div>
      <div className="wordmark"><Keyboard size={18}/><span>Typhelper</span></div>
      <div className="right-controls">
        <button className="icon-action" aria-label="Help" onClick={()=>setHelp(true)}><CircleHelp size={17}/></button>
        <button className="icon-action" aria-label="Settings" onClick={()=>setSettings(true)}><Settings2 size={17}/></button>

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
          <div className={"keyboard keyboard-"+keyboardStyle} ref={keyboardRef} aria-label={keyboardStyle==="windows"?"Full-size Windows keyboard visualization":"Full-size Mac keyboard visualization"}>
            <div className="function-clusters">
              {FUNCTION_CLUSTERS.map((cluster,index)=><div className={"function-cluster function-cluster-"+index} key={"cluster-"+index}>{cluster.map(key=>
                <div key={key.k} data-key={key.k} className="key function-key" style={{flex:key.w??1}}>
                  <span className="key-glyph">{key.glyph??""}</span><span className="key-label">{key.label}</span>
                </div>
              )}</div>)}
            </div>
            <div className="keyboard-body-grid">
              <div className="main-keyboard">
                {renderKeys(WINDOWS_NUMBER_ROW,"number-row")}
                {rows.map((row,i)=>renderKeys(row,"main-row-"+i))}
                <div className="key-row bottom-row">{bottom.map(key=><div key={key.k} data-key={key.k} className={"key "+(key.kind==="modifier"?"modifier-key ":"")+(fingerColors?fingerClass(key.k):"")+(key.k===target?" target":"")} style={{flex:key.w??1}}>
                  <span className="key-glyph">{key.glyph??""}</span><span className="key-label">{key.label??key.k.toUpperCase()}</span>
                </div>)}</div>
              </div>
              <div className="navigation-keyboard">
                <div className="nav-grid">{NAVIGATION_GRID.map(key=><div key={key.k} data-key={key.k} className="key nav-key"><span className="key-glyph">{key.glyph??""}</span><span className="key-label">{key.label}</span></div>)}</div>
                <div className="arrow-grid">{ARROW_GRID.map(key=><div key={key.k} data-key={key.k} className="key arrow-key"><span className="key-glyph">{key.glyph}</span></div>)}</div>
              </div>
              <div className="numpad-keyboard">
                {NUMPAD_GRID.map(key=><div key={key.k} data-key={key.k} className={"key num-key "+(key.rowSpan?"row-span":"")} style={{gridColumn:key.k==="numpad-0"?"span 2":key.gridColumn,gridRow:key.rowSpan?"span "+key.rowSpan:key.gridRow}}>
                  <span className="key-glyph">{key.glyph??""}</span><span className="key-label">{key.label}</span>
                </div>)}
              </div>
            </div>
          </div>
          <div className="keyboard-note"><Activity size={13}/><span>{physicalKeyboard?.exactDevice?physicalKeyboard.name:(keyboardStyle==="windows"?"Windows keyboard":"Mac keyboard")} · the trainer learns from every correct and incorrect press</span></div>
        </div>
      </section>

      <aside className="practice-side">
        <div className="mini-card">
          <div className="mini-label">Words</div>
          <div className="big-stat stat-counter">{animateWordsOnEntry?<CountUp to={entryWordCount.current} from={0} duration={1.4} separator="," className="count-up-text" onEnd={finishEntryCountUp}/>:<Counter value={p.totalPracticeWords} places={counterPlaces(p.totalPracticeWords)} fontSize={43} padding={0} gap={1} horizontalPadding={0} textColor="#202124" fontWeight={760} gradientHeight={0}/>}</div>
          <div className="muted">completed across your practice</div>
          <MilestoneBar type="words" value={p.totalPracticeWords}/>
        </div>
        <div className="mini-card">
          <div className="mini-label">Live WPM</div>
          <div className="big-stat stat-counter"><Counter value={liveWpm} places={counterPlaces(liveWpm)} fontSize={43} padding={0} gap={1} horizontalPadding={0} textColor="#202124" fontWeight={760} gradientHeight={0}/></div>
          <div className="muted">best WPM {p.bestWpm}</div>
          <MilestoneBar type="wpm" value={p.bestWpm}/>
        </div>
        <div className="mini-card">
          <div className="mini-label">Check-in</div>
          <div className="check-row"><span>{p.activeSeconds>=CHECKIN_INTERVAL_SECONDS?"Check-in time":"Next check-in"}</span><strong>{formatTime(Math.max(0,CHECKIN_INTERVAL_SECONDS-p.activeSeconds))}</strong></div>
          <button className="solid-action" onClick={()=>setQuiz(true)}><span>{p.activeSeconds>=CHECKIN_INTERVAL_SECONDS?"Start check-in":"Take check-in early"}</span><ChevronRight size={16}/></button>
        </div>
        <div className="mini-card games-card">
          <div className="mini-label">Games</div>
          <div className="games-card-head"><div className="games-card-icon"><Gamepad2 size={17}/></div><div><strong>Train without the drill</strong><span>Speed, accuracy, reaction, or a 1v1 Duelity race.</span></div></div>
          <button className="solid-action" onClick={()=>setGamesOpen(true)}>Open games <ChevronRight size={16}/></button>
        </div>
      </aside>/main>

    {account&&<AccountWarning clerk={clerk} close={()=>setAccount(false)}/>}
    {milestoneQueue[0]&&<MilestoneToast milestone={milestoneQueue[0]} username={accountUsername||loadGuestUsername()||null} onDismiss={()=>setMilestoneQueue(queue=>queue.slice(1))}/>}
    <GameHub open={gamesOpen} close={()=>setGamesOpen(false)} accountUsername={accountUsername}/>
    {help&&<SimpleModal title="How it works" icon={<CircleHelp size={20}/>} close={()=>setHelp(false)}><p>Type the highlighted letters without looking down. When you pause for a moment, the trainer shows the exact key to press next.</p><p>Each completed word is replaced with another randomized word so practice keeps moving.</p></SimpleModal>}
    {settings&&<SettingsModal
      close={()=>setSettings(false)}
      keyboardStyle={keyboardStyle}
      setKeyboardStyle={setKeyboardStyle}
      windowsLayout={windowsLayout}
      setWindowsLayout={setWindowsLayout}
      physicalKeyboard={physicalKeyboard}
      setPhysicalKeyboard={setPhysicalKeyboard}
      hasWebHID={hasWebHID()}
      connectPhysicalKeyboard={connectPhysicalKeyboard}
      keyboardError={keyboardError}
      setKeyboardError={setKeyboardError}
      performanceMode={performanceMode}
      setPerformanceMode={setPerformanceMode}
      visionEnabled={visionEnabled}
      setVisionEnabled={setVisionEnabled}
      fingerColors={fingerColors}
      setFingerColors={setFingerColors}
    />}
    {detailsOpen&&<WordDetailsModal word={word} details={wordDetails} loading={detailsLoading} error={detailsError} close={closeWordDetails}/>}
    {clerk&&<AccountCloudSync progress={p} onHydrate={setP} onCountChange={setGeneratedWordCount} onIdentityChange={setAccountUsername}/>}
    {quiz&&<QuizModal skillMap={p.skillMap} performanceMode={performanceMode} onClose={()=>setQuiz(false)} onRecord={event=>learner.current?.record(event)} onFinish={(result,targetText,answer)=>finishQuiz(result,targetText,answer)}/>}
  </div>
}

export function ComputerRequiredScreen(){
  return <main className="computer-only-screen">
    <div className="computer-only-card">
      <div className="computer-only-icon"><Laptop size={28}/></div>
      <div className="modal-step">Computer required</div>
      <h1>Open Typhelper on a computer</h1>
      <p>Typhelper is built for a physical computer keyboard and currently supports desktop and laptop computers only.</p>
      <div className="computer-only-note"><Keyboard size={16}/><span>Come back from a Windows, Mac, Linux, or Chromebook computer to start practicing.</span></div>
    </div>
  </main>
}

function SettingsModal({close,keyboardStyle,setKeyboardStyle,windowsLayout,setWindowsLayout,physicalKeyboard,setPhysicalKeyboard,hasWebHID,connectPhysicalKeyboard,keyboardError,setKeyboardError,performanceMode,setPerformanceMode,visionEnabled,setVisionEnabled,fingerColors,setFingerColors}:{
  close:()=>void;
  keyboardStyle:KeyboardStyle;
  setKeyboardStyle:(value:KeyboardStyle)=>void;
  windowsLayout:WindowsLayout;
  setWindowsLayout:(value:WindowsLayout)=>void;
  physicalKeyboard:KeyboardProfile|null;
  setPhysicalKeyboard:(value:KeyboardProfile)=>void;
  hasWebHID:boolean;
  connectPhysicalKeyboard:()=>Promise<KeyboardProfile>;
  keyboardError:string|null;
  setKeyboardError:(value:string|null)=>void;
  performanceMode:PerformanceMode;
  setPerformanceMode:(value:PerformanceMode)=>void;
  visionEnabled:boolean;
  setVisionEnabled:(value:boolean)=>void;
  fingerColors:boolean;
  setFingerColors:(value:boolean)=>void;
}){
  const modal=useRef<HTMLDivElement>(null);
  useEffect(()=>animateModal(modal.current),[]);
  return <div className="overlay">
    <div className="simple-settings-modal" ref={modal} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header className="simple-settings-header">
        <div>
          <div className="modal-step">Preferences</div>
          <h2 id="settings-title">Settings</h2>
        </div>
        <button className="icon-action" onClick={close} aria-label="Close settings"><X size={17}/></button>
      </header>

      <div className="simple-settings-body">
        <section className="simple-settings-section">
          <div className="simple-settings-section-head"><Keyboard size={17}/><div><strong>Keyboard</strong><span>Choose how the keyboard looks while you practice.</span></div></div>
          <div className="settings-row">
            <div><strong>Keyboard style</strong><span>{keyboardStyle==="windows"?"Windows layout":"Mac layout"}</span></div>
            <div className="settings-choice-pills" role="group" aria-label="Keyboard style">
              <button className={keyboardStyle==="windows"?"settings-pill active":"settings-pill"} onClick={()=>setKeyboardStyle("windows")}>Windows</button>
              <button className={keyboardStyle==="mac"?"settings-pill active":"settings-pill"} onClick={()=>setKeyboardStyle("mac")}>Mac</button>
            </div>
          </div>
          {keyboardStyle==="windows"&&<div className="settings-row compact-row">
            <div><strong>Windows keyboard layout</strong><span>Legacy uses the Menu key. New uses the Copilot key.</span></div>
            <div className="settings-choice-pills" role="group" aria-label="Windows keyboard layout">
              <button className={windowsLayout==="legacy"?"settings-pill active":"settings-pill"} onClick={()=>setWindowsLayout("legacy")}>Legacy</button>
              <button className={windowsLayout==="copilot"?"settings-pill active":"settings-pill"} onClick={()=>setWindowsLayout("copilot")}>Copilot</button>
            </div>
          </div>}
          <label className="simple-settings-toggle">
            <span><strong>Finger color coding</strong><small>Color each typing key by the finger that should press it.</small></span>
            <input type="checkbox" checked={fingerColors} onChange={event=>setFingerColors(event.target.checked)}/>
          </label>
          <div className="finger-legend" aria-label="Finger color legend">
            <span className="finger-legend-item"><i className="finger-swatch finger-left-pinky"></i>Left pinky</span><span className="finger-legend-item"><i className="finger-swatch finger-left-ring"></i>Left ring</span><span className="finger-legend-item"><i className="finger-swatch finger-left-middle"></i>Left middle</span><span className="finger-legend-item"><i className="finger-swatch finger-left-index"></i>Left index</span><span className="finger-legend-item"><i className="finger-swatch finger-right-index"></i>Right index</span><span className="finger-legend-item"><i className="finger-swatch finger-right-middle"></i>Right middle</span><span className="finger-legend-item"><i className="finger-swatch finger-right-ring"></i>Right ring</span><span className="finger-legend-item"><i className="finger-swatch finger-right-pinky"></i>Right pinky</span><span className="finger-legend-item"><i className="finger-swatch finger-thumb"></i>Thumb</span>
          </div>
          <div className="settings-row compact-row">
            <div><strong>Physical keyboard</strong><span>{physicalKeyboard?.exactDevice?physicalKeyboard.name:physicalKeyboard?"Layout learned from typing":"Not connected"}</span></div>
            <button className="settings-small-button" onClick={async()=>{
              setKeyboardError(null);
              try{
                const profile=await connectPhysicalKeyboard();
                setPhysicalKeyboard(profile);
                setKeyboardStyle(profile.layout==="mac"?"mac":"windows");
              }catch(error){
                setKeyboardError(error instanceof Error?error.message:"Keyboard connection was cancelled.");
              }
            }}>{hasWebHID?"Connect":"Detect"}</button>
          </div>
          {keyboardError&&<div className="permission-error">{keyboardError}</div>}
        </section>

        <section className="simple-settings-section">
          <div className="simple-settings-section-head"><Gauge size={17}/><div><strong>Training</strong><span>Control where the background trainer runs.</span></div></div>
          <div className="performance-options simple-performance" role="group" aria-label="Performance mode">
            <button className={performanceMode==="low"?"performance-option active":"performance-option"} onClick={()=>setPerformanceMode("low")}><strong>Low</strong><span>100% cloud</span></button>
            <button className={performanceMode==="balanced"?"performance-option active":"performance-option"} onClick={()=>setPerformanceMode("balanced")}><strong>Balanced</strong><span>70% cloud · 30% device</span></button>
            <button className={performanceMode==="max"?"performance-option active":"performance-option"} onClick={()=>setPerformanceMode("max")}><strong>Max</strong><span>100% device</span></button>
          </div>
          <p className="simple-settings-note">{performanceMode==="max"?"Max falls back to cloud when the device fails the safety check.":"Cloud training is used when the on-device model is not suitable for your device."}</p>
        </section>

        <section className="simple-settings-section">
          <div className="simple-settings-section-head"><Activity size={17}/><div><strong>Privacy & input</strong><span>Optional features that connect extra input signals.</span></div></div>
          <label className="simple-settings-toggle">
            <span><strong>Use paired vision signals</strong><small>Allow your paired Keyboard Vision extension to contribute aggregate gaze or hand-pose signals.</small></span>
            <input type="checkbox" checked={visionEnabled} onChange={event=>setVisionEnabled(event.target.checked)}/>
          </label>
          
        </section>
      </div>

      <footer className="simple-settings-footer"><span>Changes save automatically.</span><button className="solid-action" onClick={close}>Done</button></footer>
    </div>
  </div>
}
function AccountCloudSync({progress,onHydrate,onCountChange,onIdentityChange}:{progress:Progress;onHydrate:(next:Progress)=>void;onCountChange:(count:number)=>void;onIdentityChange:(username:string|null)=>void}){
  const{isLoaded,isSignedIn,user}=useUser();
  const timer=useRef<number|null>(null);
  const running=useRef(false);
  const lastSyncAt=useRef(0);
  const currentProgress=useRef(progress);
  useEffect(()=>{currentProgress.current=progress},[progress]);

  useEffect(()=>{
    if(!isLoaded||!isSignedIn||!user)return;
    let cancelled=false;

    const readWords=(value:unknown)=>{
      if(!Array.isArray(value))return[];
      return value.filter((word):word is string=>typeof word==="string"&&word.trim().length>0).map(word=>word.trim().toLowerCase());
    };
    const readGameStats=(value:unknown):GameStats=>{
      if(!value||typeof value!=="object")return{};
      const result:GameStats={};
      for(const [id,raw] of Object.entries(value as Record<string,unknown>)){
        if(!raw||typeof raw!=="object")continue;
        const entry=raw as Record<string,unknown>;
        if(typeof entry.plays!=="number"||typeof entry.best!=="number"||typeof entry.lastPlayed!=="number")continue;
        result[id]={plays:Math.max(0,Math.floor(entry.plays)),best:Math.max(0,Math.floor(entry.best)),lastPlayed:Math.max(0,Math.floor(entry.lastPlayed))};
      }
      return result;
    };
    const sameProgress=(a:Progress,b:Progress)=>{
      return a.activeSeconds===b.activeSeconds&&a.totalPracticeWords===b.totalPracticeWords&&a.bestWpm===b.bestWpm&&a.bestScore===b.bestScore
        &&JSON.stringify(a.skillMap)===JSON.stringify(b.skillMap)
        &&JSON.stringify(a.history)===JSON.stringify(b.history);
    };

    const sync=async()=>{
      if(cancelled||running.current)return;
      running.current=true;
      try{
        const metadata=user.unsafeMetadata as Record<string,unknown>|undefined;
        const typhelper=metadata?.typhelper;
        const remoteProgress=typhelper&&typeof typhelper==="object"?normalizeCloudProgress((typhelper as Record<string,unknown>).progress):null;
        const base=currentProgress.current;
        const mergedProgress=remoteProgress?mergeProgress(base,remoteProgress):base;

        const remoteWords=typhelper&&typeof typhelper==="object"?readWords((typhelper as Record<string,unknown>).generatedWords):[];
        const localWords=loadGeneratedWords();
        const mergedWords=[...new Set([...remoteWords,...localWords])].slice(-1000);

        const remoteGames=typhelper&&typeof typhelper==="object"?readGameStats((typhelper as Record<string,unknown>).gameStats):{};
        const localGames=loadGameStats();
        const mergedGames:GameStats={};
        for(const id of new Set([...Object.keys(remoteGames),...Object.keys(localGames)])){
          const remote=remoteGames[id]??{plays:0,best:0,lastPlayed:0};
          const local=localGames[id]??{plays:0,best:0,lastPlayed:0};
          mergedGames[id]={plays:Math.max(remote.plays,local.plays),best:Math.max(remote.best,local.best),lastPlayed:Math.max(remote.lastPlayed,local.lastPlayed)};
        }

        if(!sameProgress(base,mergedProgress))onHydrate(mergedProgress);
        const localWordsKey=JSON.stringify(localWords);
        if(localWordsKey!==JSON.stringify(mergedWords))saveGeneratedWords(mergedWords);
        onCountChange(mergedWords.length);
        onIdentityChange(user.username||user.firstName||user.fullName||null);
        await user.updateMetadata({
          unsafeMetadata:{
            typhelper:{
              schemaVersion:3,
              progress:{...mergedProgress,activeSeconds:base.activeSeconds,history:mergedProgress.history.slice(0,30)},
              generatedWords:mergedWords,
              gameStats:mergedGames
            }
          }
        });
        lastSyncAt.current=Date.now();
      }catch(error){
        console.warn("[Typhelper Account Sync]",error);
      }finally{
        running.current=false;
      }
    };

    const schedule=()=>{
      if(timer.current!==null)return;
      const delay=Math.max(0,8000-(Date.now()-lastSyncAt.current));
      timer.current=window.setTimeout(()=>{
        timer.current=null;
        void sync();
      },delay);
    };

    void sync().finally(()=>{
      if(cancelled)return;
      window.addEventListener("typhelper-progress-changed",schedule);
      window.addEventListener("typhelper-generated-word",schedule);
      window.addEventListener("typhelper-game-stats-changed",schedule);
      window.addEventListener("pagehide",schedule);
    });

    return()=>{
      cancelled=true;
      window.removeEventListener("typhelper-progress-changed",schedule);
      window.removeEventListener("typhelper-generated-word",schedule);
      window.removeEventListener("typhelper-game-stats-changed",schedule);
      window.removeEventListener("pagehide",schedule);
      if(timer.current!==null)window.clearTimeout(timer.current);
    };
  },[isLoaded,isSignedIn,user]);

  return null;
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

function MilestoneBar({type,value}:{type:"words"|"wpm";value:number}){
  const progress=milestoneProgress(type,value);
  return <div className="milestone-bar"><div className="milestone-bar-top"><span>{progress.next?progress.remaining+" to "+progress.next.title:"milestones complete"}</span><strong>{value.toLocaleString()}</strong></div><div className="milestone-track"><i style={{width:progress.percent+"%"}}/></div></div>
}

function formOfPhrase(type:string){
  const article=/^[aeiou]/i.test(type)?"an":"a";
  return article+" "+type+" of";
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
            <strong>This word is {formOfPhrase(details.alternateOfType||"alternative form")} <b>{details.alternateOf}</b>.</strong>
            {details.alternateOfSimpleDefinition&&<span>The original word means: <b>{details.alternateOfSimpleDefinition}</b></span>}
          </div>
        </div>}
        {details.alternateOf&&details.alternateOfDefinition&&<section className="details-section original-word-section">
          <div className="details-label">Original word · {details.alternateOf}</div>
          <div className="details-definition">{details.alternateOfDefinition}</div>
        </section>}
        <section className="details-section">
          <div className="details-label">Original dictionary definition</div>
          <div className="details-definition">{details.originalDefinition}</div>
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

function QuizModal({skillMap,performanceMode,onClose,onFinish,onRecord}:{skillMap:Progress["skillMap"];performanceMode:PerformanceMode;onClose:()=>void;onFinish:(result:QuizResult,target:string,answer:string)=>void;onRecord:(event:{kind:"key";expected:string;actual:string;latency:number}|{kind:"word";word:string;correct:boolean;duration:number})=>void}){
  const[phase,setPhase]=useState<"intro"|"running"|"analyzing"|"result">("intro");
  const[part,setPart]=useState<"typing"|"sentence">("typing");
  const[gaze,setGaze]=useState<GazeState>("unknown");
  const[eyesDetected,setEyesDetected]=useState(false);
  const[paused,setPaused]=useState(false);
  const[answer,setAnswer]=useState("");
  const[challengeAnswer,setChallengeAnswer]=useState("");
  const[score,setScore]=useState<QuizScore|null>(null);
  const[error,setError]=useState("");
  const[cameraStatus,setCameraStatus]=useState<"checking"|"ready"|"permission"|"busy">("checking");
  const[challengeWord,setChallengeWord]=useState<ChallengeWord|null>(null);
  const[challengeDetails,setChallengeDetails]=useState<WordDetails|null>(null);
  const[challengeLoading,setChallengeLoading]=useState(false);
  const[sentenceScore,setSentenceScore]=useState<SentenceChallengeScore|null>(null);
  const target=useRef(createQuiz(skillMap));
  const started=useRef(0);
  const times=useRef<number[]>([]);
  const backspaces=useRef(0);
  const focus=useRef(0);
  const lastKey=useRef(performance.now());
  const typingAnswer=useRef("");
  const challengeStarted=useRef(0);
  const video=useRef<HTMLVideoElement>(null);
  const monitor=useRef<GazeMonitor|null>(null);
  const previous=useRef<GazeState>("unknown");
  const hadError=useRef(false);
  const finishing=useRef(false);
  const cameraStream=useRef<MediaStream|null>(null);
  const challengeRequest=useRef<AbortController|null>(null);
  const screenRef=useRef<HTMLElement|null>(null);

  useEffect(()=>{
    const el=screenRef.current;
    if(!el)return;
    el.animate([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"translateY(0)"}],{duration:420,easing:"cubic-bezier(.22,1,.36,1)"});
  },[phase,part]);

  useEffect(()=>{
    if(phase!=="intro")return;
    let cancelled=false;
    const check=async()=>{
      try{
        const permission=await (navigator.permissions as any)?.query?.({name:"camera"});
        if(cancelled)return;
        if(permission?.state==="granted"){
          try{
            const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
            if(cancelled){stream.getTracks().forEach(track=>track.stop());return;}
            cameraStream.current=stream;
            setCameraStatus("ready");
          }catch{
            setCameraStatus("busy");
          }
        }else{
          setCameraStatus("permission");
        }
      }catch{
        setCameraStatus("permission");
      }
    };
    void check();
    return()=>{cancelled=true};
  },[phase]);

  useEffect(()=>()=>{challengeRequest.current?.abort();monitor.current?.stop(video.current||undefined);cameraStream.current?.getTracks().forEach(track=>track.stop())},[]);

  useEffect(()=>{
    if(phase!=="running")return;
    let cancelled=false;
    const startCamera=async()=>{
      try{
        let stream=cameraStream.current;
        const live=stream?.getVideoTracks().some(track=>track.readyState==="live");
        if(!stream||!live){
          stream=await navigator.mediaDevices.getUserMedia({
            video:{facingMode:"user",width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}},
            audio:false
          });
        }
        if(cancelled){stream.getTracks().forEach(track=>track.stop());return;}
        cameraStream.current=stream;
        const videoEl=video.current;
        if(!videoEl){window.requestAnimationFrame(()=>void startCamera());return;}
        const m=new GazeMonitor();
        monitor.current=m;
        await m.start(videoEl,handleGaze,stream);
        setCameraStatus("ready");
        if(cancelled)m.stop(videoEl);
      }catch(error){
        if(cancelled)return;
        setCameraStatus("busy");
        setError(error instanceof Error?error.message:"Camera could not be started.");
      }
    };
    void startCamera();
    return()=>{
      cancelled=true;
      monitor.current?.stop(video.current||undefined);
      monitor.current=null;
    };
  },[phase]);

  useEffect(()=>{
    if(phase!=="running"||part!=="typing")return;
    const handleKeyDown=(event:KeyboardEvent)=>{
      if(paused||finishing.current)return;
      if(event.ctrlKey||event.metaKey||event.altKey)return;
      if(event.key==="Backspace"){
        event.preventDefault();
        if(answer.length>0){
          backspaces.current+=1;
          hadError.current=true;
          setAnswer(value=>value.slice(0,-1));
        }
        return;
      }
      if(event.key==="Tab"||event.key==="Escape"||event.key==="Enter"||event.key.startsWith("Arrow"))return;
      if(event.key.length!==1)return;
      event.preventDefault();
      const position=answer.length;
      if(position>=target.current.length)return;
      const expected=target.current[position]??"";
      const actual=event.key;
      const now=performance.now();
      const latency=now-lastKey.current;
      lastKey.current=now;
      times.current.push(now);
      if(actual!==expected)hadError.current=true;
      onRecord({kind:"key",expected,actual,latency});
      const next=answer+actual;
      setAnswer(next);
      if(next.length===target.current.length){
        typingAnswer.current=next;
        onRecord({kind:"word",word:target.current,correct:!hadError.current,duration:Date.now()-started.current});
        hadError.current=false;
        void loadChallenge();
      }
    };
    window.addEventListener("keydown",handleKeyDown);
    return()=>window.removeEventListener("keydown",handleKeyDown);
  },[phase,part,paused,answer,onRecord]);

  function handleGaze(state:GazeState,detected=true){
    setEyesDetected(detected);
    setGaze(state);
    if(state==="keyboard"&&previous.current!=="keyboard"){focus.current+=1;setPaused(true)}
    if(state==="screen")setPaused(false);
    previous.current=state;
  }

  async function loadChallenge(){
    challengeRequest.current?.abort();
    const controller=new AbortController();
    challengeRequest.current=controller;
    const next=nextChallengeWord();
    rememberGeneratedWord(next.word);
    setChallengeWord(next);
    setChallengeAnswer("");
    setChallengeDetails(null);
    setSentenceScore(null);
    setChallengeLoading(true);
    challengeStarted.current=Date.now();
    setPart("sentence");

    try{
      const details=await fetchWordDetails(next.word,controller.signal);
      if(controller.signal.aborted)return;
      setChallengeDetails(details);
    }finally{
      if(challengeRequest.current===controller)challengeRequest.current=null;
      if(!controller.signal.aborted)setChallengeLoading(false);
    }
  }

  async function start(){
    setError("");
    try{
      let stream=cameraStream.current;
      const live=stream?.getVideoTracks().some(track=>track.readyState==="live");
      if(!stream||!live){
        stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:"user",width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}},
          audio:false
        });
        cameraStream.current=stream;
      }
      setCameraStatus("ready");
      started.current=Date.now();
      lastKey.current=performance.now();
      times.current=[];
      backspaces.current=0;
      focus.current=0;
      hadError.current=false;
      finishing.current=false;
      typingAnswer.current="";
      setAnswer("");
      setChallengeAnswer("");
      setChallengeWord(null);
      setChallengeDetails(null);
      setSentenceScore(null);
      setPaused(false);
      setGaze("unknown");
      setEyesDetected(false);
      previous.current="unknown";
      setPart("typing");
      setPhase("running");
    }catch(e){
      setCameraStatus("busy");
      setError(e instanceof Error?e.message:"Camera could not be started.");
    }
  }

  async function finish(challengeResult:SentenceChallengeScore){
    if(phase!=="running"||finishing.current||!challengeWord)return;
    finishing.current=true;
    const typingText=typingAnswer.current;
    const local=scoreQuiz(target.current,typingText,started.current,times.current,backspaces.current,focus.current);
    setPhase("analyzing");

    const ai=await analyzeQuiz({
      stats:local.stats as unknown as Record<string,unknown>,
      focusPauses:local.focusPauses,
      target:target.current,
      answer:typingText
    },performanceMode);

    let typingScore=ai.score;
    let backend=ai.backend==="local"?"Local AI":ai.backend==="cloud"?"Cloud AI":"Fallback scoring";
    if(ai.backend==="fallback"){
      const fallback=await scoreWebNN([
        local.stats.accuracy,
        Math.min(1,local.stats.wpm/75),
        local.stats.consistency,
        Math.max(0,1-local.stats.backspaceRate*1.35),
        Math.max(0,1-focus.current/6),
        Math.max(0,local.stats.consistency*(1-local.stats.latencyJitter*.35)),
        Math.max(0,1-Math.max(0,local.stats.avgLatencyMs-85)/280),
        Math.max(0,1-local.stats.errorRate*1.2)
      ]);
      typingScore=fallback.score;
      backend=fallback.backend;
    }

    onRecord({
      kind:"word",
      word:challengeWord.word,
      correct:challengeResult.usesWord,
      duration:Date.now()-challengeStarted.current
    });

    const combinedScore=Math.round(typingScore*.7+challengeResult.score*.3);
    const analysisTips=ai.backend==="fallback"?local.tips:(ai.tips.length?ai.tips:local.tips);
    const tips=[...new Set([...challengeResult.tips,...analysisTips])].slice(0,4);
    const final={
      ...local,
      score:combinedScore,
      backend:backend+" + vocabulary",
      tips,
      sentenceScore:challengeResult.score,
      challengeWord:challengeWord.word
    };

    setScore(final);
    setSentenceScore(challengeResult);
    setPhase("result");
    onFinish({
      id:crypto.randomUUID(),
      createdAt:Date.now(),
      score:final.score,
      stats:final.stats,
      focusPauses:final.focusPauses,
      sentenceScore:challengeResult.score,
      challengeWord:challengeWord.word
    },target.current,typingText);
  }

  function submitChallenge(){
    if(!challengeWord||paused||finishing.current)return;
    const result=scoreSentenceChallenge(
      challengeWord.word,
      challengeAnswer,
      challengeDetails?.simpleDefinition||challengeDetails?.fullDefinition||challengeWord.definition,
      challengeDetails?.synonyms?.length?challengeDetails.synonyms:challengeWord.synonyms
    );
    setSentenceScore(result);
    void finish(result);
  }

  if(phase==="analyzing")return <main className="checkin-page checkin-result-page" ref={screenRef}>
    <header className="checkin-header"><div><div className="modal-step">Analyzing check-in</div><h1>Your typing results are being prepared</h1></div></header>
    <section className="checkin-result-shell"><div className="checkin-analysis-state"><div className="analysis-spinner"></div><strong>Analyzing both parts</strong><span>{performanceMode==="max"?"Using on-device AI when available.":performanceMode==="balanced"?"Choosing cloud or on-device AI based on your settings and hardware.":"Using cloud AI for the typing analysis."}</span></div></section>
  </main>;

  if(phase==="result"&&score)return <main className="checkin-page checkin-result-page" ref={screenRef}>
    <header className="checkin-header"><div><div className="modal-step">Check-in complete</div><h1>Your typing results</h1></div><button className="icon-action" onClick={onClose} aria-label="Close check-in"><X size={17}/></button></header>
    <section className="checkin-result-shell">
      <div className="checkin-score"><span>Overall</span><strong>{score.score}</strong><small>/100</small></div>
      <div className="result-metrics">
        <div><span>Typing WPM</span><strong>{score.stats.wpm.toFixed(0)}</strong></div>
        <div><span>Accuracy</span><strong>{(score.stats.accuracy*100).toFixed(0)}%</strong></div>
        <div><span>Consistency</span><strong>{(score.stats.consistency*100).toFixed(0)}%</strong></div>
        <div><span>Focus pauses</span><strong>{score.focusPauses}</strong></div>
        <div><span>Paragraph</span><strong>{score.sentenceScore??"—"}</strong></div>
      </div>
      {score.challengeWord&&<div className="challenge-result-note"><span>New word</span><strong>{score.challengeWord}</strong></div>}
      <div className="result-list"><div className="mini-label">Things to improve</div>{score.tips.map(item=><div className="tip" key={item}><Check size={14}/><span>{item}</span></div>)}</div>
      <div className="checkin-result-footer"><span>analyzed with {score.backend}</span><button className="solid-action" onClick={onClose}>Back to practice</button></div>
    </section>
  </main>;

  if(phase==="intro")return <main className="checkin-page checkin-intro-page" ref={screenRef}>
    <header className="checkin-header"><div><div className="modal-step">Typing check-in</div><h1>Let’s check your typing</h1></div><button className="icon-action" onClick={onClose} aria-label="Close check-in"><X size={17}/></button></header>
    <section className="checkin-intro-shell">
      <div className="checkin-intro-copy">
        <div className="checkin-icon"><Keyboard size={24}/></div>
        <h2>Two parts. One check-in.</h2>
        <p>First, type a unique passage without looking down. Then you’ll get a new vocabulary word with its definition and synonyms and write a full paragraph using it.</p>
        <div className="checkin-note"><Camera size={15}/><span>{cameraStatus==="ready"?"Your camera is ready for focus detection.":cameraStatus==="busy"?"The camera is unavailable or already in use.":"Camera permission is needed for focus detection."}</span></div>
        {error&&<div className="permission-error">{error}</div>}
        <div className="checkin-actions"><button className="outline-action" onClick={onClose}>Not now</button><button className="solid-action" onClick={start}>{cameraStatus==="ready"?"Start check-in":"Allow camera & start"} <ChevronRight size={16}/></button></div>
      </div>
      <div className="checkin-intro-preview"><div className="checkin-preview-top"><span>What happens</span><Camera size={15}/></div><div className="checkin-step"><strong>01</strong><span>Your camera is checked before the test starts.</span></div><div className="checkin-step"><strong>02</strong><span>Type the unique passage while focus detection watches for keyboard glances.</span></div><div className="checkin-step"><strong>03</strong><span>Use the new vocabulary word naturally in a full paragraph.</span></div></div>
    </section>
  </main>;

  if(part==="sentence"&&challengeWord)return <main className="checkin-page checkin-running-page" ref={screenRef}>
    <header className="checkin-header"><div><div className="modal-step">Part 2 of 2 · Vocabulary</div><h1>Use the new word</h1></div><button className="quiet-action" onClick={()=>void submitChallenge()} disabled={challengeAnswer.trim().split(/\s+/).filter(Boolean).length<50}>Submit paragraph</button></header>
    <section className="checkin-running-shell sentence-challenge-shell">
      <div className="checkin-live-bar"><span>{paused?"Paused · look back at the screen":!eyesDetected?"Look toward the camera":gaze==="screen"?"Screen focus":"Checking focus"}</span><strong>New word</strong></div>
      <div className="sentence-challenge">
        <div className="modal-step">Challenge word</div>
        <div className="challenge-word">{challengeWord.word}</div>
        <div className="challenge-label">Definition</div>
        <p className="challenge-definition">{challengeDetails?.simpleDefinition||challengeDetails?.fullDefinition||challengeWord.definition}</p>
        <div className="challenge-label">Synonyms</div>
        <div className="challenge-synonyms">{(challengeDetails?.synonyms?.length?challengeDetails.synonyms:challengeWord.synonyms).slice(0,6).map(item=><span key={item}>{item}</span>)}</div>
        {challengeLoading&&<div className="challenge-loading">Getting a fuller dictionary explanation…</div>}
        <textarea
          value={challengeAnswer}
          onChange={event=>setChallengeAnswer(event.target.value)}
          placeholder={"Write at least 50 words in one original paragraph using “"+challengeWord.word+"”."}
          aria-label={"Write a paragraph using "+challengeWord.word}
          disabled={paused}
          autoFocus
        />
        <div className="challenge-prompt-row"><span>{paused?"Look back at the screen to keep typing.":"Write one complete paragraph. Use the word naturally and don’t copy the definition."}</span><strong>{challengeAnswer.trim().split(/\s+/).filter(Boolean).length} / 50 words</strong></div>
        {sentenceScore&&<div className="challenge-feedback"><strong>Paragraph check: {sentenceScore.score}/100</strong><span>{sentenceScore.tips[0]}</span></div>}
        <button className="solid-action challenge-submit" onClick={submitChallenge} disabled={paused||challengeAnswer.trim().split(/\s+/).filter(Boolean).length<50}>{paused?"Look back at the screen":"Check paragraph"} <ChevronRight size={16}/></button>
      </div>
      <video ref={video} muted playsInline className="vision-probe" aria-hidden="true" tabIndex={-1}/>
    </section>
  </main>;

  return <main className="checkin-page checkin-running-page" ref={screenRef}>
    <header className="checkin-header"><div><div className="modal-step">Part 1 of 2 · Typing</div><h1>Type the passage</h1></div><button className="quiet-action" onClick={()=>void loadChallenge()} disabled={answer.length<target.current.length}>Skip to vocabulary</button></header>
    <section className="checkin-running-shell">
      <div className="checkin-live-bar"><span>{paused?"Paused · look back at the screen":!eyesDetected?"Look toward the camera":gaze==="screen"?"Screen focus":"Calibrating focus"}</span><strong>{answer.length} / {target.current.length}</strong></div>
      <div className="quiz-target checkin-target" aria-live="polite">{[...target.current].map((char,i)=><span key={i} className={i<answer.length?(answer[i]===char?"typed":"miss"):""}>{char}</span>)}</div>
      <video ref={video} muted playsInline className="vision-probe" aria-hidden="true" tabIndex={-1}/>
    </section>
  </main>;
}

function counterPlaces(value:number){
  const digits=Math.max(1,Math.floor(Math.abs(value)).toString().length);
  return Array.from({length:digits},(_,index)=>10**(digits-index-1));
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
