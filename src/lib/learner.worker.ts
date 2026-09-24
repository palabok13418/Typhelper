type Skill={attempts:number;mistakes:number;lastSeen:number;latency:number};
type EventData={kind:"key";expected:string;actual:string;latency:number}|{kind:"word";word:string;correct:boolean;duration:number}|{kind:"vision";gaze:"screen"|"keyboard"|"unknown";hand:string|null}|{kind:"hydrate";skills:Record<string,Skill>;transitions:Record<string,{count:number;errors:number}>;fatigue:number};
type State={skills:Record<string,Skill>;transitions:Record<string,{count:number;errors:number}>;fatigue:number;keyboardLookSeconds:number;handPatterns:Record<string,number>;recentAccuracy:number[];pace:number[]};
let state:State={skills:{},transitions:{},fatigue:0,keyboardLookSeconds:0,handPatterns:{},recentAccuracy:[],pace:[]};
let keyEventsSinceSnapshot=0;
let visionEventsSinceSnapshot=0;
function letter(expected:string,actual:string,latency:number){const c=expected.toLowerCase();if(!c||c===" ")return;const s=state.skills[c]??{attempts:0,mistakes:0,lastSeen:0,latency:0};s.attempts+=1;s.lastSeen=Date.now();s.latency=s.latency*.86+latency*.14;if(actual.toLowerCase()!==c)s.mistakes+=1;state.skills[c]=s}
function snapshot(){return{skills:state.skills,transitions:state.transitions,fatigue:state.fatigue,keyboardLookSeconds:state.keyboardLookSeconds,handPatterns:state.handPatterns}}
function emitSnapshot(){(self as any).postMessage({type:"state",state:snapshot()});keyEventsSinceSnapshot=0;visionEventsSinceSnapshot=0}
self.onmessage=(event:MessageEvent<EventData>)=>{
  const e=event.data;
  if(e.kind==="key"){
    letter(e.expected,e.actual,e.latency);
    keyEventsSinceSnapshot+=1;
    if(keyEventsSinceSnapshot>=20)emitSnapshot();
    return;
  }
  if(e.kind==="vision"){
    if(e.gaze==="keyboard")state.keyboardLookSeconds+=.2;
    if(e.hand)state.handPatterns[e.hand]=(state.handPatterns[e.hand]??0)+1;
    visionEventsSinceSnapshot+=1;
    if(visionEventsSinceSnapshot>=30)emitSnapshot();
    return;
  }
  if(e.kind==="word"){
    state.recentAccuracy.push(e.correct?1:0);
    if(state.recentAccuracy.length>80)state.recentAccuracy.shift();
    state.pace.push(e.duration);
    if(state.pace.length>50)state.pace.shift();
    const a=e.word.slice(-2).toLowerCase();
    if(a.length===2){
      const t=state.transitions[a]??{count:0,errors:0};
      t.count+=1;
      if(!e.correct)t.errors+=1;
      state.transitions[a]=t
    }
    const avg=state.recentAccuracy.length?state.recentAccuracy.reduce((s,v)=>s+v,0)/state.recentAccuracy.length:1;
    const pace=state.pace.length?state.pace.reduce((s,v)=>s+v,0)/state.pace.length:0;
    state.fatigue=Math.max(0,Math.min(1,(1-avg)*.55+Math.min(1,pace/8000)*.45));
    emitSnapshot();
    return;
  }
  if(e.kind==="hydrate"){
    state.skills=Object.fromEntries(Object.entries(e.skills??{}).map(([k,s])=>[k,{...s,latency:Number(s.latency??0)}]));
    state.transitions=e.transitions??{};
    state.fatigue=e.fatigue??0;
    emitSnapshot();
  }
};