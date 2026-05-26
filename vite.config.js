import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { resolve as _resolve } from "path";
import { renderIndex } from "./demo-server/templates";

function demoServerPlugin() {
  return {
    name: "pf-authn-demo-server",
    configureServer(server) {
      const options = {
        baseUrl: process.env.BASEURL,
        operationMode: process.env.OPERATIONMODE || "default",
        useViteDevBundle: true,
      };

      console.log("#############################################");
      console.log("#");
      console.log(`# Dev server options: ${JSON.stringify(options)}`);
      console.log("#");
      console.log("#############################################");
      console.log("");

      server.middlewares.use((req, res, next) => {
        const url = (req.url || "").split("?")[0];
        if (url === "/") {
          renderIndex(res, options);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [basicSsl(), demoServerPlugin()],
  resolve: {
    alias: {
      handlebars: "handlebars/dist/handlebars.js",
    },
  },
  server: {
    https: true,
    port: 8443,
  },
  build: {
    sourcemap: true,
    lib: {
      entry: _resolve(__dirname, "src/index.js"),
      name: "PfAuthnWidget",
      formats: ["umd"],
      fileName: () => "pf.authn-widget.js",
      cssFileName: "main-styles",
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name === "style.css"
            ? "main-styles.css"
            : "[name][extname]",
      },
    },
  },
});
