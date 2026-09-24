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
  jsHeapMB:number|null;
  jsHeapLimitMB:number|null;
  estimatedMemoryHeadroomMB:number|null;
  modelBudgetMB:number;
  preferredBackend:RuntimeBackend;
  localModelAllowed:boolean;
  confidence:number;
}

const LOCAL_MODEL_BUDGET_MB=512;
const HIGH_MEMORY_LOCAL_MIN_GB=16;

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

function readHeap(){
  const memory=(performance as any).memory;
  if(!memory)return{used:null as number|null,limit:null as number|null};
  return{
    used:typeof memory.usedJSHeapSize==="number"?memory.usedJSHeapSize/1048576:null,
    limit:typeof memory.jsHeapSizeLimit==="number"?memory.jsHeapSizeLimit/1048576:null
  };
}

export async function probeDeviceRuntime():Promise<DeviceRuntimeProfile>{
  const nav:any=navigator;
  const gpu=await probeWebGPU();
  const webnn=!!nav.ml;
  const wasm=typeof WebAssembly!=="undefined";
  const benchmarkMs=await tinyBenchmark();
  const cores=typeof nav.hardwareConcurrency==="number"?nav.hardwareConcurrency:null;
  const memory=typeof nav.deviceMemory==="number"?nav.deviceMemory:null;
  const heap=readHeap();

  // Browser memory APIs are incomplete: GPU/WASM allocations are not included.
  // Treat this as a conservative admission check, never as proof that a model is safe.
  const heapHeadroom=heap.limit!==null&&heap.used!==null?Math.max(0,heap.limit-heap.used):null;
  const hasEnoughRam=memory!==null&&memory>=HIGH_MEMORY_LOCAL_MIN_GB;
  const hasHeapHeadroom=heapHeadroom===null||heapHeadroom>=LOCAL_MODEL_BUDGET_MB*2;
  const accelerated=(webnn||gpu.available);
  const localModelAllowed=(
    accelerated&&
    hasEnoughRam&&
    hasHeapHeadroom&&
    (cores===null||cores>=4)&&
    benchmarkMs<45
  );

  const preferredBackend:RuntimeBackend=localModelAllowed
    ?(webnn?"webnn":"webgpu")
    :"cloud";

  const confidence=Math.min(1,
    .25+
    (cores!==null?.15:0)+
    (memory!==null?.2:0)+
    (webnn?.15:0)+
    (gpu.available?.15:0)+
    (heapHeadroom!==null?.1:0)
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
    jsHeapMB:heap.used===null?null:Math.round(heap.used),
    jsHeapLimitMB:heap.limit===null?null:Math.round(heap.limit),
    estimatedMemoryHeadroomMB:heapHeadroom===null?null:Math.round(heapHeadroom),
    modelBudgetMB:LOCAL_MODEL_BUDGET_MB,
    preferredBackend,
    localModelAllowed,
    confidence
  };
}

export function runtimeSummary(profile:DeviceRuntimeProfile){
  if(profile.preferredBackend==="cloud"){
    if(profile.memoryGB!==null&&profile.memoryGB<HIGH_MEMORY_LOCAL_MIN_GB)return"Cloud runtime selected for memory safety";
    if(profile.estimatedMemoryHeadroomMB!==null&&profile.estimatedMemoryHeadroomMB<LOCAL_MODEL_BUDGET_MB*2)return"Cloud runtime selected for browser memory safety";
    return"Cloud runtime selected";
  }
  return`On-device ${profile.preferredBackend.toUpperCase()} runtime selected · ${profile.modelBudgetMB} MB safety budget`;
}
