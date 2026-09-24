import{refineProfileInCloud}from"./cloud-model";

export async function quietlyRefineProfile(summary:string){
  // Cloud-only inference keeps the typing interaction independent from large
  // browser ML runtimes and prevents model loading from consuming system memory.
  const result=await refineProfileInCloud(summary);
  if(typeof result==="string"){
    try{localStorage.setItem("typing-pro-model-profile",result)}catch{}
  }
  return{backend:"cloud" as const,result};
}
