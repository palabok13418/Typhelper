export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"method-not-allowed"});
  const endpoint=process.env.ML_CLOUD_ENDPOINT;
  const apiKey=process.env.ML_CLOUD_API_KEY;
  if(!endpoint)return res.status(503).json({error:"cloud-runtime-not-configured"});
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const upstream=await fetch(endpoint,{
      method:"POST",
      headers:{
        "content-type":"application/json",
        ...(apiKey?{authorization:"Bearer "+apiKey}:{})
      },
      body:JSON.stringify({
        messages:[
          {role:"system",content:"You are a typing training model. Analyze aggregate metrics only. Return compact JSON with focusKeys and difficulty."},
          {role:"user",content:String(body.summary||"")}
        ],
        temperature:0.1,
        max_tokens:90
      })
    });
    const data=await upstream.json().catch(()=>null);
    if(!upstream.ok)return res.status(upstream.status).json({error:"cloud-upstream-failed"});
    const result=data?.choices?.[0]?.message?.content;
    if(typeof result!=="string")return res.status(502).json({error:"cloud-invalid-response"});
    return res.status(200).json({result});
  }catch{return res.status(502).json({error:"cloud-request-failed"})}
}
