const RANDOM_WORD_API="https://random-word-api.herokuapp.com/word?number=10";
const DEFINITION_CACHE="typing-pro-definition-cache";
const SIMPLE_DEFINITION_CACHE="typing-pro-simple-definition-cache";

interface DictionaryEntry{
  meanings?:Array<{definitions?:Array<{definition?:string}>}>;
}

export interface PracticeWord{
  word:string;
  definition:string|null;
  isNew:boolean;
}

export interface WordDetails{
  word:string;
  originalDefinition:string;
  fullDefinition:string;
  simpleDefinition:string;
  synonyms:string[];
  antonyms:string[];
  examples:string[];
  alternateOf:string|null;
  alternateOfType:string|null;
  alternateOfDefinition:string|null;
  alternateOfSimpleDefinition:string|null;
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

function readSimpleDefinitionCache(){
  try{
    const parsed=JSON.parse(localStorage.getItem(SIMPLE_DEFINITION_CACHE)||"{}") as Record<string,string>;
    return parsed&&typeof parsed==="object"?parsed:{};
  }catch{
    return{};
  }
}

function writeSimpleDefinitionCache(word:string,definition:string){
  try{
    const cache=readSimpleDefinitionCache();
    cache[word]=definition;
    const recent=Object.entries(cache).slice(-500);
    localStorage.setItem(SIMPLE_DEFINITION_CACHE,JSON.stringify(Object.fromEntries(recent)));
  }catch{}
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
  return data
    .map(value=>typeof value==="string"?cleanWord(value):null)
    .filter((value):value is string=>Boolean(value));
}

export async function fetchWordDefinition(word:string,signal?:AbortSignal){
  const clean=cleanWord(word);
  if(!clean)return null;
  const cached=readDefinitionCache()[clean];
  if(cached)return cached;

  const endpoint="/api/definition?word="+encodeURIComponent(clean);

  try{
    const response=await fetch(endpoint,{signal});
    if(!response.ok)return null;
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
    return null;
  }

  return null;
}

export async function fetchSimpleDefinition(word:string,originalDefinition:string|null,signal?:AbortSignal){
  const clean=cleanWord(word);
  if(!clean)return originalDefinition;

  const cached=readSimpleDefinitionCache()[clean];
  if(cached)return cached;

  try{
    const controller=new AbortController();
    const abortFromParent=()=>controller.abort();
    if(signal){
      if(signal.aborted)return originalDefinition;
      signal.addEventListener("abort",abortFromParent,{once:true});
    }
    const timer=window.setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetch("/api/word-details?word="+encodeURIComponent(clean)+"&mode=summary",{signal:controller.signal});
      if(!response.ok)return originalDefinition;
      const data=await response.json() as {simpleDefinition?:unknown};
      const simple=typeof data.simpleDefinition==="string"?data.simpleDefinition.trim():"";
      if(simple){
        writeSimpleDefinitionCache(clean,simple);
        return simple;
      }
    }finally{
      window.clearTimeout(timer);
      signal?.removeEventListener("abort",abortFromParent);
    }
  }catch{}
  return originalDefinition;
}

export async function fetchWordDetails(word:string,signal?:AbortSignal):Promise<WordDetails|null>{
  const clean=cleanWord(word);
  if(!clean)return null;
  try{
    const controller=new AbortController();
    const abortFromParent=()=>controller.abort();
    if(signal){
      if(signal.aborted)return null;
      signal.addEventListener("abort",abortFromParent,{once:true});
    }
    const timer=window.setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch("/api/word-details?word="+encodeURIComponent(clean)+"&mode=details",{signal:controller.signal});
      if(!response.ok)return null;
      const data=await response.json();
      if(typeof data?.fullDefinition!=="string")return null;
      return{
        word:clean,
        originalDefinition:typeof data.originalDefinition==="string"?data.originalDefinition:data.fullDefinition,
        fullDefinition:data.fullDefinition,
        simpleDefinition:typeof data.simpleDefinition==="string"?data.simpleDefinition:"",
        synonyms:Array.isArray(data.synonyms)?data.synonyms.filter((value:any):value is string=>typeof value==="string"):[],
        antonyms:Array.isArray(data.antonyms)?data.antonyms.filter((value:any):value is string=>typeof value==="string"):[],
        examples:Array.isArray(data.examples)?data.examples.filter((value:any):value is string=>typeof value==="string").slice(0,2):[],
        alternateOf:typeof data.alternateOf==="string"?data.alternateOf:null,
        alternateOfType:typeof data.alternateOfType==="string"?data.alternateOfType:null,
        alternateOfDefinition:typeof data.alternateOfDefinition==="string"?data.alternateOfDefinition:null,
        alternateOfSimpleDefinition:typeof data.alternateOfSimpleDefinition==="string"?data.alternateOfSimpleDefinition:null
      };
    }finally{
      window.clearTimeout(timer);
      signal?.removeEventListener("abort",abortFromParent);
    }
  }catch{
    return null;
  }
}

export async function fetchPracticeBatch(
  shownWords:Set<string>,
  blockedWords:Set<string>,
  signal?:AbortSignal
):Promise<PracticeWord[]>{
  try{
    const candidates=await fetchRandomCandidates(signal);
    const unique=[...new Set(candidates)].filter(word=>!blockedWords.has(word));
    const selected=unique.slice(0,10);

    const results:PracticeWord[]=[];
    for(let start=0;start<selected.length;start+=3){
      const group=selected.slice(start,start+3);
      const chunk=await Promise.all(
        group.map(async word=>({
          word,
          definition:await fetchWordDefinition(word,signal),
          isNew:!shownWords.has(word)
        }))
      );
      results.push(...chunk);
      if(signal?.aborted)break;
    }
    return results;
  }catch{
    return [];
  }
}
