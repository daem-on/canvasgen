import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/lib/lib.ts",
			name: "canvasgen",
		},
	}
});
