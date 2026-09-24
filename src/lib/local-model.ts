import{probeDeviceRuntime}from"./device-runtime";
import{refineProfileInCloud}from"./cloud-model";
import type{PerformanceMode}from"./performance";

let localEnginePromise:Promise<any|null>|null=null;
let balancedRefinementCount=0;

function storeResult(result:string){
  try{localStorage.setItem("typing-pro-model-profile",result)}catch{}
}

async function getLocalEngine(){
  if(localEnginePromise)return localEnginePromise;
  localEnginePromise=(async()=>{
    try{
      const w:any=await import("@mlc-ai/web-llm");
      const list=w.prebuiltAppConfig?.model_list??[];
      const model=
        list.find((m:any)=>/Qwen2\.5-1\.5B-Instruct/i.test(m.model_id))??
        list.find((m:any)=>/Qwen2\.5-3B-Instruct-q4f16_1-MLC/i.test(m.model_id));
      if(!model)return null;
      return await w.CreateMLCEngine(model.model_id);
    }catch{
      return null;
    }
  })();
  return localEnginePromise;
}

async function refineLocally(summary:string){
  const engine=await getLocalEngine();
  if(!engine)return null;
  try{
    const result=await engine.chat.completions.create({
      messages:[
        {role:"system",content:"You are Typing-Pro's local typing-training model. Analyze aggregate typing metrics only. Return compact JSON with focusKeys and difficulty."},
        {role:"user",content:summary}
      ],
      temperature:.1,
      max_tokens:90
    });
    const raw=result?.choices?.[0]?.message?.content;
    if(typeof raw==="string"){
      storeResult(raw);
      return raw;
    }
  }catch{}
  return null;
}

export async function quietlyRefineProfile(summary:string,mode:PerformanceMode="low"){
  const profile=await probeDeviceRuntime(mode);

  if(mode==="low"){
    const result=await refineProfileInCloud(summary);
    return{profile,backend:"cloud" as const,result};
  }

  balancedRefinementCount+=1;
  const useDevice=mode==="max"||(mode==="balanced"&&balancedRefinementCount%10>=7);

  if(useDevice&&profile.localModelAllowed){
    const result=await refineLocally(summary);
    if(typeof result==="string"){
      return{profile,backend:profile.preferredBackend,result};
    }
  }

  const result=await refineProfileInCloud(summary);
  return{profile,backend:"cloud" as const,result};
}
