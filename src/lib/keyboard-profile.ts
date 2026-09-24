export interface KeyboardProfile{
  source:"webhid"|"observed"|"os";
  name:string;
  manufacturer:string|null;
  productId:number|null;
  vendorId:number|null;
  layout:"windows"|"mac"|"unknown";
  observedKeys:string[];
  exactDevice:boolean;
}

const KEYBOARD_PROFILE_KEY="typing-pro-keyboard-profile-v1";
let cacheLoaded=false;
let keyboardProfileCache:KeyboardProfile|null=null;
let pendingWrites=0;

function normalizeObservedKey(key:string){
  if(key===" ")return"SPACE";
  if(key.length===1)return key.toUpperCase();
  return key.toUpperCase();
}

export function readKeyboardProfile():KeyboardProfile|null{
  if(cacheLoaded)return keyboardProfileCache;
  cacheLoaded=true;
  try{
    const raw=localStorage.getItem(KEYBOARD_PROFILE_KEY);
    keyboardProfileCache=raw?JSON.parse(raw) as KeyboardProfile:null;
  }catch{
    keyboardProfileCache=null;
  }
  return keyboardProfileCache;
}

function saveKeyboardProfile(profile:KeyboardProfile){
  keyboardProfileCache=profile;
  cacheLoaded=true;
  try{localStorage.setItem(KEYBOARD_PROFILE_KEY,JSON.stringify(profile));pendingWrites=0}catch{}
}

export function flushKeyboardProfile(){
  if(!keyboardProfileCache||pendingWrites===0)return;
  try{
    localStorage.setItem(KEYBOARD_PROFILE_KEY,JSON.stringify(keyboardProfileCache));
    pendingWrites=0;
  }catch{}
}

export function observeKeyboardKey(key:string){
  const current=readKeyboardProfile();
  const normalized=normalizeObservedKey(key);
  if(current?.observedKeys.includes(normalized))return current;

  const observed=new Set(current?.observedKeys??[]);
  observed.add(normalized);
  const profile:KeyboardProfile={
    source:current?.source==="webhid"?"webhid":"observed",
    name:current?.name??"Detected keyboard layout",
    manufacturer:current?.manufacturer??null,
    productId:current?.productId??null,
    vendorId:current?.vendorId??null,
    layout:current?.layout??(navigator.platform==="MacIntel"?"mac":"windows"),
    observedKeys:[...observed].slice(-120),
    exactDevice:current?.exactDevice??false
  };

  keyboardProfileCache=profile;
  cacheLoaded=true;
  pendingWrites++;
  if(pendingWrites>=12)saveKeyboardProfile(profile);
  return profile;
}

export async function connectPhysicalKeyboard():Promise<KeyboardProfile>{
  const hid=(navigator as any).hid;
  if(!hid)throw new Error("WebHID is not available in this browser.");
  const devices=await hid.requestDevice({filters:[{usagePage:0x01,usage:0x06}]});
  if(!devices.length)throw new Error("No keyboard was selected.");
  const device=devices[0];
  const profile:KeyboardProfile={
    source:"webhid",
    name:device.productName||"Physical keyboard",
    manufacturer:device.manufacturerName||null,
    productId:typeof device.productId==="number"?device.productId:null,
    vendorId:typeof device.vendorId==="number"?device.vendorId:null,
    layout:/Mac|Apple/i.test(device.productName||"")?"mac":/Windows/i.test(navigator.platform)?"windows":"unknown",
    observedKeys:readKeyboardProfile()?.observedKeys??[],
    exactDevice:true
  };
  saveKeyboardProfile(profile);
  return profile;
}

export function hasWebHID(){
  return typeof navigator!=="undefined"&&!!(navigator as any).hid;
}

if(typeof window!=="undefined")window.addEventListener("pagehide",flushKeyboardProfile);