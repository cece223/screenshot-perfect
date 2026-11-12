// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

/**
 * Dev-only: the devtools source injector adds `data-tsd-source` to every JSX element.
 * React Three Fiber treats dashed props as nested paths ("data" → "tsd-source") and throws
 * once that value changes on an existing 3D object (e.g. after a hot reload), blanking the
 * game. Strip the attribute from the 3D game files after all other transforms ran.
 */
function stripSourceAttrFrom3D(): Plugin {
  const files = /\/src\/game\/(scene\/[^/]+|Game)\.tsx$/;
  return {
    name: "strip-tsd-source-from-r3f",
    apply: "serve",
    enforce: "post",
    transform(code, id) {
      if (!files.test(id.split("?")[0] ?? "") || !code.includes("data-tsd-source")) return null;
      return {
        code: code
          .replace(/["']data-tsd-source["']\s*:\s*["'][^"']*["']\s*,?/g, "")
          .replace(/\sdata-tsd-source=["'][^"']*["']/g, ""),
        map: null,
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripSourceAttrFrom3D()],
  },
});
