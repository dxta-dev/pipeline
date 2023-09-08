import { describe, expect, it } from '@jest/globals';
import { isCodeGen } from './is-codegen';

describe("is-codegen", () =>
  describe('function isCodeGen', () => {
    describe('# JavaScript Projects', () => {

      it('should not match project files', () => {
        expect(isCodeGen('index.js')).toStrictEqual(false);
        expect(isCodeGen('./index.js')).toStrictEqual(false);
        expect(isCodeGen('index.ts')).toStrictEqual(false);
        expect(isCodeGen('./index.ts')).toStrictEqual(false);
        expect(isCodeGen('packages/a-module/index.ts')).toStrictEqual(false);
        expect(isCodeGen('./packages/a-module/index.ts')).toStrictEqual(false);
      })

      it('should match package-lock.json files', () => {
        expect(isCodeGen('package-lock.json')).toStrictEqual(true);
        expect(isCodeGen('./package-lock.json')).toStrictEqual(true);
        expect(isCodeGen('packages/a-module/package-lock.json')).toStrictEqual(true);
        expect(isCodeGen('./packages/a-module/package-lock.json')).toStrictEqual(true);

        expect(isCodeGen('package-lockajson')).toStrictEqual(false);
        expect(isCodeGen('package-lockaajson')).toStrictEqual(false);
        expect(isCodeGen('package-lock/file/a.json')).toStrictEqual(false);
      })

      it('should match npm-shrinkwrap.json files', () => {
        expect(isCodeGen('npm-shrinkwrap.json')).toStrictEqual(true);
        expect(isCodeGen('./npm-shrinkwrap.json')).toStrictEqual(true);

        expect(isCodeGen('packages/a-module/npm-shrinkwrap.json')).toStrictEqual(true);
        expect(isCodeGen('./packages/a-module/npm-shrinkwrap.json')).toStrictEqual(true);
      })

      it('should match minified files', () => {
        expect(isCodeGen('dist/index.min.js')).toStrictEqual(true);
        expect(isCodeGen('./dist/index.min.js')).toStrictEqual(true);

        expect(isCodeGen('dist/styles.min.css')).toStrictEqual(true);
        expect(isCodeGen('./dist/styles.min.css')).toStrictEqual(true);
      })

      it('should match source map files', ()=> {
        expect(isCodeGen('dist/index.js.map')).toStrictEqual(true);
        expect(isCodeGen('./dist/index.js.map')).toStrictEqual(true);

        expect(isCodeGen('dist/styles.css.map')).toStrictEqual(true);
        expect(isCodeGen('./dist/styles.css.map')).toStrictEqual(true);
      })

      it('should match node_module files', () => {
        expect(isCodeGen('node_modules/@types/node/package.json')).toStrictEqual(true);
        expect(isCodeGen('./node_modules/@types/node/package.json')).toStrictEqual(true);

        expect(isCodeGen('packages/core/node_modules/@types/node/package.json')).toStrictEqual(true);
        expect(isCodeGen('./packages/core/node_modules/@types/node/package.json')).toStrictEqual(true);
      })

      it('should match yarn related files', () => {
        expect(isCodeGen('.pnp.cjs')).toStrictEqual(true);
        expect(isCodeGen('.pnp.loader.mjs')).toStrictEqual(true);
        expect(isCodeGen('yarn.lock')).toStrictEqual(true);
        expect(isCodeGen('.yarn/releases/yarn-x.y.z.cjs')).toStrictEqual(true);

        expect(isCodeGen('./.pnp.cjs')).toStrictEqual(true);
        expect(isCodeGen('./.pnp.loader.mjs')).toStrictEqual(true);
        expect(isCodeGen('./yarn.lock')).toStrictEqual(true);
        expect(isCodeGen('./.yarn/releases/yarn-x.y.z.cjs')).toStrictEqual(true);
      })

      it('should match pnpm related files', ()=>{
        expect(isCodeGen('pnpm-lock.yaml')).toStrictEqual(true);
        expect(isCodeGen('shrinkwrap.yaml')).toStrictEqual(true);
        expect(isCodeGen('shrinkwrap.json')).toStrictEqual(true);

        expect(isCodeGen('./pnpm-lock.yaml')).toStrictEqual(true);
        expect(isCodeGen('./shrinkwrap.yaml')).toStrictEqual(true);
        expect(isCodeGen('./shrinkwrap.json')).toStrictEqual(true);
      })
    })
  })
)