import { motion, useSpring, useTransform } from "motion/react";
import { useEffect, type CSSProperties } from "react";
import "./Counter.css";

type CounterPlace = number | ".";
export interface CounterProps {
  value: number;
  fontSize?: number;
  padding?: number;
  places?: CounterPlace[];
  gap?: number;
  borderRadius?: number;
  horizontalPadding?: number;
  textColor?: string;
  fontWeight?: CSSProperties["fontWeight"];
  containerStyle?: CSSProperties;
  counterStyle?: CSSProperties;
  digitStyle?: CSSProperties;
  gradientHeight?: number;
  gradientFrom?: string;
  gradientTo?: string;
  topGradientStyle?: CSSProperties;
  bottomGradientStyle?: CSSProperties;
}

function Number({mv,number,height}:{mv:any;number:number;height:number}){
  const y=useTransform(mv,(latest:number)=>{
    const placeValue=latest%10;
    const offset=(10+number-placeValue)%10;
    let memo=offset*height;
    if(offset>5)memo-=10*height;
    return memo;
  });
  return <motion.span className="counter-number" style={{y}}>{number}</motion.span>;
}

function normalizeNearInteger(num:number){
  const nearest=Math.round(num);
  const tolerance=1e-9*Math.max(1,Math.abs(num));
  return Math.abs(num-nearest)<tolerance?nearest:num;
}

function getValueRoundedToPlace(value:number,place:number){
  const scaled=value/place;
  return Math.floor(normalizeNearInteger(scaled));
}

function Digit({place,value,height,digitStyle}:{place:CounterPlace;value:number;height:number;digitStyle?:CSSProperties}){
  const isDecimal=place===".";
  const isDot=place===".";
  const valueRoundedToPlace=isDot?0:getValueRoundedToPlace(value,place as number);
  const animatedValue=useSpring(valueRoundedToPlace);
  useEffect(()=>{
    if(!isDot)animatedValue.set(valueRoundedToPlace);
  },[animatedValue,valueRoundedToPlace,isDot]);
  if(isDot){
    return <span className="counter-digit" style={{height,...digitStyle,width:"fit-content"}}>.</span>;
  }
  return <span className="counter-digit" style={{height,...digitStyle}}>
    {Array.from({length:10},(_,i)=><Number key={i} mv={animatedValue} number={i} height={height}/>)}
  </span>;
}

export default function Counter({
  value,
  fontSize=100,
  padding=0,
  places=[...value.toString()].map((ch,i,a)=>{
    if(ch===".")return ".";
    const decimalIndex=a.indexOf(".");
    return 10**(decimalIndex===-1?a.length-i-1:i<decimalIndex?decimalIndex-i-1:-(i-decimalIndex));
  }),
  gap=8,
  borderRadius=4,
  horizontalPadding=8,
  textColor="inherit",
  fontWeight="inherit",
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight=16,
  gradientFrom="black",
  gradientTo="transparent",
  topGradientStyle,
  bottomGradientStyle
}:CounterProps){
  const height=fontSize+padding;
  const defaultCounterStyle:CSSProperties={
    fontSize,
    gap,
    borderRadius,
    paddingLeft:horizontalPadding,
    paddingRight:horizontalPadding,
    color:textColor,
    fontWeight,
    direction:"ltr"
  };
  const defaultTopGradientStyle:CSSProperties={
    height:gradientHeight,
    background:`linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`
  };
  const defaultBottomGradientStyle:CSSProperties={
    height:gradientHeight,
    background:`linear-gradient(to top, ${gradientFrom}, ${gradientTo})`
  };
  return <span className="counter-container" style={containerStyle}>
    <span className="counter-counter" style={{...defaultCounterStyle,...counterStyle}}>
      {places.map(place=><Digit key={String(place)} place={place} value={value} height={height} digitStyle={digitStyle}/>)}
    </span>
    <span className="gradient-container">
      <span className="top-gradient" style={topGradientStyle??defaultTopGradientStyle}></span>
      <span className="bottom-gradient" style={bottomGradientStyle??defaultBottomGradientStyle}></span>
    </span>
  </span>;
}
