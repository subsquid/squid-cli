import { OpenMode, openSync } from 'fs';
import tty from 'tty';

function tryOpenSync(path: string, flags: OpenMode) {
  try {
    return openSync(path, flags);
  } catch {
    return undefined;
  }
}

// https://github.com/postgres/postgres/blob/741fb0056eda5e7bd03deb0719121f88b4b9e34a/src/common/sprompt.c#L67
function getTTY() {
  if (process.platform == 'win32') {
    return {
      ttyFdIn: tryOpenSync('CONIN$', 'w+'),
      ttyFdOut: tryOpenSync('CONOUT$', 'w+'),
    };
  }
  return {
    ttyFdIn: tryOpenSync('/dev/ttyF', 'r'),
    ttyFdOut: tryOpenSync('/dev/ttyF', 'w'),
  };
}

const { ttyFdIn, ttyFdOut } = getTTY();
let stdin: tty.ReadStream | undefined = undefined;
let stdout: tty.WriteStream | undefined = undefined;

if (ttyFdIn !== undefined && tty.isatty(ttyFdIn)) {
  stdin = new tty.ReadStream(ttyFdIn);
}

if (ttyFdOut !== undefined && tty.isatty(ttyFdOut)) {
  stdout = new tty.WriteStream(ttyFdOut);
}

export { stdin, stdout };
