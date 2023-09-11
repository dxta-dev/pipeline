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

    test('# Python CodeGen', () => {
      // Example vendor code
      assertIsNotCodeGen('main.py');
      assertIsNotCodeGen('src/main.py');
      // pipenv
      assertIsCodeGen('Pipfile.lock');
      // bytecode folder 
      assertIsCodeGen('__pycache__/main.pyc');
      assertIsCodeGen('src/__pycache__/main.pyc');
    });

    test('# Java CodeGen', () => {
      // maven local repository
      assertIsCodeGen('src/.m2/file');
    });

    test('# .NET CodeGen', () => {
      // VS designer partial classes
      assertIsCodeGen('src/Code.Designer.cs');
      assertIsCodeGen('src/Code.Designer.vb');
      assertIsCodeGen('src/Code.designer.cs');
      assertIsCodeGen('src/Code.Designer.cs');
      // VS SpecFlow
      assertIsCodeGen('src/Code.Feature.cs');
      assertIsCodeGen('src/Code.feature.cs');
    });

    test('# Ruby CodeGen', () => {
      assertIsCodeGen('src/Gemfile.lock');
    });

    test('# PHP CodeGen', () => {
      assertIsCodeGen('src/composer.lock');
    });

    test('# Swift CodeGen', () => {
      assertIsCodeGen('src/.swiftpm/file');
      assertIsCodeGen('src/Package.resolved');
    });

    test('# Go CodeGen', () => {
      assertIsCodeGen('src/Gopk.lock');
      assertIsCodeGen('src/glide.lock');
      assertIsCodeGen('src/vendor/github.com/foo.go');
      assertIsCodeGen('src/Godeps/Godeps.json');
    });

    test('# Rust CodeGen', ()=> {
      assertIsCodeGen('src/Cargo.lock');
    });

    test('# IDE files', () => {
      assertIsCodeGen('.idea/file');
      assertIsCodeGen('.vscode/file');
      assertIsCodeGen('.vim/file');
      // Xcode
      assertIsCodeGen('src/.xcodeproj/file');
      assertIsCodeGen('src/file.nib');
      assertIsCodeGen('src/file.xcworkspacedata');
      assertIsCodeGen('src/file.xcuserstate');
    });

  })
)