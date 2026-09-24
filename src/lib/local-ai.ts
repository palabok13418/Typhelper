export async function coach(
  prompt:string,
  onProgress:(text:string)=>void
):Promise<string|null>{
  if(!("gpu" in navigator))return null;
  try{
    const w:any=await import("@mlc-ai/web-llm");
    const list=w.prebuiltAppConfig?.model_list??[];
    const preferred=list.find((m:any)=>/Qwen2\.5-7B-Instruct-q4f16_1-MLC/i.test(m.model_id))
      ??list.find((m:any)=>/Qwen2\.5-3B-Instruct-q4f16_1-MLC/i.test(m.model_id))
      ??list.find((m:any)=>/Qwen/i.test(m.model_id));
    if(!preferred)return null;
    onProgress("loading "+preferred.model_id+" locally…");
    const engine=await w.CreateMLCEngine(preferred.model_id,{initProgressCallback:(r:any)=>r?.text&&onProgress(r.text)});
    const out=await engine.chat.completions.create({
      messages:[
        {role:"system",content:"You are an expert touch-typing coach. Be concise. Return exactly 3 practical suggestions and 1 next-session goal. No generic hype."},
        {role:"user",content:prompt}
      ],
      temperature:.25,max_tokens:180
    });
    return out.choices?.[0]?.message?.content?.trim()??null;
  }catch{return null}
}