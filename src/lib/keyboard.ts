export type KeyDef={
  k:string;
  label?:string;
  glyph?:string;
  w?:number;
  kind?:"key"|"modifier"|"action";
  colSpan?:number;
  rowSpan?:number;
};

export const FUNCTION_CLUSTERS:KeyDef[][]=[
  [{k:"escape",label:"Esc",glyph:"⎋",kind:"action"}],
  [{k:"f1",label:"F1"},{k:"f2",label:"F2"},{k:"f3",label:"F3"},{k:"f4",label:"F4"}],
  [{k:"f5",label:"F5"},{k:"f6",label:"F6"},{k:"f7",label:"F7"},{k:"f8",label:"F8"}],
  [{k:"f9",label:"F9"},{k:"f10",label:"F10"},{k:"f11",label:"F11"},{k:"f12",label:"F12"}]
];

export const WINDOWS_NUMBER_ROW:KeyDef[]=[
  {k:"backquote",label:"`",glyph:"~"},
  {k:"1"},{k:"2"},{k:"3"},{k:"4"},{k:"5"},{k:"6"},{k:"7"},{k:"8"},{k:"9"},{k:"0"},{k:"-",glyph:"_"},
  {k:"=",glyph:"+"},{k:"backspace",label:"Backspace",glyph:"⌫",w:2,kind:"action"}
];

export const WINDOWS_ROWS:KeyDef[][]=[
  [
    {k:"tab",label:"Tab",glyph:"⇥",w:1.5,kind:"modifier"},
    {k:"q"},{k:"w"},{k:"e"},{k:"r"},{k:"t"},{k:"y"},{k:"u"},{k:"i"},{k:"o"},{k:"p"},{k:"[",glyph:"["},{k:"]",glyph:"]"},
    {k:"\\",glyph:"\\",w:1.5}
  ],
  [
    {k:"caps",label:"Caps Lock",glyph:"⇪",w:1.75,kind:"modifier"},
    {k:"a"},{k:"s"},{k:"d"},{k:"f"},{k:"g"},{k:"h"},{k:"j"},{k:"k"},{k:"l"},{k:";",glyph:":"},{k:"'",glyph:'"'},
    {k:"enter",label:"Enter",glyph:"↵",w:2.25,kind:"action"}
  ],
  [
    {k:"left-shift",label:"Shift",glyph:"⇧",w:2.25,kind:"modifier"},
    {k:"z"},{k:"x"},{k:"c"},{k:"v"},{k:"b"},{k:"n"},{k:"m"},{k:",",glyph:","},{k:".",glyph:"."},{k:"/",glyph:"?"},
    {k:"right-shift",label:"Shift",glyph:"⇧",w:2.75,kind:"modifier"}
  ]
];

export const WINDOWS_BOTTOM_ROW:KeyDef[]=[
  {k:"left-ctrl",label:"Ctrl",glyph:"⌃",w:1.25,kind:"modifier"},
  {k:"win",label:"Windows",glyph:"⊞",w:1.25,kind:"modifier"},
  {k:"left-alt",label:"Alt",glyph:"Alt",w:1.25,kind:"modifier"},
  {k:"space",label:"Space",glyph:"",w:6.25,kind:"modifier"},
  {k:"right-alt",label:"Alt",glyph:"Alt",w:1.25,kind:"modifier"},
  {k:"menu",label:"Menu",glyph:"☰",w:1.25,kind:"modifier"},
  {k:"right-ctrl",label:"Ctrl",glyph:"⌃",w:1.25,kind:"modifier"}
];

export const WINDOWS_COPILOT_BOTTOM_ROW:KeyDef[]=[
  {k:"left-ctrl",label:"Ctrl",glyph:"⌃",w:1.25,kind:"modifier"},
  {k:"win",label:"Windows",glyph:"⊞",w:1.25,kind:"modifier"},
  {k:"left-alt",label:"Alt",glyph:"Alt",w:1.25,kind:"modifier"},
  {k:"space",label:"Space",glyph:"",w:6.25,kind:"modifier"},
  {k:"right-alt",label:"Alt",glyph:"Alt",w:1.25,kind:"modifier"},
  {k:"copilot",label:"Copilot",glyph:"✦",w:1.25,kind:"modifier"},
  {k:"right-ctrl",label:"Ctrl",glyph:"⌃",w:1.25,kind:"modifier"}
];

export const MAC_ROWS:KeyDef[][]=[
  [
    {k:"tab",label:"Tab",glyph:"⇥",w:1.5,kind:"modifier"},
    {k:"q"},{k:"w"},{k:"e"},{k:"r"},{k:"t"},{k:"y"},{k:"u"},{k:"i"},{k:"o"},{k:"p"},{k:"[",glyph:"["},{k:"]",glyph:"]"},
    {k:"\\",glyph:"\\",w:1.5}
  ],
  [
    {k:"caps",label:"Caps Lock",glyph:"⇪",w:1.75,kind:"modifier"},
    {k:"a"},{k:"s"},{k:"d"},{k:"f"},{k:"g"},{k:"h"},{k:"j"},{k:"k"},{k:"l"},{k:";",glyph:":"},{k:"'",glyph:'"'},
    {k:"return",label:"Return",glyph:"↵",w:2.25,kind:"action"}
  ],
  [
    {k:"left-shift",label:"Shift",glyph:"⇧",w:2.25,kind:"modifier"},
    {k:"z"},{k:"x"},{k:"c"},{k:"v"},{k:"b"},{k:"n"},{k:"m"},{k:",",glyph:","},{k:".",glyph:"."},{k:"/",glyph:"?"},
    {k:"right-shift",label:"Shift",glyph:"⇧",w:2.75,kind:"modifier"}
  ]
];

export const MAC_BOTTOM_ROW:KeyDef[]=[
  {k:"left-fn",label:"Fn",glyph:"fn",w:1.25,kind:"modifier"},
  {k:"left-ctrl",label:"Control",glyph:"⌃",w:1.25,kind:"modifier"},
  {k:"left-option",label:"Option",glyph:"⌥",w:1.25,kind:"modifier"},
  {k:"left-command",label:"Command",glyph:"⌘",w:1.25,kind:"modifier"},
  {k:"space",label:"Space",glyph:"",w:5.5,kind:"modifier"},
  {k:"right-command",label:"Command",glyph:"⌘",w:1.25,kind:"modifier"},
  {k:"right-option",label:"Option",glyph:"⌥",w:1.25,kind:"modifier"},
  {k:"right-fn",label:"Fn",glyph:"fn",w:1.25,kind:"modifier"},
  {k:"right-ctrl",label:"Control",glyph:"⌃",w:1.25,kind:"modifier"}
];

export const NAVIGATION_GRID:KeyDef[]=[
  {k:"printscreen",label:"PrtSc",glyph:"⎙"},
  {k:"scrolllock",label:"Scroll",glyph:"⇳"},
  {k:"pause",label:"Pause",glyph:"⏸"},
  {k:"insert",label:"Insert",glyph:"Ins"},
  {k:"home",label:"Home",glyph:"↖"},
  {k:"pageup",label:"Page Up",glyph:"⇞"},
  {k:"delete",label:"Delete",glyph:"⌫"},
  {k:"end",label:"End",glyph:"↘"},
  {k:"pagedown",label:"Page Down",glyph:"⇟"}
];

export const ARROW_GRID:KeyDef[]=[
  {k:"left",label:"Left",glyph:"←"},
  {k:"up",label:"Up",glyph:"↑"},
  {k:"right",label:"Right",glyph:"→"},
  {k:"down",label:"Down",glyph:"↓"}
];

export const NUMPAD_GRID:KeyDef[]=[
  {k:"numlock",label:"Num",glyph:"⇧"},
  {k:"numpad-divide",label:"/",glyph:"÷"},
  {k:"numpad-multiply",label:"*",glyph:"×"},
  {k:"numpad-subtract",label:"-",glyph:"−"},
  {k:"numpad-7",label:"7"},{k:"numpad-8",label:"8"},{k:"numpad-9",label:"9"},
  {k:"numpad-add",label:"+",glyph:"+",rowSpan:2,kind:"action"},
  {k:"numpad-4",label:"4"},{k:"numpad-5",label:"5"},{k:"numpad-6",label:"6"},
  {k:"numpad-1",label:"1"},{k:"numpad-2",label:"2"},{k:"numpad-3",label:"3"},
  {k:"numpad-enter",label:"Enter",glyph:"↵",rowSpan:2,kind:"action"},
  {k:"numpad-0",label:"0",w:2},{k:"numpad-decimal",label:".",glyph:"·"}
];

export const macMediaLabels=[
  {label:"F1",hint:"brightness −"},{label:"F2",hint:"brightness +"},
  {label:"F3",hint:"mission control"},{label:"F4",hint:"launchpad"},
  {label:"F5",hint:"keyboard light −"},{label:"F6",hint:"keyboard light +"},
  {label:"F7",hint:"previous"},{label:"F8",hint:"play / pause"},
  {label:"F9",hint:"next"},{label:"F10",hint:"mute"},{label:"F11",hint:"volume −"},{label:"F12",hint:"volume +"}
];

export function normalizeKey(key:string){
  if(key===" ")return"space";
  return key.length===1?key.toLowerCase():key.toLowerCase();
}
export function nextKey(word:string,index:number){return normalizeKey(word[index]??"");}
