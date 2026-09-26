export type MilestoneType="words"|"wpm";

export interface Milestone{
  id:string;
  type:MilestoneType;
  value:number;
  title:string;
  description:string;
}

export const MILESTONES:Milestone[]=[
  {id:"words-10",type:"words",value:10,title:"First 10",description:"You completed your first ten practice words."},
  {id:"words-50",type:"words",value:50,title:"Getting moving",description:"50 words typed with intention."},
  {id:"words-100",type:"words",value:100,title:"Century",description:"100 practice words completed."},
  {id:"words-250",type:"words",value:250,title:"Quarter grand",description:"250 practice words completed."},
  {id:"words-500",type:"words",value:500,title:"Half thousand",description:"500 practice words completed."},
  {id:"words-1000",type:"words",value:1000,title:"Four digits",description:"1,000 practice words completed."},
  {id:"words-2500",type:"words",value:2500,title:"Typing regular",description:"2,500 practice words completed."},
  {id:"words-5000",type:"words",value:5000,title:"Five thousand",description:"5,000 practice words completed."},
  {id:"wpm-20",type:"wpm",value:20,title:"20 WPM",description:"You reached 20 words per minute."},
  {id:"wpm-30",type:"wpm",value:30,title:"30 WPM",description:"You reached 30 words per minute."},
  {id:"wpm-40",type:"wpm",value:40,title:"40 WPM",description:"You reached 40 words per minute."},
  {id:"wpm-50",type:"wpm",value:50,title:"50 WPM",description:"You reached 50 words per minute."},
  {id:"wpm-60",type:"wpm",value:60,title:"60 WPM",description:"You reached 60 words per minute."},
  {id:"wpm-75",type:"wpm",value:75,title:"75 WPM",description:"You reached 75 words per minute."},
  {id:"wpm-100",type:"wpm",value:100,title:"100 WPM",description:"You reached 100 words per minute."},
  {id:"wpm-120",type:"wpm",value:120,title:"120 WPM",description:"You reached 120 words per minute."}
];

export function nextMilestone(type:MilestoneType,value:number){
  return MILESTONES.find(item=>item.type===type&&item.value>value)??null;
}

export function milestoneProgress(type:MilestoneType,value:number){
  const next=nextMilestone(type,value);
  if(!next){
    const last=[...MILESTONES].reverse().find(item=>item.type===type);
    return{next:null,percent:100,remaining:0,previous:last?.value??value};
  }
  const previous=[...MILESTONES].reverse().find(item=>item.type===type&&item.value<=value)?.value??0;
  const percent=Math.round(((value-previous)/Math.max(1,next.value-previous))*100);
  return{next,percent:Math.max(0,Math.min(100,percent)),remaining:Math.max(0,next.value-value),previous};
}

export function crossedMilestones(previousWords:number,currentWords:number,previousWpm:number,currentWpm:number){
  return MILESTONES.filter(item=>{
    const before=item.type==="words"?previousWords:previousWpm;
    const after=item.type==="words"?currentWords:currentWpm;
    return before<item.value&&after>=item.value;
  });
}

export function milestoneShareText(milestone:Milestone,username?:string|null){
  const prefix=username?username+" just reached ":"I just reached ";
  return prefix+milestone.title+" on Typhelper. "+milestone.description;
}

export async function shareMilestone(milestone:Milestone,username?:string|null){
  const text=milestoneShareText(milestone,username);
  if(typeof navigator!=="undefined"&&typeof navigator.share==="function"){
    await navigator.share({title:"Typhelper milestone",text,url:window.location.origin});
    return"shared" as const;
  }
  if(typeof navigator!=="undefined"&&navigator.clipboard){
    await navigator.clipboard.writeText(text+" "+window.location.origin);
    return"copied" as const;
  }
  return"unavailable" as const;
}
