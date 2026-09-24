import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  const clerkPublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY ?? env.CLERK_PUBLISHABLE_KEY ?? "";

  return {
    plugins:[react()],
    define:{
      "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY":JSON.stringify(clerkPublishableKey),
      "import.meta.env.CLERK_PUBLISHABLE_KEY":JSON.stringify(clerkPublishableKey)
    },
  };
});
