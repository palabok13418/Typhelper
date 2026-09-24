import{Analytics}from"@vercel/analytics/react";import{ClerkProvider}from"@clerk/react";import{StrictMode}from"react";import{createRoot}from"react-dom/client";import App,{ComputerRequiredScreen}from"./App";import{isComputerDevice}from"./lib/device-runtime";import"./styles.css";
const key=import.meta.env.VITE_CLERK_PUBLISHABLE_KEY||import.meta.env.CLERK_PUBLISHABLE_KEY;
const computer=isComputerDevice();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {computer
      ?key?<ClerkProvider publishableKey={key}><App clerk/></ClerkProvider>:<App/>
      :<ComputerRequiredScreen/>}
    <Analytics />
  </StrictMode>
);