import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins:[react()],
    define:{
      "import.meta.env.CLERK_PUBLISHABLE_KEY":JSON.stringify(env.CLERK_PUBLISHABLE_KEY??"")
    },
  };
});
