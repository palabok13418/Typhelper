import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins:[react()],
  define:{
    "import.meta.env.CLERK_PUBLISHABLE_KEY":JSON.stringify(process.env.CLERK_PUBLISHABLE_KEY??"")
  },
  optimizeDeps:{exclude:["@mlc-ai/web-llm"]}
});
