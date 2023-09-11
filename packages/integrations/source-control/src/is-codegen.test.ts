import { describe, expect, test } from '@jest/globals';
import { isCodeGen } from './is-codegen';

describe("is-codegen", () =>
  describe('function isCodeGen', () => {

    const assertIsCodeGen = (path: string, positive = true) => {
      expect(isCodeGen(path)).toStrictEqual(positive);
    }
    const assertIsNotCodeGen = (path: string) => assertIsCodeGen(path, false);

    test('# JavaScript CodeGen', () => {
      // Example vendor code
      assertIsNotCodeGen('index.js');
      assertIsNotCodeGen('index.ts');
      assertIsNotCodeGen('packages/a-module/index.js');
      assertIsNotCodeGen('packages/a-module/index.ts');
      // npm package-lock
      assertIsCodeGen('package-lock.json');
      assertIsCodeGen('packages/a-module/package-lock.json');
      // npm shrinkwrap
      assertIsCodeGen('npm-shrinkwrap.json');
      assertIsCodeGen('packages/a-module/npm-shrinkwrap.json');
      // minified js and css
      assertIsCodeGen('dist/index.min.js');
      assertIsCodeGen('dist/index.min.css');
      // source maps
      assertIsCodeGen('dist/index.js.map');
      assertIsCodeGen('dist/styles.css.map');
      // node.js node_module folder
      assertIsCodeGen('node_modules/@types/node/package.json');
      assertIsCodeGen('packages/core/node_modules/@types/node/package.json');
      // yarn
      assertIsCodeGen('.pnp.js');
      assertIsCodeGen('.pnp.cjs');
      assertIsCodeGen('.pnp.mjs');
      assertIsCodeGen('.pnp.loader.mjs');
      assertIsCodeGen('.yarn/releases/yarn-x.y.z.cjs');
      // pnpm
      assertIsCodeGen('pnpm-lock.yaml');
      assertIsCodeGen('shrinkwrap.yaml');
      assertIsCodeGen('shrinkwrap.json');
    });
    
  })
)