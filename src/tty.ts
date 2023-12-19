import { OpenMode, openSync } from 'fs';
import tty from 'tty';

function tryOpenSync(path: string, flags: OpenMode) {
  try {
    return openSync(path, flags);
  } catch (e) {
    return;
  }
}

// https://github.com/postgres/postgres/blob/741fb0056eda5e7bd03deb0719121f88b4b9e34a/src/common/sprompt.c#L67
function openTTY() {
  if (process.platform == 'win32') {
    return {
      ttyFdIn: tryOpenSync('CONIN$', 'w+'),
      ttyFdOut: tryOpenSync('CONOUT$', 'w+'),
    };
  }
  return {
    ttyFdIn: tryOpenSync('/dev/tty', 'r'),
    ttyFdOut: tryOpenSync('/dev/tty', 'w'),
  };
}

export function getTTY() {
  const { ttyFdIn, ttyFdOut } = openTTY();
  let stdin: tty.ReadStream | undefined = undefined;
  let stdout: tty.WriteStream | undefined = undefined;

  if (ttyFdIn && tty.isatty(ttyFdIn)) {
    stdin = new tty.ReadStream(ttyFdIn);
  }

  if (ttyFdOut && tty.isatty(ttyFdOut)) {
    stdout = new tty.WriteStream(ttyFdOut);
  }

  return { stdin, stdout };
}
