import { defineConfig } from "orval"

export default defineConfig({
  rtt: {
    input: {
      target: "./openapi/rtt.yml",
    },
    output: {
      mode: "single",
      client: "fetch",
      target: "src/generated/rtt.ts",
      baseUrl: "https://data.rtt.io",
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: "./src/rtt/mutator.ts",
          name: "rttFetch",
          extension: ".js",
        },
        fetch: {
          includeHttpResponseReturnType: true,
        },
      },
    },
  },
})
