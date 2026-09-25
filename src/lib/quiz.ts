import type{SkillMap,TypingStats}from"../types";
import {adaptive,stats}from"./typing";

export interface SentenceChallengeScore{
  score:number;
  usesWord:boolean;
  wordCount:number;
  hasPunctuation:boolean;
  originality:number;
  tips:string[];
}

export interface ChallengeWord{
  word:string;
  definition:string;
  synonyms:string[];
}

export interface QuizScore{
  score:number;
  stats:TypingStats;
  focusPauses:number;
  target:string;
  answer:string;
  tips:string[];
  backend:string;
  sentenceScore?:number;
  challengeWord?:string;
}

const QUIZ_SENTENCE_KEY="typhelper-quiz-sentences-v1";
const CHALLENGE_SEEN_KEY="typhelper-challenge-words-v1";

const SENTENCE_ANCHORS=[
  {key:"accuracy",phrase:"accuracy"},
  {key:"control",phrase:"keyboard control"},
  {key:"focus",phrase:"screen focus"},
  {key:"keyboard",phrase:"keyboard habits"},
  {key:"memory",phrase:"typing memory"},
  {key:"practice",phrase:"practice rhythm"},
  {key:"progress",phrase:"steady progress"},
  {key:"rhythm",phrase:"typing rhythm"},
  {key:"screen",phrase:"screen focus"},
  {key:"skill",phrase:"typing skill"},
  {key:"speed",phrase:"speed control"},
  {key:"typing",phrase:"typing technique"}
];

const SENTENCE_TEMPLATES:Array<(anchor:string)=>string>=[
  anchor=>"A steady routine builds stronger "+anchor+" when practice stays consistent.",
  anchor=>"Careful repetition helps turn "+anchor+" into a reliable part of the typing process.",
  anchor=>"A focused learner can improve "+anchor+" by slowing down before increasing speed.",
  anchor=>"Small daily sessions make it easier to protect "+anchor+" during difficult passages.",
  anchor=>"Patient practice gives "+anchor+" time to become automatic instead of rushed.",
  anchor=>"A calm workspace helps a typist maintain "+anchor+" during a longer session.",
  anchor=>"Good posture and a steady pace can support "+anchor+" throughout a practice session.",
  anchor=>"When mistakes appear, reviewing "+anchor+" can reveal which habits need more attention.",
  anchor=>"Strong keyboard habits make "+anchor+" easier to maintain when the work becomes demanding.",
  anchor=>"Quiet concentration helps preserve "+anchor+" when a sentence becomes unfamiliar.",
  anchor=>"Better "+anchor+" usually comes from deliberate practice rather than frantic corrections.",
  anchor=>"The trainer uses repetition to strengthen "+anchor+" without forcing an unnatural pace."
];

const CHALLENGE_BANK:ChallengeWord[]=[
  {word:"meticulous",definition:"Very careful and precise about details.",synonyms:["careful","thorough","precise"]},
  {word:"ephemeral",definition:"Lasting for only a short time.",synonyms:["brief","fleeting","temporary"]},
  {word:"pragmatic",definition:"Focused on practical results and what actually works.",synonyms:["practical","realistic","sensible"]},
  {word:"resilient",definition:"Able to recover or adapt after difficulty.",synonyms:["tough","adaptable","strong"]},
  {word:"ambiguous",definition:"Open to more than one possible meaning or interpretation.",synonyms:["unclear","uncertain","vague"]},
  {word:"benevolent",definition:"Kind, generous, and well meaning.",synonyms:["kind","charitable","generous"]},
  {word:"articulate",definition:"Able to express ideas clearly and effectively.",synonyms:["eloquent","expressive","clear"]},
  {word:"scrutinize",definition:"To examine something very carefully.",synonyms:["inspect","examine","analyze"]},
  {word:"tenacious",definition:"Persistent and unwilling to give up easily.",synonyms:["persistent","determined","resolute"]},
  {word:"ubiquitous",definition:"Present, appearing, or found almost everywhere.",synonyms:["widespread","pervasive","universal"]},
  {word:"candid",definition:"Honest and direct, without hiding what you think.",synonyms:["frank","honest","open"]},
  {word:"conundrum",definition:"A difficult problem with no obvious answer.",synonyms:["puzzle","dilemma","quandary"]},
  {word:"intricate",definition:"Containing many connected or complicated details.",synonyms:["complex","complicated","elaborate"]},
  {word:"versatile",definition:"Able to adapt easily to different uses or situations.",synonyms:["adaptable","flexible","all-purpose"]},
  {word:"formidable",definition:"Very difficult to deal with, defeat, or overcome.",synonyms:["daunting","challenging","intimidating"]},
  {word:"serendipity",definition:"A fortunate discovery made by chance.",synonyms:["chance","luck","coincidence"]},
  {word:"nostalgia",definition:"A warm or bittersweet feeling about the past.",synonyms:["reminiscence","longing","sentimentality"]},
  {word:"obsolete",definition:"No longer useful because something newer has replaced it.",synonyms:["outdated","old-fashioned","superseded"]},
  {word:"impartial",definition:"Treating different people or sides fairly without favoring one.",synonyms:["neutral","fair","unbiased"]},
  {word:"inevitable",definition:"Certain to happen and impossible to avoid.",synonyms:["unavoidable","certain","inescapable"]}
];

export function createQuiz(skillMap:SkillMap){
  const adaptiveWords=adaptive(skillMap,20);
  const preferred=SENTENCE_ANCHORS
    .filter(item=>adaptiveWords.includes(item.key))
    .map(item=>item.phrase);

  const anchors=preferred.length?preferred:SENTENCE_ANCHORS.map(item=>item.phrase);
  const used=readStringSet(QUIZ_SENTENCE_KEY);

  let candidate="";
  for(let attempt=0;attempt<80;attempt++){
    const template=SENTENCE_TEMPLATES[Math.floor(Math.random()*SENTENCE_TEMPLATES.length)];
    const anchor=anchors[Math.floor(Math.random()*anchors.length)];
    candidate=template(anchor);
    if(!used.has(candidate))break;
  }

  if(!candidate)candidate=SENTENCE_TEMPLATES[0](anchors[0]);
  rememberString(QUIZ_SENTENCE_KEY,candidate,200);
  return candidate;
}

export function nextChallengeWord():ChallengeWord{
  const seen=readStringSet(CHALLENGE_SEEN_KEY);
  const available=CHALLENGE_BANK.filter(item=>!seen.has(item.word));
  const pool=available.length?available:CHALLENGE_BANK;
  const chosen=pool[Math.floor(Math.random()*pool.length)]??CHALLENGE_BANK[0];
  rememberString(CHALLENGE_SEEN_KEY,chosen.word,CHALLENGE_BANK.length);
  return chosen;
}

export function scoreSentenceChallenge(word:string,answer:string,definition:string="",synonyms:string[]=[]):SentenceChallengeScore{
  const cleanAnswer=answer.trim();
  const tokens=tokenize(cleanAnswer);
  const target=word.trim().toLowerCase();
  const usesWord=tokens.includes(target);
  const wordCount=tokens.length;
  const hasPunctuation=/[.!?]\s*$/.test(cleanAnswer);
  const startsCapital=Boolean(cleanAnswer&&/^[A-Z]/.test(cleanAnswer));
  const endings=(cleanAnswer.match(/[.!?]+(?=\s|$)/g)||[]).length;

  const definitionWords=[...new Set(tokenize(definition)
    .filter(item=>item!==target&&!STOPWORDS.has(item)))];
  const answerSet=new Set(tokens);
  const copied=definitionWords.filter(item=>answerSet.has(item)).length;
  const originality=definitionWords.length
    ?clamp(1-copied/Math.max(2,Math.min(6,definitionWords.length)),0,1)
    :1;

  const lengthScore=wordCount>=60&&wordCount<=220?25:wordCount>=50?18:wordCount>220?12:0;
  const score=Math.round(clamp(
    (usesWord?30:0)+
    lengthScore+
    (hasPunctuation?8:0)+
    (startsCapital?4:0)+
    (originality*28)+
    (endings===1?5:endings>=2?3:0),
    0,
    100
  ));

  const tips:string[]=[];
  if(!usesWord)tips.push("use the challenge word exactly in your sentence");
  if(wordCount<50)tips.push("write a full paragraph with at least 50 words");
  if(!hasPunctuation)tips.push("finish the sentence with punctuation");
  if(originality<.55)tips.push("use your own phrasing instead of copying the definition");
  if(!tips.length)tips.push("good application of the new word in an original sentence");

  return{score,usesWord,wordCount,hasPunctuation,originality,tips:tips.slice(0,3)};
}

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

const STOPWORDS=new Set("a an the and or but if then than of in on at to for from with without is are was were be been being this that these those very more most only just into over as by it its they their you your can could should would will has have had do does did about through during after before".split(" "));

function tokenize(value:string):string[]{
  const matches=value.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g);
  return matches?Array.from(matches):[];
}

function readStringSet(key:string){
  if(typeof localStorage==="undefined")return new Set<string>();
  try{
    const raw=localStorage.getItem(key);
    const parsed=JSON.parse(raw||"[]");
    return new Set<string>(Array.isArray(parsed)?parsed.filter((value):value is string=>typeof value==="string"):[]);
  }catch{
    return new Set<string>();
  }
}

function rememberString(key:string,value:string,limit:number){
  if(typeof localStorage==="undefined")return;
  try{
    const set=readStringSet(key);
    set.add(value);
    localStorage.setItem(key,JSON.stringify([...set].slice(-limit)));
  }catch{}
}

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}
