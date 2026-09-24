import type{SkillMap,TypingStats}from"../types";
import {adaptive,stats}from"./typing";
export interface QuizScore{score:number;stats:TypingStats;focusPauses:number;target:string;answer:string;tips:string[];backend:string}
export function createQuiz(skillMap:SkillMap){return adaptive(skillMap,34).join(" ")}
export function scoreQuiz(target:string,answer:string,startedAt:number,timestamps:number[],backspaces:number,focusPauses:number):QuizScore{
  const s=stats(target,answer,Math.max(1,(Date.now()-startedAt)/1000),timestamps,backspaces);
  const speed=Math.min(1,s.wpm/70),accuracy=s.accuracy,consistency=s.consistency;
  const correction=Math.max(0,1-s.backspaceRate*1.4),focus=Math.max(0,1-focusPauses/6);
  const base=accuracy*.46+speed*.18+consistency*.13+correction*.08+focus*.15;
  const score=Math.round(Math.max(0,Math.min(100,base*100)));
  const tips:string[]=[];
  if(accuracy<.9)tips.push("clean up accuracy before pushing speed");
  if(s.wpm<35)tips.push("keep a steady rhythm instead of rushing individual keys");
  if(consistency<.72)tips.push("keep your key-to-key timing more even");
  if(s.backspaceRate>.08)tips.push("reduce correction loops by slowing down slightly");
  if(focusPauses>0)tips.push("keep your eyes on the screen during check-ins");
  if(!tips.length)tips.push("your control is stable, so the next step is adding speed");
  return{score,stats:s,focusPauses,target,answer,tips:tips.slice(0,4),backend:"WebNN/local"};
}