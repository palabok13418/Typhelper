const RANDOM_WORD_API="https://random-word-api.herokuapp.com/word?number=8";
const DICTIONARY_API="https://api.dictionaryapi.dev/api/v2/entries/en";
const DEFINITION_CACHE="typing-pro-definition-cache";

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

function readDefinitionCache(){
  try{
    const parsed=JSON.parse(localStorage.getItem(DEFINITION_CACHE)||"{}") as Record<string,string>;
    return parsed&&typeof parsed==="object"?parsed:{};
  }catch{
    return {};
  }
}

function writeDefinitionCache(word:string,definition:string){
  try{
    const cache=readDefinitionCache();
    cache[word]=definition;
    const recent=Object.entries(cache).slice(-500);
    localStorage.setItem(DEFINITION_CACHE,JSON.stringify(Object.fromEntries(recent)));
  }catch{
    // Definition caching is optional.
  }
}

async function fetchRandomCandidates(signal?:AbortSignal){
  const response=await fetch(RANDOM_WORD_API,{signal});
  if(!response.ok)throw new Error("Random Word API request failed");
  const data=await response.json();
  if(!Array.isArray(data))throw new Error("Random Word API returned invalid data");
  return data.map(value=>typeof value==="string"?cleanWord(value):null).filter((value):value is string=>Boolean(value));
}

export async function fetchWordDefinition(word:string,signal?:AbortSignal){
  const clean=cleanWord(word);
  if(!clean)return null;
  const cached=readDefinitionCache()[clean];
  if(cached)return cached;

  const endpoints=[
    "/api/definition?word="+encodeURIComponent(clean),
    DICTIONARY_API+"/"+encodeURIComponent(clean)
  ];

  for(const endpoint of endpoints){
    try{
      const response=await fetch(endpoint,{signal});
      if(!response.ok)continue;
      const data=await response.json() as DictionaryEntry[];
      const definition=data?.[0]?.meanings?.flatMap(meaning=>meaning.definitions??[])
        .map(item=>item.definition?.trim())
        .find(Boolean);
      if(definition){
        const compact=compactDefinition(definition);
        writeDefinitionCache(clean,compact);
        return compact;
      }
    }catch{
      // Try the next source.
    }
  }

  return null;
}

export async function fetchPracticeWord(previous:string,shownWords:Set<string>,signal?:AbortSignal):Promise<PracticeWord>{
  try{
    const candidates=await fetchRandomCandidates(signal);
    const unique=candidates.filter(word=>word!==previous);
    const unseen=unique.filter(word=>!shownWords.has(word));
    const word=unseen[0]??unique[0]??candidates[0];
    if(word){
      const isNew=!shownWords.has(word);
      const definition=isNew?await fetchWordDefinition(word,signal):null;
      return{word,definition,isNew};
    }
  }catch{
    // The static learner vocabulary remains the offline fallback.
  }

  return{word:previous||"type",definition:null,isNew:false};
}
