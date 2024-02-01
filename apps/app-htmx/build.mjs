import * as esbuild from "esbuild";

await esbuild.build({
    keepNames: true,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "esnext",
    metafile: true,
    outdir: "out",
    entryPoints: ["src/index.ts"],
    mainFields: ["module", "main"],
    external: [
        '@clerk/fastify',
        '@fastify/formbody',
        '@fastify/view',
        'fastify',
        'nunjucks',
    ],
    banner: {
        js: [
            `import { createRequire as topLevelCreateRequire } from 'module';`,
            `const require = topLevelCreateRequire(import.meta.url);`,
            `import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"`,
            `const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))`,
        ].join("\n"),
    },

});