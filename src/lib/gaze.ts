import type {GazeState} from "../types";

type Landmark={x:number;y:number;z?:number};
type GazeMeasurement={down:number;headPitch:number;headYaw:number;eyeOpenness:number;valid:boolean};
type GazeBaseline={down:number;headPitch:number;openness:number};
type GazeCallback=(state:GazeState,detected:boolean)=>void;

export class GazeMonitor{
  stream:MediaStream|null=null;
  detector:any=null;
  raf=0;
  history:GazeState[]=[];
  stopped=true;
  private baseline:GazeBaseline|null=null;
  private baselineSamples:Array<{down:number;headPitch:number;openness:number}>= [];
  private stable:GazeState="unknown";
  private unknownFrames=0;
  private lastVideoTimestamp=0;

  async start(video:HTMLVideoElement,onState:GazeCallback,existingStream?:MediaStream){
    this.stopped=false;
    this.history=[]; this.stable="unknown"; this.unknownFrames=0;
    this.baseline=null; this.baselineSamples=[]; this.lastVideoTimestamp=0;
    this.stream=existingStream??await navigator.mediaDevices.getUserMedia({
      video:{facingMode:"user",width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}},
      audio:false
    });
    video.srcObject=this.stream; video.muted=true; video.playsInline=true;
    await video.play();

    const {FaceLandmarker,FilesetResolver}=await import("@mediapipe/tasks-vision");
    const fs=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
    try{
      this.detector=await this.createDetector(FaceLandmarker,fs,"GPU");
    }catch{
      this.detector=await this.createDetector(FaceLandmarker,fs,"CPU");
    }
    this.loop(video,onState);
  }

  stop(video?:HTMLVideoElement){
    this.stopped=true; cancelAnimationFrame(this.raf); this.raf=0;
    this.detector?.close?.(); this.detector=null;
    this.stream?.getTracks().forEach(track=>track.stop()); this.stream=null;
    this.history=[]; this.baseline=null; this.baselineSamples=[];
    this.stable="unknown"; this.unknownFrames=0; this.lastVideoTimestamp=0;
    if(video){try{video.pause()}catch{} try{video.srcObject=null}catch{}}
  }

  private async createDetector(FaceLandmarker:any,fs:any,delegate:"GPU"|"CPU"){
    return FaceLandmarker.createFromOptions(fs,{
      baseOptions:{
        modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate
      },
      runningMode:"VIDEO", numFaces:1,
      minFaceDetectionConfidence:.45,
      minFacePresenceConfidence:.45,
      minTrackingConfidence:.45
    });
  }

  private loop(video:HTMLVideoElement,onState:GazeCallback){
    if(this.stopped)return;
    try{
      if(video.readyState<2||video.videoWidth===0||video.videoHeight===0){
        this.pushState("unknown",false,onState);
      }else{
        const timestamp=Math.max(performance.now(),this.lastVideoTimestamp+1);
        this.lastVideoTimestamp=timestamp;
        const result=this.detector.detectForVideo(video,timestamp);
        const landmarks=result.faceLandmarks?.[0] as Landmark[]|undefined;
        if(!landmarks){
          this.pushState("unknown",false,onState);
        }else{
          const measurement=measureGaze(landmarks);
          if(!measurement.valid){
            this.pushState("unknown",false,onState);
          }else if(!this.baseline){
            this.baselineSamples.push({down:measurement.down,headPitch:measurement.headPitch,openness:measurement.eyeOpenness});
            if(this.baselineSamples.length>=24){
              this.baseline={
                down:median(this.baselineSamples.map(item=>item.down)),
                headPitch:median(this.baselineSamples.map(item=>item.headPitch)),
                openness:median(this.baselineSamples.map(item=>item.openness))
              };
            }
            this.pushState("unknown",true,onState);
          }else{
            this.pushState(this.classify(measurement),true,onState);
          }
        }
      }
    }catch{
      this.pushState("unknown",false,onState);
    }
    this.raf=requestAnimationFrame(()=>this.loop(video,onState));
  }

  private classify(measurement:GazeMeasurement):GazeState{
    const baseline=this.baseline!;
    const blinkThreshold=Math.max(.035,baseline.openness*.42);
    if(measurement.eyeOpenness<blinkThreshold)return"unknown";
    if(Math.abs(measurement.headYaw)>.62)return"unknown";

    const downDelta=measurement.down-baseline.down;
    const pitchDelta=measurement.headPitch-baseline.headPitch;
    const irisDown=clamp((downDelta-.008)/.048,0,1);
    const headDown=clamp((pitchDelta-.006)/.065,0,1);
    const keyboardScore=irisDown*.78+headDown*.22;

    if(keyboardScore>=.58)return"keyboard";
    if(keyboardScore<=.18)return"screen";
    return"unknown";
  }

  private pushState(state:GazeState,detected:boolean,onState:GazeCallback){
    this.history.push(state);
    if(this.history.length>12)this.history.shift();
    const keyboard=this.history.filter(item=>item==="keyboard").length;
    const screen=this.history.filter(item=>item==="screen").length;
    const unknown=this.history.filter(item=>item==="unknown").length;

    if(this.stable==="keyboard"){
      if(screen>=7)this.stable="screen";
      else if(unknown>=10)this.stable="unknown";
    }else if(this.stable==="screen"){
      if(keyboard>=7)this.stable="keyboard";
      else if(unknown>=10)this.stable="unknown";
    }else{
      if(keyboard>=6)this.stable="keyboard";
      else if(screen>=6)this.stable="screen";
    }
    if(state==="unknown")this.unknownFrames++; else this.unknownFrames=0;
    if(this.unknownFrames>=10)this.stable="unknown";
    onState(this.stable,detected);
  }
}

function measureGaze(p:Landmark[]):GazeMeasurement{
  const left=eyeMeasurement(p,33,133,159,145,468);
  const right=eyeMeasurement(p,263,362,386,374,473);
  const faceTop=p[10], faceBottom=p[152], nose=p[1], leftCorner=p[33], rightCorner=p[263];
  if(!left||!right||!faceTop||!faceBottom||!nose||!leftCorner||!rightCorner){
    return{down:0,headPitch:0,headYaw:1,eyeOpenness:0,valid:false};
  }
  const eyeDown=(left.vertical+right.vertical)/2;
  const headHeight=Math.max(.08,distance(faceTop,faceBottom));
  const eyeMidY=(leftCorner.y+rightCorner.y)/2;
  const headPitch=(nose.y-eyeMidY)/headHeight;
  const eyeWidth=Math.max(.02,distance(leftCorner,rightCorner));
  const noseOffset=(nose.x-((leftCorner.x+rightCorner.x)/2))/eyeWidth;
  return{
    down:eyeDown*.82+headPitch*.18,
    headPitch, headYaw:noseOffset,
    eyeOpenness:(left.openness+right.openness)/2,
    valid:true
  };
}

function eyeMeasurement(p:Landmark[],outerIndex:number,innerIndex:number,upperIndex:number,lowerIndex:number,irisIndex:number){
  const outer=p[outerIndex], inner=p[innerIndex], upper=p[upperIndex], lower=p[lowerIndex], iris=p[irisIndex];
  if(!outer||!inner||!upper||!lower||!iris)return null;
  const width=Math.max(.02,distance(outer,inner));
  const height=Math.max(.006,distance(upper,lower));
  const lidCenterY=(upper.y+lower.y)/2;
  return{vertical:(iris.y-lidCenterY)/width,openness:height/width};
}

function median(values:number[]){
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b), mid=Math.floor(sorted.length/2);
  return sorted.length%2===0?(sorted[mid-1]+sorted[mid])/2:sorted[mid];
}
function distance(a:Landmark,b:Landmark){return Math.hypot(a.x-b.x,a.y-b.y)}
function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value))}