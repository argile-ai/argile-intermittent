import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@app": path.resolve(__dirname, "./app"),
		},
	},
	server: {
		proxy: {
			"/api/pvgis": {
				target: "https://re.jrc.ec.europa.eu",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/pvgis/, "/api/v5_2"),
			},
		},
	},
});
