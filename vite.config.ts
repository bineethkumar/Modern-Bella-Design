import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Make .env values (DATABASE_URL, ADMIN_*, SQUARE_*) visible to server code
  // during local development. On Vercel they come from the project settings.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      // TanStack Start must run before React's plugin.
      tanstackStart({ server: { entry: "server" } }),
      // Nitro packages the server: Node locally, Vercel Functions on Vercel
      // (the Vercel preset is picked automatically when building there).
      nitro(),
      react(),
    ],
  };
});
