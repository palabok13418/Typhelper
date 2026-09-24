import{animate,stagger}from"animejs";

export function animateWord(el:Element|null){
  if(!el)return;
  animate(el.querySelectorAll(".word-char"),{
    y:[8,0],
    scale:[.985,1],
    duration:280,
    delay:stagger(18),
    ease:"outQuad"
  });
}

export function animateKeyPress(el:Element|null){
  if(!el)return;
  animate(el,{scale:[1,1.08,1],y:[0,-3,0],duration:220,ease:"outQuad"});
}

export function animateKeyGuide(el:Element|null){
  if(!el)return;
  animate(el,{scale:[1,1.06,1],duration:500,loop:2,ease:"inOutSine"});
}

export function animateModal(el:Element|null){
  if(!el)return;
  animate(el,{opacity:[0,1],y:[14,0],duration:260,ease:"outQuad"});
}

export function animatePanel(el:Element|null){
  if(!el)return;
  animate(el,{opacity:[0,1],y:[8,0],duration:300,ease:"outQuad"});
}

export function animateSession(el:Element|null){\n  if(!el)return;\n  animate(el,{y:[-4,0],scale:[.995,1],duration:180,ease:"outQuad"});\n}\n\nexport function animateDefinition(el:Element|null){
  if(!el)return;
  animate(el,{opacity:[0,1],y:[7,0],scale:[.98,1],duration:260,ease:"outQuad"});
}

export function animateWordExit(el:Element|null,onComplete:()=>void){
  if(!el){onComplete();return;}
  const letters=el.querySelectorAll(".word-char");
  if(!letters.length){onComplete();return;}
  animate(letters,{
    y:[0,-8],
    scale:[1,.985],
    duration:130,
    delay:stagger(8),
    ease:"inQuad",
    onComplete
  });
}
