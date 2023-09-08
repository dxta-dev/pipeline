const js = [
  /package-lock\.json$/, // generated by npm
  /npm-shrinkwrap\.json$/, // generated by npm
  /\.min\.(js|css)$/, // generated by minify tools
  /\.(js|css)\.map$/, // generated by js bundlers/transpilers
  /node_modules\//, // generated by npm
  /yarn\.lock$/, // yarn version of package-lock
  /\.yarn\//, // yarn version of node_modules
  /(^|\/)\.pnp\..*$/, // yarn module resolution scripts
  /pnpm-lock\.yaml$/, // pnpm version of package-lock
  /(^|\/)shrinkwrap\.(yaml|json)$/ // pnpm version of shrinkwrap
]

const python = [
  /Pipfile\.lock$/,
  /__pycache__/,
]

const IDEs = [
  /(^|\/)\.idea\//,
  /(^|\/)\.vscode\//,
  /(^|\/)\.vim\//,
]

const matchers = [
  ...js,
  ...python,
  ...IDEs
]

export const isCodeGen = (path: string): boolean => !!matchers.find(matcher => matcher.test(path));
