import type{Progress,QuizResult,SkillMap}from"../types";

const KEY="typing-pro-progress-v1";
const GENERATED_WORDS_KEY="typhelper-generated-words-v1";
const MAX_DEVICE_GENERATED_WORDS=2000;

export const fresh=():Progress=>({
  version:1,
  activeSeconds:0,
  totalPracticeWords:0,
  bestScore:0,
  skillMap:{},
  history:[]
});

function isSkillMap(value:unknown):value is SkillMap{
  if(!value||typeof value!=="object")return false;
  return Object.values(value as Record<string,unknown>).every(item=>{
    if(!item||typeof item!=="object")return false;
    const entry=item as Record<string,unknown>;
    return typeof entry.mistakes==="number"&&Number.isFinite(entry.mistakes)
      &&typeof entry.attempts==="number"&&Number.isFinite(entry.attempts)
      &&typeof entry.lastSeen==="number"&&Number.isFinite(entry.lastSeen);
  });
}

function isQuizHistory(value:unknown):value is QuizResult[]{
  if(!Array.isArray(value))return false;
  return value.every(item=>{
    if(!item||typeof item!=="object")return false;
    const entry=item as Record<string,unknown>;
    return typeof entry.id==="string"
      &&typeof entry.createdAt==="number"&&Number.isFinite(entry.createdAt)
      &&typeof entry.score==="number"&&Number.isFinite(entry.score)
      &&typeof entry.focusPauses==="number"&&Number.isFinite(entry.focusPauses)
      &&!!entry.stats&&typeof entry.stats==="object";
  });
}

export function load():Progress{
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||"null");
    if(!raw||typeof raw!=="object")return fresh();
    const value=raw as Record<string,unknown>;
    const current=fresh();
    return{
      version:1,
      activeSeconds:typeof value.activeSeconds==="number"&&Number.isFinite(value.activeSeconds)?Math.max(0,Math.floor(value.activeSeconds)):current.activeSeconds,
      totalPracticeWords:typeof value.totalPracticeWords==="number"&&Number.isFinite(value.totalPracticeWords)?Math.max(0,Math.floor(value.totalPracticeWords)):current.totalPracticeWords,
      bestScore:typeof value.bestScore==="number"&&Number.isFinite(value.bestScore)?Math.max(0,Math.min(100,value.bestScore)):current.bestScore,
      skillMap:isSkillMap(value.skillMap)?value.skillMap:current.skillMap,
      history:isQuizHistory(value.history)?value.history.slice(0,30):current.history
    };
  }catch{
    return fresh();
  }
}

export function save(p:Progress){
  try{localStorage.setItem(KEY,JSON.stringify(p))}catch{}
}

export function loadGeneratedWords():string[]{
  try{
    const parsed=JSON.parse(localStorage.getItem(GENERATED_WORDS_KEY)||"[]");
    return Array.isArray(parsed)
      ?parsed.filter((word):word is string=>typeof word==="string"&&word.trim().length>0)
      :[];
  }catch{
    return [];
  }
}

export function saveGeneratedWords(words:string[]){
  try{
    const normalized=[...new Set(words.map(word=>word.trim().toLowerCase()).filter(Boolean))].slice(-MAX_DEVICE_GENERATED_WORDS);
    localStorage.setItem(GENERATED_WORDS_KEY,JSON.stringify(normalized));
  }catch{}
}

export function rememberGeneratedWord(word:string){
  const clean=word.trim().toLowerCase();
  if(!clean)return;
  const words=loadGeneratedWords();
  saveGeneratedWords([...words,clean]);
}
