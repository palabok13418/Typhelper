export type KeyDef={
  k:string;
  label?:string;
  glyph?:string;
  w?:number;
  kind?:"key"|"modifier"|"action";
  colSpan?:number;
  rowSpan?:number;
  gridColumn?:number;
  gridRow?:number;
};

export const FUNCTION_CLUSTERS:KeyDef[][]=[
  [{k:"escape",label:"Esc",glyph:"⎋",kind:"action"}],
  [{k:"f1",label:"F1"},{k:"f2",label:"F2"},{k:"f3",label:"F3"},{k:"f4",label:"F4"}],
  [{k:"f5",label:"F5"},{k:"f6",label:"F6"},{k:"f7",label:"F7"},{k:"f8",label:"F8"}],
  [{k:"f9",label:"F9"},{k:"f10",label:"F10"},{k:"f11",label:"F11"},{k:"f12",label:"F12"}]
];

export const MAC_FUNCTION_CLUSTERS:KeyDef[][]=[
  [{k:"escape",label:"Esc",glyph:"⎋",kind:"action"}],
  [
    {k:"f1",label:"F1",glyph:"☼−"},
    {k:"f2",label:"F2",glyph:"☼+"},
    {k:"f3",label:"F3",glyph:"⌘·"},
    {k:"f4",label:"F4",glyph:"✦"}
  ],
  [
    {k:"f5",label:"F5",glyph:"⌨−"},
    {k:"f6",label:"F6",glyph:"⌨+"},
    {k:"f7",label:"F7",glyph:"◀◀"},
    {k:"f8",label:"F8",glyph:"▶∥"}
  ],
  [
    {k:"f9",label:"F9",glyph:"▶▶"},
    {k:"f10",label:"F10",glyph:"🔇"},
    {k:"f11",label:"F11",glyph:"🔉"},
    {k:"f12",label:"F12",glyph:"🔊"}
  ]
];

export const WINDOWS_NUMBER_ROW:KeyDef[]=[
  {k:"backquote",label:"`",glyph:"~"},
  {k:"1",label:"1",glyph:"!"},{k:"2",label:"2",glyph:"@"},{k:"3",label:"3",glyph:"#"},
  {k:"4",label:"4",glyph:"$"},{k:"5",label:"5",glyph:"%"},{k:"6",label:"6",glyph:"^"},
  {k:"7",label:"7",glyph:"&"},{k:"8",label:"8",glyph:"*"},{k:"9",label:"9",glyph:"("},
  {k:"0",label:"0",glyph:")"},{k:"-",label:"-",glyph:"_"},{k:"=",label:"=",glyph:"+"},
  {k:"backspace",label:"Backspace",glyph:"⌫",w:2,kind:"action"}
];

export const WINDOWS_ROWS:KeyDef[][]=[
  [
    {k:"tab",label:"Tab",glyph:"⇥",w:1.5,kind:"modifier"},
    {k:"q",label:"Q"},{k:"w",label:"W"},{k:"e",label:"E"},{k:"r",label:"R"},{k:"t",label:"T"},{k:"y",label:"Y"},{k:"u",label:"U"},{k:"i",label:"I"},{k:"o",label:"O"},{k:"p",label:"P"},
    {k:"[",label:"[",glyph:"{"},{k:"]",label:"]",glyph:"}"},
    {k:"\\",label:"\\",glyph:"|",w:1.5}
  ],
  [
    {k:"caps",label:"Caps Lock",glyph:"⇪",w:1.75,kind:"modifier"},
    {k:"a",label:"A"},{k:"s",label:"S"},{k:"d",label:"D"},{k:"f",label:"F"},{k:"g",label:"G"},{k:"h",label:"H"},{k:"j",label:"J"},{k:"k",label:"K"},{k:"l",label:"L"},
    {k:";",label:";",glyph:":"},{k:"'",label:"'",glyph:'"'},
    {k:"enter",label:"Enter",glyph:"↵",w:2.25,kind:"action"}
  ],
  [
    {k:"left-shift",label:"Shift",glyph:"⇧",w:2.25,kind:"modifier"},
    {k:"z",label:"Z"},{k:"x",label:"X"},{k:"c",label:"C"},{k:"v",label:"V"},{k:"b",label:"B"},{k:"n",label:"N"},{k:"m",label:"M"},
    {k:",",label:",",glyph:"<"},{k:".",label:".",glyph:">"},{k:"/",label:"/",glyph:"?"},
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
    {k:"q",label:"Q"},{k:"w",label:"W"},{k:"e",label:"E"},{k:"r",label:"R"},{k:"t",label:"T"},{k:"y",label:"Y"},{k:"u",label:"U"},{k:"i",label:"I"},{k:"o",label:"O"},{k:"p",label:"P"},
    {k:"[",label:"[",glyph:"{"},{k:"]",label:"]",glyph:"}"},
    {k:"\\",label:"\\",glyph:"|",w:1.5}
  ],
  [
    {k:"caps",label:"Caps Lock",glyph:"⇪",w:1.75,kind:"modifier"},
    {k:"a",label:"A"},{k:"s",label:"S"},{k:"d",label:"D"},{k:"f",label:"F"},{k:"g",label:"G"},{k:"h",label:"H"},{k:"j",label:"J"},{k:"k",label:"K"},{k:"l",label:"L"},
    {k:";",label:";",glyph:":"},{k:"'",label:"'",glyph:'"'},
    {k:"return",label:"Return",glyph:"↵",w:2.25,kind:"action"}
  ],
  [
    {k:"left-shift",label:"Shift",glyph:"⇧",w:2.25,kind:"modifier"},
    {k:"z",label:"Z"},{k:"x",label:"X"},{k:"c",label:"C"},{k:"v",label:"V"},{k:"b",label:"B"},{k:"n",label:"N"},{k:"m",label:"M"},
    {k:",",label:",",glyph:"<"},{k:".",label:".",glyph:">"},{k:"/",label:"/",glyph:"?"},
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
  {k:"printscreen",label:"PrtSc",glyph:"⎙",gridColumn:1,gridRow:1},
  {k:"scrolllock",label:"Scroll",glyph:"⇳",gridColumn:2,gridRow:1},
  {k:"pause",label:"Pause",glyph:"⏸",gridColumn:3,gridRow:1},
  {k:"insert",label:"Insert",glyph:"Ins",gridColumn:1,gridRow:2},
  {k:"home",label:"Home",glyph:"↖",gridColumn:2,gridRow:2},
  {k:"pageup",label:"Page Up",glyph:"⇞",gridColumn:3,gridRow:2},
  {k:"delete",label:"Delete",glyph:"⌫",gridColumn:1,gridRow:3},
  {k:"end",label:"End",glyph:"↘",gridColumn:2,gridRow:3},
  {k:"pagedown",label:"Page Down",glyph:"⇟",gridColumn:3,gridRow:3}
];

export const ARROW_GRID:KeyDef[]=[
  {k:"left",label:"Left",glyph:"←"},
  {k:"up",label:"Up",glyph:"↑"},
  {k:"right",label:"Right",glyph:"→"},
  {k:"down",label:"Down",glyph:"↓"}
];

export const NUMPAD_GRID:KeyDef[]=[
  {k:"numlock",label:"Num Lock",glyph:"Num",gridColumn:1,gridRow:1},
  {k:"numpad-divide",label:"/",glyph:"÷",gridColumn:2,gridRow:1},
  {k:"numpad-multiply",label:"*",glyph:"×",gridColumn:3,gridRow:1},
  {k:"numpad-subtract",label:"-",glyph:"−",gridColumn:4,gridRow:1},
  {k:"numpad-7",label:"7",gridColumn:1,gridRow:2},
  {k:"numpad-8",label:"8",gridColumn:2,gridRow:2},
  {k:"numpad-9",label:"9",gridColumn:3,gridRow:2},
  {k:"numpad-add",label:"+",glyph:"+",gridColumn:4,gridRow:2,rowSpan:2,kind:"action"},
  {k:"numpad-4",label:"4",gridColumn:1,gridRow:3},
  {k:"numpad-5",label:"5",gridColumn:2,gridRow:3},
  {k:"numpad-6",label:"6",gridColumn:3,gridRow:3},
  {k:"numpad-1",label:"1",gridColumn:1,gridRow:4},
  {k:"numpad-2",label:"2",gridColumn:2,gridRow:4},
  {k:"numpad-3",label:"3",gridColumn:3,gridRow:4},
  {k:"numpad-enter",label:"Enter",glyph:"↵",gridColumn:4,gridRow:4,rowSpan:2,kind:"action"},
  {k:"numpad-0",label:"0",gridColumn:1,gridRow:5,w:2},
  {k:"numpad-decimal",label:".",glyph:"·",gridColumn:3,gridRow:5}
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
