const js = [
  /package-lock\.json$/,
  /npm-shrinkwrap\.json$/,
  /\.min\.(js|css)$/,
  /node_modules\//,
  /yarn\.lock$/,
  /\.yarn\//,
  /(^|\/)\.pnp\..*$/,
]

const matchers = [
  ...js
]

export const isCodeGen = (path: string): boolean => !!matchers.find(matcher => matcher.test(path));
