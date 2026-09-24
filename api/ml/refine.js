export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"method-not-allowed"});

  const apiKey=process.env.GROQ_API_KEY;
  if(!apiKey)return res.status(503).json({error:"groq-not-configured"});

  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const upstream=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        authorization:"Bearer "+apiKey
      },
      body:JSON.stringify({
        model:process.env.GROQ_MODEL||"openai/gpt-oss-20b",
        messages:[
          {role:"system",content:"You are Typing-Pro's cloud typing-training model. Analyze aggregate typing metrics only. Never request or infer raw keystroke streams, camera frames, or personal identifiers. Return compact JSON with focusKeys and difficulty."},
          {role:"user",content:String(body.summary||"")}
        ],
        temperature:0.1,
        max_completion_tokens:90
      })
    });

    const data=await upstream.json().catch(()=>null);
    if(!upstream.ok)return res.status(upstream.status).json({error:"groq-request-failed"});
    const result=data?.choices?.[0]?.message?.content;
    if(typeof result!=="string")return res.status(502).json({error:"groq-invalid-response"});
    return res.status(200).json({result});
  }catch{
    return res.status(502).json({error:"groq-request-failed"});
  }
}
