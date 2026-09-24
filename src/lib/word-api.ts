const RANDOM_WORD_API="https://random-word-api.herokuapp.com/word?number=8";
const DICTIONARY_API="https://api.dictionaryapi.dev/api/v2/entries/en";

interface DictionaryEntry{
  meanings?:Array<{definitions?:Array<{definition?:string}>}>;
}

export interface PracticeWord{
  word:string;
  definition:string|null;
  isNew:boolean;
}

function cleanWord(value:string){
  const word=value.trim().toLowerCase();
  return /^[a-z]+$/.test(word)?word:null;
}

function compactDefinition(value:string){
  const cleaned=value
    .replace(/\([^)]*\)/g,"")
    .replace(/\[[^\]]*\]/g,"")
    .split(";")[0]
    .replace(/\s+/g," ")
    .trim();

  const words=cleaned.split(" ").filter(Boolean);
  if(words.length<=6)return cleaned;
  return words.slice(0,6).join(" ")+"…";
}

async function fetchRandomCandidates(signal?:AbortSignal){
  const response=await fetch(RANDOM_WORD_API,{signal});
  if(!response.ok)throw new Error("Random Word API request failed");
  const data=await response.json();
  if(!Array.isArray(data))throw new Error("Random Word API returned invalid data");
  return data.map(value=>typeof value==="string"?cleanWord(value):null).filter((value):value is string=>Boolean(value));
}

async function fetchDefinition(word:string,signal?:AbortSignal){
  try{
    const response=await fetch(DICTIONARY_API+"/"+encodeURIComponent(word),{signal});
    if(!response.ok)return null;
    const data=await response.json() as DictionaryEntry[];
    const definition=data?.[0]?.meanings?.flatMap(meaning=>meaning.definitions??[])
      .map(item=>item.definition?.trim())
      .find(Boolean);
    return definition?compactDefinition(definition):null;
  }catch{
    return null;
  }
}

export async function fetchPracticeWord(previous:string,shownWords:Set<string>,signal?:AbortSignal):Promise<PracticeWord>{
  try{
    const candidates=await fetchRandomCandidates(signal);
    const unique=candidates.filter(word=>word!==previous);
    const unseen=unique.filter(word=>!shownWords.has(word));
    const word=unseen[0]??unique[0]??candidates[0];
    if(word){
      const isNew=!shownWords.has(word);
      return{word,definition:isNew?await fetchDefinition(word,signal):null,isNew};
    }
  }catch{
    // The static learner vocabulary remains the offline fallback.
  }

  return{word:previous||"type",definition:null,isNew:false};
}
