import{animate,stagger}from"animejs";

export function animateWord(el:Element|null){
  if(!el)return;
  animate(el.querySelectorAll(".word-char"),{
    opacity:[0,1],
    y:[10,0],
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
