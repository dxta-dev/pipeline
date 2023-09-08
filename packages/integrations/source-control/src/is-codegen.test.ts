import { describe, expect, it } from '@jest/globals';
import { isCodeGen } from './is-codegen';

describe("is-codegen", () =>
  describe('function isCodeGen', () => {
    describe('# JavaScript Projects', () => {      
      
      it('should not match project files', ()=> {
        expect(isCodeGen('index.js')).toStrictEqual(false);
        expect(isCodeGen('./index.js')).toStrictEqual(false);
        expect(isCodeGen('index.ts')).toStrictEqual(false);
        expect(isCodeGen('./index.ts')).toStrictEqual(false);
        expect(isCodeGen('packages/a-module/index.ts')).toStrictEqual(false);
        expect(isCodeGen('./packages/a-module/index.ts')).toStrictEqual(false);
      })

      it('should match the root package-lock.json file', () => {
        expect(isCodeGen('package-lock.json')).toStrictEqual(true);
        expect(isCodeGen('./package-lock.json')).toStrictEqual(true);

        expect(isCodeGen('package-lockajson')).toStrictEqual(false);
        expect(isCodeGen('package-lockaajson')).toStrictEqual(false);
        expect(isCodeGen('package-lock/file/a.json')).toStrictEqual(false);
      })

      it('should match nested package-lock.json files', () => {
        expect(isCodeGen('packages/a-module/package-lock.json')).toStrictEqual(true);
        expect(isCodeGen('./packages/a-module/package-lock.json')).toStrictEqual(true);
      })

      it('should match minified files', ()=> {
        expect(isCodeGen('dist/out.min.js')).toStrictEqual(true);
        expect(isCodeGen('./dist/out.min.js')).toStrictEqual(true);
        
        expect(isCodeGen('dist/out.min.css')).toStrictEqual(true);
        expect(isCodeGen('./dist/out.min.css')).toStrictEqual(true);        
      })

      it('should match node_module files', ()=> {
        expect(isCodeGen('node_modules/@types/node/package.json')).toStrictEqual(true);
        expect(isCodeGen('./node_modules/@types/node/package.json')).toStrictEqual(true);
        
        expect(isCodeGen('packages/core/node_modules/@types/node/package.json')).toStrictEqual(true);
        expect(isCodeGen('./packages/core/node_modules/@types/node/package.json')).toStrictEqual(true);
      })

    })
  })
)