import type{SkillMap,TypingStats}from"../types";

const WORDS="after again almost around because before better between bring build change clear close common complete create different early easy every example focus friend future great group happy help house keyboard learn little local machine memory model morning natural people practice privacy progress quick quiet ready reason right screen simple skill slow small smooth space strong system teach thing think through today together typing until value video watch welcome while window world write".split(" ");

function weight(w:string,m:SkillMap){
  return[...w].reduce((s,c)=>s+.2+((m[c]?.mistakes||0)/Math.max(1,m[c]?.attempts||1))*3,0);
}

export function adaptive(m:SkillMap,n=24){
  return[...WORDS]
    .map(w=>({w,score:weight(w,m)+Math.random()*0.9}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,Math.min(n,WORDS.length))
    .map(item=>item.w);
}

export function randomWord(m:SkillMap,previous=""){
  const pool=adaptive(m,Math.min(22,WORDS.length)).filter(w=>w!==previous);
  const candidates=pool.length?pool:WORDS.filter(w=>w!==previous);
  return candidates[Math.floor(Math.random()*candidates.length)]??"type";
}

export const practiceText=(m:SkillMap)=>adaptive(m,24).join(" ");
export const quizText=(m:SkillMap)=>adaptive(m,44).join(" ");

export function learn(m:SkillMap,e:string,a:string):SkillMap{
  const n=structuredClone(m);
  for(let i=0;i<e.length;i++){
    const c=e[i].toLowerCase();
    if(c===" ")continue;
    const p=n[c]??{mistakes:0,attempts:0,lastSeen:0};
    p.attempts++;p.lastSeen=Date.now();
    if(a[i]?.toLowerCase()!==c)p.mistakes++;
    n[c]=p;
  }
  return n;
}

export function stats(e:string,a:string,secs:number,t:number[],bs:number):TypingStats{
  let ok=0,err=0;
  for(let i=0;i<a.length;i++)a[i]===e[i]?ok++:err++;
  const acc=a.length?ok/a.length:0;
  const d=t.slice(1).map((x,i)=>Math.max(1,x-t[i]));
  const avg=d.length?d.reduce((s,v)=>s+v,0)/d.length:0;
  const variance=d.length?d.reduce((s,v)=>s+(v-avg)**2,0)/d.length:0;
  return{wpm:(ok/5)/(Math.max(1,secs)/60),accuracy:acc,consistency:avg?Math.max(0,1-Math.sqrt(variance)/avg):0,backspaceRate:a.length?bs/a.length:1,errorRate:a.length?err/a.length:1,avgLatencyMs:avg,latencyJitter:avg?Math.min(1,Math.sqrt(variance)/avg):1};
}

export function features(s:TypingStats,focus:number){
  return[Math.max(0,Math.min(1,s.accuracy)),Math.min(1,s.wpm/75),s.consistency,Math.max(0,1-s.backspaceRate*1.35),Math.max(0,1-focus/6),Math.max(0,s.consistency*(1-s.latencyJitter*.35)),Math.max(0,1-Math.max(0,s.avgLatencyMs-85)/280),Math.max(0,1-s.errorRate*1.2)];
}
