function levenshteinDistance(a: string, b: string): number {
  let v0: number[] = [];
  let v1: number[] = [];

  for (let i = 0; i <= b.length; i += 1) {
    v0[i] = i;
  }

  for (let i = 0; i < a.length; i += 1) {
    v1[0] = i + 1;

    for (let j = 0; j < b.length; j += 1) {
      const deletionCost = (v0[j + 1] as unknown as number) + 1;
      const insertionCost = (v1[j] as unknown as number) + 1;
      const substitutionCost =
        a[i] === b[j]
          ? (v0[j] as unknown as number)
          : (v0[j] as unknown as number) + 1;

      v1[j + 1] = Math.min(deletionCost, insertionCost, substitutionCost);
    }

    const tmp: number[] = v1;

    v1 = v0;
    v0 = tmp;
  }

  return v0[b.length] as unknown as number;
}

export function compare(
  firstItem: string,
  secondItem: string,
  opts = {},
): boolean {
  if (!firstItem && !secondItem) {
    return true;
  }

  if (firstItem && !secondItem) {
    return false;
  }

  if (secondItem && !firstItem) {
    return false;
  }

  const defaultOptions = {
    threshold: 2,
  };
  const options = {
    ...defaultOptions,
    ...opts,
  };

  return levenshteinDistance(firstItem, secondItem) <= options.threshold;
}
