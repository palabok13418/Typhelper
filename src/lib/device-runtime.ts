export type DeviceClass="desktop"|"laptop"|"tablet"|"phone"|"unknown";
export type RuntimeBackend="webnn"|"webgpu"|"wasm"|"cloud";

export interface DeviceRuntimeProfile{
  deviceClass:DeviceClass;
  platform:string;
  architecture:string;
  logicalCores:number|null;
  memoryGB:number|null;
  webnn:boolean;
  webgpu:boolean;
  wasm:boolean;
  gpuName:string|null;
  benchmarkMs:number|null;
  preferredBackend:RuntimeBackend;
  localModelAllowed:boolean;
  confidence:number;
}

function getDeviceClass():DeviceClass{
  const ua=navigator.userAgent||"";
  const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if(!mobile)return/Windows|Macintosh|Linux|X11/i.test(ua)?"desktop":"unknown";
  return/iPad|Tablet/i.test(ua)?"tablet":/Android|iPhone|iPod/i.test(ua)?"phone":"unknown";
}

async function probeWebGPU(){
  const gpu=(navigator as any).gpu;
  if(!gpu)return{available:false,name:null as string|null};
  try{
    const adapter=await gpu.requestAdapter({powerPreference:"high-performance"});
    if(!adapter)return{available:false,name:null as string|null};
    const info=adapter.info??{};
    const name=[info.vendor,info.architecture,info.device,info.description].filter(Boolean).join(" / ")||null;
    return{available:true,name};
  }catch{return{available:false,name:null as string|null}}
}

async function tinyBenchmark(){
  const start=performance.now();
  let value=1;
  for(let i=0;i<900000;i++)value=(value*1.0000001)+0.000001;
  void value;
  return performance.now()-start;
}

export async function probeDeviceRuntime():Promise<DeviceRuntimeProfile>{
  const nav:any=navigator;
  const gpu=await probeWebGPU();
  const webnn=!!nav.ml;
  const wasm=typeof WebAssembly!=="undefined";
  const benchmarkMs=await tinyBenchmark();
  const cores=typeof nav.hardwareConcurrency==="number"?nav.hardwareConcurrency:null;
  const memory=typeof nav.deviceMemory==="number"?nav.deviceMemory:null;
  const localModelAllowed=(
    (webnn&&(cores===null||cores>=4)&&(memory===null||memory>=4))||
    (gpu.available&&(cores===null||cores>=4)&&(memory===null||memory>=4))
  )&&benchmarkMs<45;
  const preferredBackend:RuntimeBackend=webnn&&localModelAllowed?"webnn":gpu.available&&localModelAllowed?"webgpu":wasm&&benchmarkMs<85?"wasm":"cloud";
  const confidence=Math.min(1,
    .35+
    (cores!==null?.15:0)+
    (memory!==null?.15:0)+
    (webnn?.15:0)+
    (gpu.available?.15:0)+
    (benchmarkMs!==null?.15:0)
  );
  return{
    deviceClass:getDeviceClass(),
    platform:nav.userAgentData?.platform||nav.platform||"unknown",
    architecture:nav.userAgentData?.architecture||"unknown",
    logicalCores:cores,
    memoryGB:memory,
    webnn,
    webgpu:gpu.available,
    wasm,
    gpuName:gpu.name,
    benchmarkMs:Math.round(benchmarkMs),
    preferredBackend,
    localModelAllowed,
    confidence
  };
}

export function runtimeSummary(profile:DeviceRuntimeProfile){
  if(profile.preferredBackend==="cloud")return"Cloud runtime selected";
  return`On-device ${profile.preferredBackend.toUpperCase()} runtime selected`;
}
