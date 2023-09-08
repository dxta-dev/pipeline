export const isCodeGen = (path: string): boolean => {
  return /.?package-lock.json$/.test(path);
}