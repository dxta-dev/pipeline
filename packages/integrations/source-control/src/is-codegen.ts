const js = [
  /package-lock\.json$/,
  /npm-shrinkwrap\.json$/,
  /\.min\.(js|css)$/,
  /\.(js|css)\.map$/,
  /node_modules\//,
  /yarn\.lock$/,
  /\.yarn\//,
  /(^|\/)\.pnp\..*$/,
  /pnpm-lock\.yaml$/,
  /pnpm-shrinkwrap\.(yaml|json)$/
]

const matchers = [
  ...js
]

export const isCodeGen = (path: string): boolean => !!matchers.find(matcher => matcher.test(path));
