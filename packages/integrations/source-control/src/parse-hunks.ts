export type Change = UnknownChange | InsertChange | DeleteChange | NormalChange;

export type UnknownChange = {
  content: string;
  type: 'unknown';
  oldLineNumber: number;
  newLineNumber: number;
}

export type InsertChange = {
  content: string;
  type: 'insert';
  lineNumber: number;
}

export type DeleteChange = {
  content: string;
  type: 'delete';
  lineNumber: number;
}

export type NormalChange = {
  content: string;
  type: 'normal';
  oldLineNumber: number;
  newLineNumber: number;
}

export type Hunk = {
  content: string;
  oldStart: number;
  newStart: number;
  oldLines: number;
  newLines: number;
  changes: Change[];
}

const firstLineRegex = /^@@\s+-([0-9]+)(,([0-9]+))?\s+\+([0-9]+)(,([0-9]+))?/;

export function parseHunks(stringifiedHunks: string): Hunk[] {
  if (stringifiedHunks === '') return [];
  const lines = stringifiedHunks.split('\n');
  const hunks: Hunk[] = [];
  let currentHunk: Hunk | undefined;
  let changeOldLine = 0;
  let changeNewLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line === null) throw new Error('Invalid hunk header');
    if (line.startsWith('@@')) {
      const match = firstLineRegex.exec(line)
      if (!match) {
        throw new Error('Invalid hunk header');
      }
      const [_0, oldStart, _2, oldLines, newStart, _5, newLines] = match;

      currentHunk = {
        content: line,
        oldStart: Number(oldStart),
        newStart: Number(newStart),
        oldLines: Number(oldLines) || 1,
        newLines: Number(newLines) || 1,
        changes: []
      };

      hunks.push(currentHunk);
      changeOldLine = currentHunk.oldStart;
      changeNewLine = currentHunk.newStart;
    } else {
      const typeChar = line.slice(0, 1);
      let change: Change;
      switch (typeChar) {
        case '-':
          change = {
            content: line.slice(1),
            type: 'delete',
            lineNumber: changeOldLine
          };
          changeOldLine++;
          break;
        case '+':
          change = {
            content: line.slice(1),
            type: 'insert',
            lineNumber: changeNewLine
          };
          changeNewLine++;
          break;
        case '':
        case ' ':
          change = {
            content: line.slice(1),
            type: 'normal',
            oldLineNumber: changeOldLine,
            newLineNumber: changeNewLine
          };
          changeOldLine++;
          changeNewLine++;
          break;
        case '\\':
          console.log('I am not sure about this one', lines);
        default:
          change = {
            content: line.slice(1),
            type: 'unknown',
            oldLineNumber: changeOldLine,
            newLineNumber: changeNewLine
          };
          changeOldLine++;
          changeNewLine++;
          break;
      }
      if(!currentHunk) throw new Error('No current hunk');
      currentHunk.content += '\n' + line;
      currentHunk.changes.push(change);

    }
  }

  return hunks;

}
