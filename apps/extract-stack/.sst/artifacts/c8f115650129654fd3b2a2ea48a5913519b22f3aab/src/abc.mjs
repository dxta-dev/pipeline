import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"
const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/abc.ts
var bandler = /* @__PURE__ */ __name(async (ev) => {
  console.log("ew", ev);
  return {};
}, "bandler");
export {
  bandler
};
//# sourceMappingURL=abc.mjs.map
