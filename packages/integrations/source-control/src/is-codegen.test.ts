import { describe, expect, it } from '@jest/globals';
import { isCodeGen } from './is-codegen';

describe("is-codegen", () =>
  describe('js-codegen', () =>
    describe('isCodeGen', () => {
      it('should match the root package-lock.json file', () => {
        expect(isCodeGen('package-lock.json')).toStrictEqual(true);
        expect(isCodeGen('./package-lock.json')).toStrictEqual(true);
      })

      it('should match nested package-lock.json files', () => {
        expect(isCodeGen('packages/a-module/package-lock.json')).toStrictEqual(true);
        expect(isCodeGen('./packages/a-module/package-lock.json')).toStrictEqual(true);
      })

    })
  )
)