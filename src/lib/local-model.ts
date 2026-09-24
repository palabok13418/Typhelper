import{probeDeviceRuntime}from"./device-runtime";
import{refineProfileInCloud}from"./cloud-model";

export async function quietlyRefineProfile(summary:string){
  const profile=await probeDeviceRuntime();
  if(!profile.localModelAllowed){
    const result=await refineProfileInCloud(summary);
    return{profile,backend:"cloud",result};
  }

  try{
    const w:any=await import("@mlc-ai/web-llm");
    const list=w.prebuiltAppConfig?.model_list??[];
    const model=list.find((m:any)=>/Qwen2\.5-7B-Instruct-q4f16_1-MLC/i.test(m.model_id))??list.find((m:any)=>/Qwen2\.5-3B-Instruct-q4f16_1-MLC/i.test(m.model_id));
    if(!model)return{profile,backend:profile.preferredBackend,result:null};
    const engine=await w.CreateMLCEngine(model.model_id);
    const result=await engine.chat.completions.create({
      messages:[
        {role:"system",content:"You are a local typing training model. Analyze aggregate metrics only. Return compact JSON with focusKeys and difficulty."},
        {role:"user",content:summary}
      ],
      temperature:.1,max_tokens:90
    });
    const raw=result.choices?.[0]?.message?.content;
    if(typeof raw==="string"){localStorage.setItem("typing-pro-model-profile",raw);return{profile,backend:profile.preferredBackend,result:raw}}
    return{profile,backend:profile.preferredBackend,result:null};
  }catch{return{profile,backend:profile.preferredBackend,result:null}}
}
