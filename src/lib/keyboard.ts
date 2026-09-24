export type KeyDef={k:string;label?:string;w?:number;kind?:"key"|"modifier"|"action"};

export const FUNCTION_ROW:KeyDef[]=[
  {k:"escape",label:"ESC",w:1.2,kind:"action"},
  {k:"f1",label:"F1",w:1,kind:"action"},{k:"f2",label:"F2",w:1,kind:"action"},
  {k:"f3",label:"F3",w:1,kind:"action"},{k:"f4",label:"F4",w:1,kind:"action"},
  {k:"f5",label:"F5",w:1,kind:"action"},{k:"f6",label:"F6",w:1,kind:"action"},
  {k:"f7",label:"F7",w:1,kind:"action"},{k:"f8",label:"F8",w:1,kind:"action"},
  {k:"f9",label:"F9",w:1,kind:"action"},{k:"f10",label:"F10",w:1,kind:"action"},
  {k:"f11",label:"F11",w:1,kind:"action"},{k:"f12",label:"F12",w:1,kind:"action"}
];

export const WINDOWS_NUMBER_ROW:KeyDef[]=[
  {k:"backquote",label:"~",w:1},{k:"1",w:1},{k:"2",w:1},{k:"3",w:1},{k:"4",w:1},{k:"5",w:1},
  {k:"6",w:1},{k:"7",w:1},{k:"8",w:1},{k:"9",w:1},{k:"0",w:1},{k:"-",w:1},{k:"=",w:1},
  {k:"backspace",label:"BACKSPACE",w:2,kind:"action"}
];

export const WINDOWS_ROWS:KeyDef[][]=[
  [{k:"tab",label:"TAB",w:1.5,kind:"modifier"},{k:"q"},{k:"w"},{k:"e"},{k:"r"},{k:"t"},{k:"y"},{k:"u"},{k:"i"},{k:"o"},{k:"p"},{k:"["},{k:"]"},{k:"\\",w:1.5}],
  [{k:"caps",label:"CAPS",w:1.75,kind:"modifier"},{k:"a"},{k:"s"},{k:"d"},{k:"f"},{k:"g"},{k:"h"},{k:"j"},{k:"k"},{k:"l"},{k:";"},{k:"'",w:1},{k:"enter",label:"ENTER",w:2.25,kind:"action"}],
  [{k:"left-shift",label:"SHIFT",w:2.25,kind:"modifier"},{k:"z"},{k:"x"},{k:"c"},{k:"v"},{k:"b"},{k:"n"},{k:"m"},{k:","},{k:"."},{k:"/"},{k:"right-shift",label:"SHIFT",w:2.75,kind:"modifier"}]
];

export const WINDOWS_BOTTOM_ROW:KeyDef[]=[
  {k:"left-ctrl",label:"CTRL",w:1.35,kind:"modifier"},{k:"win",label:"⊞",w:1.35,kind:"modifier"},
  {k:"left-alt",label:"ALT",w:1.35,kind:"modifier"},{k:"space",label:"SPACE",w:6.2,kind:"modifier"},
  {k:"right-alt",label:"ALT",w:1.35,kind:"modifier"},{k:"menu",label:"MENU",w:1.35,kind:"modifier"},
  {k:"right-ctrl",label:"CTRL",w:1.35,kind:"modifier"}
];


export const WINDOWS_COPILOT_BOTTOM_ROW:KeyDef[]=[
  {k:"left-ctrl",label:"CTRL",w:1.35,kind:"modifier"},{k:"win",label:"⊞",w:1.35,kind:"modifier"},
  {k:"left-alt",label:"ALT",w:1.35,kind:"modifier"},{k:"space",label:"SPACE",w:6.2,kind:"modifier"},
  {k:"right-alt",label:"ALT",w:1.35,kind:"modifier"},{k:"copilot",label:"COPILOT",w:1.55,kind:"modifier"},
  {k:"right-ctrl",label:"CTRL",w:1.35,kind:"modifier"}
];
export const MAC_ROWS:KeyDef[][]=[
  [{k:"tab",label:"TAB",w:1.5,kind:"modifier"},{k:"q"},{k:"w"},{k:"e"},{k:"r"},{k:"t"},{k:"y"},{k:"u"},{k:"i"},{k:"o"},{k:"p"},{k:"["},{k:"]"},{k:"\\",w:1.5}],
  [{k:"caps",label:"CAPS",w:1.75,kind:"modifier"},{k:"a"},{k:"s"},{k:"d"},{k:"f"},{k:"g"},{k:"h"},{k:"j"},{k:"k"},{k:"l"},{k:";"},{k:"'",w:1},{k:"return",label:"RETURN",w:2.25,kind:"action"}],
  [{k:"left-shift",label:"SHIFT",w:2.25,kind:"modifier"},{k:"z"},{k:"x"},{k:"c"},{k:"v"},{k:"b"},{k:"n"},{k:"m"},{k:","},{k:"."},{k:"/"},{k:"right-shift",label:"SHIFT",w:2.75,kind:"modifier"}]
];

export const MAC_BOTTOM_ROW:KeyDef[]=[
  {k:"left-ctrl",label:"CTRL",w:1.4,kind:"modifier"},{k:"left-option",label:"OPTION",w:1.2,kind:"modifier"},
  {k:"left-command",label:"⌘",w:1.5,kind:"modifier"},{k:"space",label:"SPACE",w:6.2,kind:"modifier"},
  {k:"right-command",label:"⌘",w:1.5,kind:"modifier"},{k:"right-option",label:"OPTION",w:1.2,kind:"modifier"},
  {k:"fn",label:"FN",w:1.2,kind:"modifier"},{k:"right-ctrl",label:"CTRL",w:1.4,kind:"modifier"}
];

export function normalizeKey(key:string){
  if(key===" ")return"space";
  return key.length===1?key.toLowerCase():key.toLowerCase();
}
export function nextKey(word:string,index:number){return normalizeKey(word[index]??"");}
