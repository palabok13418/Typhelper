import{probeDeviceRuntime,type DeviceRuntimeProfile}from"./device-runtime";
import{refineProfileInCloud}from"./cloud-model";

type LocalEngine={chat:{completions:{create:(input:any)=>Promise<any>}};unload?:()=>Promise<void>|void};

const MODEL_BUDGET_MB=512;
const PRESSURE_RATIO=.85;

function parseMemoryMB(){
  const memory=(performance as any).memory;
  if(!memory||typeof memory.usedJSHeapSize!=="number"||typeof memory.jsHeapSizeLimit!=="number")return null;
  return{
    used:memory.usedJSHeapSize/1048576,
    limit:memory.jsHeapSizeLimit/1048576
  };
}

function memoryPressure(){
  const memory=parseMemoryMB();
  if(!memory)return false;
  return memory.used>=memory.limit*PRESSURE_RATIO;
}

function modelLooksSmallEnough(model:any){
  const id=String(model?.model_id??"");
  // Prefer genuinely small models. A 3B/7B model is deliberately rejected by the
  // browser safety gate because its real runtime footprint can be much larger than
  // the quantized weight file.
  return/(360M|0\.5B|135M).*q4f16_1-MLC/i.test(id);
}

function chooseSmallModel(list:any[]){
  return list.filter(modelLooksSmallEnough).sort((a:any,b:any)=>{
    const sa=String(a.model_id).match(/(\\d+(?:\\.\\d+)?)(B|M)/i);
    const sb=String(b.model_id).match(/(\\d+(?:\\.\\d+)?)(B|M)/i);
    const av=sa?(Number(sa[1])*(sa[2].toUpperCase()==="B"?1000:1)):99999;
    const bv=sb?(Number(sb[1])*(sb[2].toUpperCase()==="B"?1000:1)):99999;
    return av-bv;
  })[0]??null;
}

async function cloud(summary:string,profile:DeviceRuntimeProfile){
  const result=await refineProfileInCloud(summary);
  return{profile,backend:"cloud" as const,result};
}

export async function quietlyRefineProfile(summary:string){
  const profile=await probeDeviceRuntime();

  // Never import WebLLM unless the preflight says the browser has enough headroom.
  if(!profile.localModelAllowed||profile.modelBudgetMB<MODEL_BUDGET_MB){
    return cloud(summary,profile);
  }

  let engine:LocalEngine|null=null;
  try{
    const w:any=await import("@mlc-ai/web-llm");
    const list=w.prebuiltAppConfig?.model_list??[];
    const model=chooseSmallModel(list);
    if(!model)return cloud(summary,profile);

    engine=await w.CreateMLCEngine(model.model_id);
    if(memoryPressure()){
      await engine.unload?.();
      return cloud(summary,profile);
    }

    const result=await engine.chat.completions.create({
      messages:[
        {role:"system",content:"You are a local typing training model. Analyze aggregate metrics only. Return compact JSON with focusKeys and difficulty."},
        {role:"user",content:summary}
      ],
      temperature:.1,
      max_tokens:90
    });

    if(memoryPressure()){
      await engine.unload?.();
      return cloud(summary,profile);
    }

    const raw=result.choices?.[0]?.message?.content;
    if(typeof raw==="string"){
      localStorage.setItem("typing-pro-model-profile",raw);
      await engine.unload?.();
      return{profile,backend:profile.preferredBackend,result:raw};
    }

    await engine.unload?.();
    return cloud(summary,profile);
  }catch{
    try{await engine?.unload?.()}catch{}
    return cloud(summary,profile);
  }
}
