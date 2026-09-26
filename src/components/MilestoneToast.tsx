import{Share2,Trophy,X}from"lucide-react";
import{useState}from"react";
import{shareMilestone,type Milestone}from"../lib/milestones";

export default function MilestoneToast({milestone,username,onDismiss,onShared}:{milestone:Milestone;username?:string|null;onDismiss:()=>void;onShared?:()=>void}){
  const[sharing,setSharing]=useState(false);
  const[status,setStatus]=useState<"idle"|"shared"|"copied"|"error">("idle");
  async function share(){
    setSharing(true);
    try{
      setStatus(await shareMilestone(milestone,username));
      onShared?.();
    }catch{
      setStatus("error");
    }finally{
      setSharing(false);
    }
  }
  return <div className="milestone-toast" role="status">
    <div className="milestone-toast-icon"><Trophy size={17}/></div>
    <div className="milestone-toast-copy">
      <span>Milestone unlocked</span>
      <strong>{milestone.title}</strong>
      <small>{milestone.description}</small>
      {status!=="idle"&&<em>{status==="shared"?"Shared":"Copied to clipboard"}</em>}
      {status==="error"&&<em>Sharing was cancelled.</em>}
    </div>
    <div className="milestone-toast-actions">
      <button className="milestone-share" onClick={share} disabled={sharing} aria-label="Share milestone"><Share2 size={15}/></button>
      <button className="milestone-dismiss" onClick={onDismiss} aria-label="Dismiss milestone"><X size={15}/></button>
    </div>
  </div>;
}
