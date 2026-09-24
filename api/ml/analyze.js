const MODEL_TIMEOUT_MS=7000;
const WORD_BANK="after again almost around because before better between bring build change clear close common complete create different early easy every example focus friend future great group happy help house keyboard learn little local machine memory model morning natural people practice privacy progress quick quiet ready reason right screen simple skill slow small smooth space strong system teach thing think through today together typing until value video watch welcome while window world write".split(" ");
async function runGroq(prompt){
  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey)return null;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),MODEL_TIMEOUT_MS);
  try{
    const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+apiKey},body:JSON.stringify({model:process.env.GROQ_MODEL||"openai/gpt-oss-20b",messages:[{role:"system",content:"You are Typhelper's adaptive touch-typing coach. Analyze aggregate typing outcomes only. Never ask for raw keystroke streams, camera frames, or personal identifiers. Return JSON only."},{role:"user",content:prompt}],temperature:.2,max_completion_tokens:260}),signal:controller.signal});
    if(!response.ok)return null;
    const data=await response.json().catch(()=>null);
    const raw=data?.choices?.[0]?.message?.content;
    if(typeof raw!=="string")return null;
    const fence=String.fromCharCode(96,96,96);
    const cleaned=raw.replace(new RegExp("^"+fence+"json\\s*","i"),"").replace(new RegExp("^"+fence+"\\s*"),"").replace(new RegExp("\\s*"+fence+"$"),"").trim();
    return JSON.parse(cleaned);
  }catch{return null}finally{clearTimeout(timer);}
}
function cleanWords(values){
  return Array.isArray(values)?[...new Set(values.map(value=>String(value||"").trim().toLowerCase()).filter(value=>WORD_BANK.includes(value)))].slice(0,8):[];
}
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"method-not-allowed"});
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const kind=body.kind==="quiz"?"quiz":"practice";
    if(kind==="quiz"){
      const stats=body.stats&&typeof body.stats==="object"?body.stats:{};
      const target=typeof body.target==="string"?body.target.slice(0,1200):"";
      const answer=typeof body.answer==="string"?body.answer.slice(0,1200):"";
      const result=await runGroq("Analyze this completed typing check-in. Score the performance from 0 to 100 and give 2 to 4 specific improvements. Return {score:number,tips:string[],summary:string}. Stats: "+JSON.stringify(stats)+" Focus pauses: "+String(body.focusPauses||0)+" Target length: "+target.length+" Answer length: "+answer.length);
      if(!result||typeof result.score!=="number")return res.status(502).json({error:"ai-analysis-failed"});
      return res.status(200).json({score:Math.max(0,Math.min(100,Math.round(result.score))),tips:Array.isArray(result.tips)?result.tips.map(v=>String(v||"").trim()).filter(Boolean).slice(0,4):[],summary:typeof result.summary==="string"?result.summary.trim():""});
    }
    const skills=body.skills&&typeof body.skills==="object"?body.skills:{};
    const recent=Array.isArray(body.recent)?body.recent.slice(-30):[];
    const result=await runGroq("Analyze these aggregate touch-typing outcomes and choose the next words the user should practice. Return {recommendedWords:string[],focusKeys:string[],tips:string[]}. recommendedWords MUST come only from this word bank: "+WORD_BANK.join(", ")+" Skill map: "+JSON.stringify(skills).slice(0,5000)+" Recent outcomes: "+JSON.stringify(recent).slice(0,5000));
    if(!result)return res.status(502).json({error:"ai-analysis-failed"});
    return res.status(200).json({recommendedWords:cleanWords(result.recommendedWords),focusKeys:Array.isArray(result.focusKeys)?[...new Set(result.focusKeys.map(v=>String(v||"").trim().toLowerCase()).filter(v=>/^[a-z]$/.test(v)))].slice(0,8):[],tips:Array.isArray(result.tips)?result.tips.map(v=>String(v||"").trim()).filter(Boolean).slice(0,4):[]});
  }catch{return res.status(502).json({error:"ai-analysis-failed"});}
}