const js = [
  /package-lock\.json$/,
  /\.min\.(js|css)$/,
  /node_modules\//
]

const matchers = [
  ...js
]

export const isCodeGen = (path: string): boolean => matchers.find(matcher => matcher.test(path)) === undefined ? false : true;
