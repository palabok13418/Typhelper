export async function refineProfileInCloud(summary:string){
  try{
    const response=await fetch("/api/ml/refine",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({summary})
    });
    if(!response.ok)return null;
    const data=await response.json();
    return typeof data.result==="string"?data.result:null;
  }catch{return null}
}
