import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "daymarker",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-30",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: false,
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      DASHBOARD_USERNAME: bindings.secret(),
      DASHBOARD_PASSWORD: bindings.secret(),
      DASHBOARD_SESSION_SECRET: bindings.secret(),
      GOOGLE_SHEET_ID: bindings.secret(),
      GOOGLE_SERVICE_ACCOUNT_JSON: bindings.secret(),
    },
  }),
});
