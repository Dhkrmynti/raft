import { defineConfig } from "vite";
import fs from "node:fs";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://127.0.0.1:5023" },
    // node_modules may be a link to another checkout (git worktrees): let the dev server read fonts through it
    fs: { allow: [".", fs.realpathSync("node_modules")] },
  },
});
