import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  test: {
    include: ["src/**/*.test.ts", "tools/**/*.test.ts"],
    environment: "node",
  },
});
