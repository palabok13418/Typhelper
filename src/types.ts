export type GazeState="screen"|"keyboard"|"unknown";
export type SkillMap=Record<string,{mistakes:number;attempts:number;lastSeen:number}>;
export interface TypingStats{wpm:number;accuracy:number;consistency:number;backspaceRate:number;errorRate:number;avgLatencyMs:number;latencyJitter:number}
export interface QuizResult{id:string;createdAt:number;score:number;stats:TypingStats;focusPauses:number;sentenceScore?:number;challengeWord?:string}
export interface Progress{version:1;activeSeconds:number;totalPracticeWords:number;bestScore:number;skillMap:SkillMap;history:QuizResult[]}