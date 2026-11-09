import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          main: "./worker/index.ts",
          compatibility_flags: ["nodejs_compat"],
          vars: {
            ...(process.env.SUPABASE_URL
              ? { SUPABASE_URL: process.env.SUPABASE_URL }
              : {}),
            ...(process.env.SUPABASE_PUBLISHABLE_KEY
              ? { SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY }
              : {}),
          },
        },
      }),
    ],
  };
});

