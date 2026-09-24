export async function quietlyRefineProfile(summary:string){
  if(!("gpu" in navigator))return null;
  try{
    const w:any=await import("@mlc-ai/web-llm");
    const list=w.prebuiltAppConfig?.model_list??[];
    const model=list.find((m:any)=>/Qwen2\.5-7B-Instruct-q4f16_1-MLC/i.test(m.model_id))??list.find((m:any)=>/Qwen2\.5-3B-Instruct-q4f16_1-MLC/i.test(m.model_id));
    if(!model)return null;
    const engine=await w.CreateMLCEngine(model.model_id);
    const result=await engine.chat.completions.create({
      messages:[
        {role:"system",content:"You are a local typing training model. Analyze aggregate metrics only. Return compact JSON with focusKeys and difficulty."},
        {role:"user",content:summary}
      ],
      temperature:.1,max_tokens:90
    });
    const raw=result.choices?.[0]?.message?.content;
    if(typeof raw==="string"){localStorage.setItem("typing-pro-model-profile",raw);return raw}
    return null;
  }catch{return null}
}