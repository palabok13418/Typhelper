const GUEST_USERNAME_KEY="typhelper-guest-username-v1";

export function loadGuestUsername(){
  if(typeof localStorage==="undefined")return"";
  return localStorage.getItem(GUEST_USERNAME_KEY)||"";
}

export function sanitizeUsername(value:string){
  return value.trim().replace(/\s+/g," ").slice(0,20);
}

export function isValidUsername(value:string){
  const clean=sanitizeUsername(value);
  return clean.length>=2&&/^[a-zA-Z0-9._ -]+$/.test(clean);
}

export function saveGuestUsername(value:string){
  const clean=sanitizeUsername(value);
  if(!isValidUsername(clean))return false;
  try{
    localStorage.setItem(GUEST_USERNAME_KEY,clean);
    return true;
  }catch{
    return false;
  }
}
