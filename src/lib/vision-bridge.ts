export type VisionSignal={gaze:"screen"|"keyboard"|"unknown";hand?:string|null;source:"extension"};
export class VisionBridge{
  private channel:BroadcastChannel|null=null;
  private listener:(signal:VisionSignal)=>void=()=>{};
  start(listener:(signal:VisionSignal)=>void){
    this.listener=listener;
    try{this.channel=new BroadcastChannel("typing-pro-vision");this.channel.onmessage=(event)=>this.accept(event.data)}catch{}
    window.addEventListener("message",this.onMessage);
  }
  private onMessage=(event:MessageEvent)=>this.accept(event.data);
  private accept=(data:any)=>{
    if(!data||data.type!=="typing-pro-vision"||data.source!=="extension")return;
    this.listener({gaze:data.gaze==="keyboard"?"keyboard":data.gaze==="screen"?"screen":"unknown",hand:typeof data.hand==="string"?data.hand:null,source:"extension"});
  };
  stop(){this.channel?.close();this.channel=null;window.removeEventListener("message",this.onMessage)}
}