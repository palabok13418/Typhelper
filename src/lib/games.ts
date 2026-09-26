export type GameId="sprint"|"cascade"|"precision"|"duel";

export interface GameStats{
  [key:string]:{
    plays:number;
    best:number;
    lastPlayed:number;
  };
}

const GAME_STATS_KEY="typhelper-game-stats-v1";

export const SPRINT_PASSAGES=[
  "Clear typing is built from steady rhythm, accurate reaches, and enough patience to let each movement become automatic.",
  "Practice gets stronger when every key press has a purpose and speed grows from control instead of rushed corrections.",
  "A focused keyboard session turns small improvements into reliable habits that travel from practice into everyday work.",
  "Good typing is not only fast. It is predictable, comfortable, accurate, and calm when the words become unfamiliar."
];

export const PRECISION_WORDS=[
  "rhythm","accuracy","practice","keyboard","focus","control","memory","consistent","natural","progress","careful","smooth",
  "adaptive","reliable","deliberate","efficient","language","attention","learning","pattern","timing","reaction","precision","habits",
  "creative","clarity","command","steady","comfortable","confidence","improve","challenge","explore","discover","resilient","method",
  "strategy","balance","sequence","fingertips","movement","coordination","fluency","mastery","momentum","accuracy","recovery"
];

export const CASCADE_KEYS="asdfjkl;ghqwertyuiopzxcvbnm".split("");

export const DUEL_PASSAGES=[
  "Great typing feels quiet because every finger already knows where it needs to go.",
  "The fastest improvement comes from accurate repetition that builds a steady rhythm.",
  "A calm pace gives your hands time to learn the pattern before speed takes over.",
  "Small focused sessions can turn unfamiliar keys into automatic movements over time."
];

export function chooseItem<T>(items:T[],seed=Math.random()){
  return items[Math.floor(Math.max(0,Math.min(.999999,seed))*items.length)]??items[0];
}

export function sprintScore(correctChars:number,totalChars:number,elapsedMs:number){
  const minutes=Math.max(1/60,elapsedMs/60000);
  const accuracy=totalChars?correctChars/totalChars:0;
  const wpm=(correctChars/5)/minutes;
  return Math.round(Math.max(0,Math.min(100,wpm*.75+accuracy*25)));
}

export function cascadeScore(score:number,accuracy:number,remainingLives:number){
  return Math.round(Math.max(0,Math.min(100,score*.62+accuracy*38+remainingLives*2)));
}

export function precisionScore(correctWords:number,totalWords:number,wpm:number){
  const accuracy=totalWords?correctWords/totalWords:0;
  return Math.round(Math.max(0,Math.min(100,accuracy*55+Math.min(1,wpm/70)*45)));
}

export function loadGameStats():GameStats{
  try{
    const parsed=JSON.parse(localStorage.getItem(GAME_STATS_KEY)||"{}");
    return parsed&&typeof parsed==="object"?parsed as GameStats:{};
  }catch{
    return{};
  }
}

export function saveGameResult(game:GameId,score:number){
  try{
    const all=loadGameStats();
    const current=all[game]??{plays:0,best:0,lastPlayed:0};
    all[game]={plays:current.plays+1,best:Math.max(current.best,score),lastPlayed:Date.now()};
    localStorage.setItem(GAME_STATS_KEY,JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("typhelper-game-stats-changed"));
  }catch{}
}

export function duelPassageForCode(code:string){
  let hash=0;
  for(const char of code)hash=(hash*31+char.charCodeAt(0))>>>0;
  return chooseItem(DUEL_PASSAGES,hash/0xffffffff);
}
