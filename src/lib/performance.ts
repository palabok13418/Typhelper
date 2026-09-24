export type PerformanceMode="low"|"balanced"|"max";

const PERFORMANCE_MODE_KEY="typing-pro-performance-mode";

export function readPerformanceMode():PerformanceMode{
  try{
    const value=localStorage.getItem(PERFORMANCE_MODE_KEY);
    return value==="balanced"||value==="max"||value==="low"?value:"low";
  }catch{
    return"low";
  }
}

export function savePerformanceMode(mode:PerformanceMode){
  try{localStorage.setItem(PERFORMANCE_MODE_KEY,mode)}catch{}
}

export function performanceModeLabel(mode:PerformanceMode){
  if(mode==="balanced")return"70% cloud · 30% device";
  if(mode==="max")return"100% device";
  return"100% cloud";
}
