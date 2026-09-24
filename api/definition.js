const PRIMARY_TIMEOUT_MS=3500;
const WIKTIONARY_TIMEOUT_MS=2500;
const FALLBACK_TIMEOUT_MS=2500;

async function fetchWithTimeout(url,options={},timeoutMs=3000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(url,{...options,signal:controller.signal});
  }finally{
    clearTimeout(timer);
  }
}

function extractDictionaryDefinition(data){
  if(!Array.isArray(data))return null;
  const definition=data
    .flatMap(entry=>Array.isArray(entry?.meanings)?entry.meanings:[])
    .flatMap(meaning=>Array.isArray(meaning?.definitions)?meaning.definitions:[])
    .map(item=>typeof item?.definition==="string"?item.definition.trim():"")
    .find(Boolean);
  return definition||null;
}

function stripMarkup(value){
  return value
    .replace(/<[^>]*>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/\s+/g," ")
    .trim();
}

function extractWiktionaryDefinition(data){
  const groups=Array.isArray(data?.en)?data.en:[];
  const definition=groups
    .filter(item=>item?.language==="English"||item?.language==="en"||!item?.language)
    .flatMap(item=>Array.isArray(item?.definitions)?item.definitions:[])
    .map(item=>typeof item?.definition==="string"?stripMarkup(item.definition):"")
    .map(value=>value.replace(/^\s*[-–—]\s*/,"").trim())
    .find(Boolean);
  return definition||null;
}

function extractDatamuseDefinition(data,word){
  if(!Array.isArray(data))return null;
  const exact=data.find(item=>String(item?.word||"").toLowerCase()===word);
  const entry=exact??data[0];
  if(!Array.isArray(entry?.defs))return null;
  const definition=entry.defs
    .map(value=>String(value||"").replace(/^[a-z]+\t/i,"").trim())
    .find(Boolean);
  return definition||null;
}

function dictionaryResponse(word,definition){
  return[{
    word,
    meanings:[{
      definitions:[{definition}]
    }]
  }];
}

export default async function handler(request,response){
  const url=new URL(request.url,"http://localhost");
  const word=(url.searchParams.get("word")||"").trim().toLowerCase();

  if(!/^[a-z]+$/.test(word)){
    response.status(400).json({error:"A single English word is required."});
    return;
  }

  let primaryStatus=502;

  try{
    const upstream=await fetchWithTimeout(
      "https://api.dictionaryapi.dev/api/v2/entries/en/"+encodeURIComponent(word),
      {headers:{accept:"application/json"}},
      PRIMARY_TIMEOUT_MS
    );
    primaryStatus=upstream.status;
    if(upstream.ok){
      const data=await upstream.json().catch(()=>null);
      const definition=extractDictionaryDefinition(data);
      if(definition){
        response.setHeader("cache-control","public, s-maxage=86400, stale-while-revalidate=604800");
        response.status(200).json(dictionaryResponse(word,definition));
        return;
      }
    }
  }catch{
    primaryStatus=502;
  }

  try{
    const wiktionary=await fetchWithTimeout(
      "https://en.wiktionary.org/api/rest_v1/page/definition/"+encodeURIComponent(word)+"?redirect=true",
      {
        headers:{
          accept:"application/json",
          "user-agent":"Typhelper/0.2 (word-definition-lookup)"
        }
      },
      WIKTIONARY_TIMEOUT_MS
    );

    if(wiktionary.ok){
      const data=await wiktionary.json().catch(()=>null);
      const definition=extractWiktionaryDefinition(data);
      if(definition){
        response.setHeader("cache-control","public, s-maxage=86400, stale-while-revalidate=604800");
        response.status(200).json(dictionaryResponse(word,definition));
        return;
      }
    }
  }catch{
    // Continue to the Datamuse fallback.
  }

  try{
    const fallback=await fetchWithTimeout(
      "https://api.datamuse.com/words?sp="+encodeURIComponent(word)+"&md=d&max=5",
      {headers:{accept:"application/json"}},
      FALLBACK_TIMEOUT_MS
    );

    if(fallback.ok){
      const data=await fallback.json().catch(()=>null);
      const definition=extractDatamuseDefinition(data,word);
      if(definition){
        response.setHeader("cache-control","public, s-maxage=86400, stale-while-revalidate=604800");
        response.status(200).json(dictionaryResponse(word,definition));
        return;
      }
    }
  }catch{
    // Fall through to a fast, non-blocking failure response.
  }

  response.status(primaryStatus===404?404:502).json({
    error:"Dictionary service unavailable."
  });
}
