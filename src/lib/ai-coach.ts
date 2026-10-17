import { probeDeviceRuntime } from "./device-runtime";
import { getComputePolicy } from "./compute-policy";
import type { PerformanceMode } from "./performance";

export interface QuizAiResult{score:number;tips:string[];summary:string;backend:"cloud"|"local"|"fallback"}
export interface PracticeAiResult{recommendedWords:string[];focusKeys:string[];tips:string[];backend:"cloud"|"local"}
const WORD_BANK="after again almost around because before better between bring build change clear close common complete create different early easy every example focus friend future great group happy help house keyboard learn little local machine memory model morning natural people practice privacy progress quick quiet ready reason right screen simple skill slow small smooth space strong system teach thing think through today together typing until value video watch welcome while window world write".split(" ");
let localEnginePromise:Promise<any|null>|null=null;
let analysisCount=0;
async function getLocalEngine(){
  if(localEnginePromise)return localEnginePromise;
  localEnginePromise=(async()=>{
    try{
      const w:any=await import("@mlc-ai/web-llm");
      const list=w.prebuiltAppConfig?.model_list??[];
      const model=list.find((m:any)=>/Qwen2\.5-1\.5B-Instruct/i.test(m.model_id))??list.find((m:any)=>/Qwen2\.5-3B-Instruct-q4f16_1-MLC/i.test(m.model_id))??list.find((m:any)=>/Qwen/i.test(m.model_id));
      if(!model)return null;
      return await w.CreateMLCEngine(model.model_id);
    }catch{return null}
  })();
  return localEnginePromise;
}
async function localJson(system:string,prompt:string){
  const engine=await getLocalEngine();
  if(!engine)return null;
  try{
    const result=await engine.chat.completions.create({messages:[{role:"system",content:system},{role:"user",content:prompt}],temperature:.15,max_tokens:220});
    const raw=result?.choices?.[0]?.message?.content;
    if(typeof raw!=="string")return null;
    const fence=String.fromCharCode(96,96,96);
    const cleaned=raw.replace(new RegExp("^"+fence+"json\\s*","i"),"").replace(new RegExp("^"+fence+"\\s*"),"").replace(new RegExp("\\s*"+fence+"$"),"").trim();
    return JSON.parse(cleaned);
  }catch{return null}
}
function shouldUseLocal(mode:PerformanceMode,allowed:boolean){
  analysisCount+=1;
  if(getComputePolicy()==="mac-local")return allowed;
  // For non-M2+ clients, local inference handles roughly 30% of eligible
  // requests while the server handles the remaining 70%.
  return allowed&&mode!=="low"&&analysisCount%10<3;
}
function stringArray(values:unknown,limit:number){return Array.isArray(values)?values.map(v=>typeof v==="string"?v.trim():String(v??"").trim()).filter((v):v is string=>Boolean(v)).slice(0,limit):[];}
async function cloud(kind:"quiz"|"practice",payload:unknown){
  try{const response=await fetch("/api/ml/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind,...(payload as Record<string,unknown>)})});if(!response.ok)return null;return await response.json();}catch{return null}
}
export async function analyzeQuiz(payload:{stats:Record<string,unknown>;focusPauses:number;target:string;answer:string},mode:PerformanceMode):Promise<QuizAiResult>{
  const policy=getComputePolicy();
  const profile=await probeDeviceRuntime(policy==="mac-local"?"max":mode);
  if(shouldUseLocal(mode,profile.localModelAllowed)){
    const result=await localJson("You are Typhelper's local touch-typing coach. Analyze aggregate check-in metrics only. Return JSON {score:number,tips:string[],summary:string}. Score 0-100 and give 2-4 specific improvements.","Stats: "+JSON.stringify(payload.stats)+" Focus pauses: "+payload.focusPauses+" Target length: "+payload.target.length+" Answer length: "+payload.answer.length);
    if(result&&typeof result.score==="number")return{score:Math.max(0,Math.min(100,Math.round(result.score))),tips:Array.isArray(result.tips)?result.tips.map((v:any)=>String(v||"").trim()).filter(Boolean).slice(0,4):[],summary:typeof result.summary==="string"?result.summary.trim():"",backend:"local"};
  }
  if(policy==="mac-local")return{score:0,tips:[],summary:"Local AI is unavailable on this Mac right now.",backend:"fallback"};
  const result=await cloud("quiz",payload);
  if(result&&typeof result.score==="number")return{score:Math.max(0,Math.min(100,Math.round(result.score))),tips:Array.isArray(result.tips)?result.tips.map((v:any)=>String(v||"").trim()).filter(Boolean).slice(0,4):[],summary:typeof result.summary==="string"?result.summary.trim():"",backend:"cloud"};
  return{score:0,tips:[],summary:"",backend:"fallback"};
}
export async function analyzePractice(skills:Record<string,unknown>,recent:Array<{word:string;correct:boolean;duration:number}>,mode:PerformanceMode):Promise<PracticeAiResult|null>{
  const policy=getComputePolicy();
  const profile=await probeDeviceRuntime(policy==="mac-local"?"max":mode);
  if(shouldUseLocal(mode,profile.localModelAllowed)){
    const result=await localJson("You are Typhelper's local adaptive typing coach. Analyze aggregate typing outcomes only. Choose recommended words only from the supplied word bank. Return JSON {recommendedWords:string[],focusKeys:string[],tips:string[]}.","Word bank: "+WORD_BANK.join(", ")+" Skill map: "+JSON.stringify(skills).slice(0,5000)+" Recent outcomes: "+JSON.stringify(recent).slice(-5000));
    const words=stringArray(result?.recommendedWords,8).map(v=>v.toLowerCase()).filter(v=>WORD_BANK.includes(v));
    if(words.length)return{recommendedWords:[...new Set(words)],focusKeys:stringArray(result?.focusKeys,8),tips:stringArray(result?.tips,4),backend:"local"};
  }
  if(policy==="mac-local")return null;
  const result=await cloud("practice",{skills,recent});
  if(!result)return null;
  const words=stringArray(result.recommendedWords,8).map(v=>v.toLowerCase()).filter(v=>WORD_BANK.includes(v));
  return{recommendedWords:[...new Set(words)],focusKeys:stringArray(result.focusKeys,8),tips:stringArray(result.tips,4),backend:"cloud"};
}