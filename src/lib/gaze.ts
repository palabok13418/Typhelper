import type {GazeState} from "../types";

type Landmark = {x:number;y:number;z?:number};

type GazeMeasurement = {
  down:number;
  headPitch:number;
  headYaw:number;
  eyeOpenness:number;
};

type GazeBaseline = {
  down:number;
  headPitch:number;
};

export class GazeMonitor{
  stream:MediaStream|null=null;
  detector:any=null;
  raf=0;
  history:GazeState[]=[];
  stopped=true;
  private baseline:GazeBaseline|null=null;
  private baselineSamples:Array<{down:number;headPitch:number}>=[];
  private stable:GazeState="unknown";
  private unknownFrames=0;

  async start(video:HTMLVideoElement,onState:(state:GazeState)=>void,existingStream?:MediaStream){
    this.stopped=false;
    this.history=[];
    this.stable="unknown";
    this.unknownFrames=0;
    this.baseline=null;
    this.baselineSamples=[];

    this.stream=existingStream??await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:"user",
        width:{ideal:640},
        height:{ideal:480},
        frameRate:{ideal:30,max:30}
      },
      audio:false
    });

    video.srcObject=this.stream;
    await video.play();

    const {FaceLandmarker,FilesetResolver}=await import("@mediapipe/tasks-vision");
    const fs=await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
    );

    try{
      this.detector=await FaceLandmarker.createFromOptions(fs,{
        baseOptions:{
          modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate:"GPU"
        },
        runningMode:"VIDEO",
        numFaces:1,
        minFaceDetectionConfidence:.55,
        minFacePresenceConfidence:.55,
        minTrackingConfidence:.55
      });

      this.loop(video,onState);
    }catch(error){
      this.stop(video);
      throw error;
    }
  }

  stop(video?:HTMLVideoElement){
    this.stopped=true;
    cancelAnimationFrame(this.raf);
    this.raf=0;
    this.detector?.close?.();
    this.detector=null;
    this.stream?.getTracks().forEach(track=>track.stop());
    this.stream=null;
    this.history=[];
    this.baseline=null;
    this.baselineSamples=[];
    this.stable="unknown";
    this.unknownFrames=0;

    if(video){
      try{video.pause()}catch{}
      try{video.srcObject=null}catch{}
    }
  }

  private loop(video:HTMLVideoElement,onState:(state:GazeState)=>void){
    if(this.stopped)return;

    try{
      const result=this.detector.detectForVideo(video,performance.now());
      const landmarks=result.faceLandmarks?.[0] as Landmark[]|undefined;

      if(!landmarks){
        this.pushState("unknown",onState);
      }else{
        const measurement=measureGaze(landmarks);

        if(!this.baseline){
          this.baselineSamples.push({
            down:measurement.down,
            headPitch:measurement.headPitch
          });

          if(this.baselineSamples.length>=18){
            this.baseline={
              down:median(this.baselineSamples.map(item=>item.down)),
              headPitch:median(this.baselineSamples.map(item=>item.headPitch))
            };
          }

          this.pushState("unknown",onState);
        }else{
          this.pushState(this.classify(measurement),onState);
        }
      }
    }catch{
      this.pushState("unknown",onState);
    }

    this.raf=requestAnimationFrame(()=>this.loop(video,onState));
  }

  private classify(measurement:GazeMeasurement):GazeState{
    if(measurement.eyeOpenness<.16)return"unknown";

    const yawDelta=Math.abs(measurement.headYaw);
    if(yawDelta>.52)return"unknown";

    const downDelta=measurement.down-this.baseline!.down;
    const pitchDelta=measurement.headPitch-this.baseline!.headPitch;

    // Iris displacement catches the eye movement itself, while head pitch
    // catches the larger downward head movement that usually accompanies a
    // keyboard glance. Combining both is much more stable than head pose alone.
    const irisDown=clamp((downDelta-.012)/.065,0,1);
    const headDown=clamp((pitchDelta-.008)/.075,0,1);
    const keyboardScore=irisDown*.68+headDown*.32;

    if(keyboardScore>=.62)return"keyboard";
    if(keyboardScore<=.20)return"screen";
    return"unknown";
  }

  private pushState(state:GazeState,onState:(state:GazeState)=>void){
    this.history.push(state);
    if(this.history.length>12)this.history.shift();

    const keyboard=this.history.filter(item=>item==="keyboard").length;
    const screen=this.history.filter(item=>item==="screen").length;
    const unknown=this.history.filter(item=>item==="unknown").length;

    if(this.stable==="keyboard"){
      if(screen>=8)this.stable="screen";
      else if(unknown>=10)this.stable="unknown";
    }else if(this.stable==="screen"){
      if(keyboard>=8)this.stable="keyboard";
      else if(unknown>=10)this.stable="unknown";
    }else{
      if(keyboard>=7)this.stable="keyboard";
      else if(screen>=7)this.stable="screen";
    }

    if(state==="unknown")this.unknownFrames++;
    else this.unknownFrames=0;

    if(this.unknownFrames>=10)this.stable="unknown";
    onState(this.stable);
  }
}

function measureGaze(p:Landmark[]):GazeMeasurement{
  const left=eyeMeasurement(p,33,133,159,145,468);
  const right=eyeMeasurement(p,263,362,386,374,473);

  const faceTop=p[10];
  const faceBottom=p[152];
  const nose=p[1];
  const leftCorner=p[33];
  const rightCorner=p[263];

  if(!left||!right||!faceTop||!faceBottom||!nose||!leftCorner||!rightCorner){
    return{down:0,headPitch:0,headYaw:1,eyeOpenness:0};
  }

  const eyeDown=(left.vertical+right.vertical)/2;
  const headHeight=Math.max(.08,distance(faceTop,faceBottom));
  const eyeMidY=(leftCorner.y+rightCorner.y)/2;
  const headPitch=(nose.y-eyeMidY)/headHeight;

  const eyeWidth=Math.max(.02,distance(leftCorner,rightCorner));
  const noseOffset=(nose.x-((leftCorner.x+rightCorner.x)/2))/eyeWidth;

  return{
    down:eyeDown*.78+headPitch*.22,
    headPitch,
    headYaw:noseOffset,
    eyeOpenness:(left.openness+right.openness)/2
  };
}

function eyeMeasurement(
  p:Landmark[],
  outerIndex:number,
  innerIndex:number,
  upperIndex:number,
  lowerIndex:number,
  irisIndex:number
){
  const outer=p[outerIndex];
  const inner=p[innerIndex];
  const upper=p[upperIndex];
  const lower=p[lowerIndex];
  const iris=p[irisIndex];

  if(!outer||!inner||!upper||!lower||!iris)return null;

  const width=Math.max(.02,distance(outer,inner));
  const height=Math.max(.008,distance(upper,lower));
  const lidCenterY=(upper.y+lower.y)/2;

  return{
    vertical:(iris.y-lidCenterY)/width,
    openness:height/width
  };
}

function median(values:number[]){
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2===0?(sorted[mid-1]+sorted[mid])/2:sorted[mid];
}

function distance(a:Landmark,b:Landmark){
  return Math.hypot(a.x-b.x,a.y-b.y);
}

function clamp(value:number,min:number,max:number){
  return Math.min(max,Math.max(min,value));
}
