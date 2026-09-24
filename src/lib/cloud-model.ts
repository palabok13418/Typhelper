export async function refineProfileInCloud(summary:string){
  try{
    const controller=new AbortController();
    const timer=window.setTimeout(()=>controller.abort(),4500);
    try{
      const response=await fetch("/api/ml/refine",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({summary}),
        signal:controller.signal
      });
      if(!response.ok)return null;
      const data=await response.json();
      return typeof data.result==="string"?data.result:null;
    }finally{
      window.clearTimeout(timer);
    }
  }catch{return null}
}
