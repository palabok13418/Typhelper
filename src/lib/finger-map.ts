export type FingerId=
  |"left-pinky"|"left-ring"|"left-middle"|"left-index"
  |"right-index"|"right-middle"|"right-ring"|"right-pinky"|"thumb";

const FINGER_KEYS:Record<string,FingerId>={
  "1":"left-pinky","2":"left-ring","3":"left-middle","4":"left-index","5":"left-index",
  "6":"right-index","7":"right-index","8":"right-middle","9":"right-ring","0":"right-pinky",
  "-":"right-pinky","=":"right-pinky","backquote":"left-pinky",
  "q":"left-pinky","a":"left-pinky","z":"left-pinky",
  "w":"left-ring","s":"left-ring","x":"left-ring",
  "e":"left-middle","d":"left-middle","c":"left-middle",
  "r":"left-index","f":"left-index","v":"left-index","t":"left-index","g":"left-index","b":"left-index",
  "y":"right-index","h":"right-index","n":"right-index","u":"right-index","j":"right-index","m":"right-index",
  "i":"right-middle","k":"right-middle",",":"right-middle",
  "o":"right-ring","l":"right-ring",".":"right-ring",
  "p":"right-pinky",";":"right-pinky","/":"right-pinky","[":"right-pinky","]":"right-pinky","\\":"right-pinky","'":"right-pinky",
  "space":"thumb"
};

export function fingerForKey(key:string):FingerId|null{
  return FINGER_KEYS[key.toLowerCase()]??null;
}

export function fingerClass(key:string):string{
  const finger=fingerForKey(key);
  return finger?"finger-"+finger:"";
}
