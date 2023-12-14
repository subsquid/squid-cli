import assert from 'assert';
import fs from 'fs';
import tty from 'tty';

// https://github.com/postgres/postgres/blob/741fb0056eda5e7bd03deb0719121f88b4b9e34a/src/common/sprompt.c#L67
function getTTY() {
  if (process.platform == 'win32') {
    return {
      ttyFdIn: fs.openSync('CONIN$', 'w+'),
      ttyFdOut: fs.openSync('CONOUT$', 'w+'),
    };
  }
  return {
    ttyFdIn: fs.existsSync('/dev/tty') ? fs.openSync('/dev/tty', 'r') : undefined,
    ttyFdOut: fs.existsSync('/dev/tty') ? fs.openSync('/dev/tty', 'w') : undefined,
  };
}

const { ttyFdIn, ttyFdOut } = getTTY();
let stdin: tty.ReadStream | undefined = undefined;
let stdout: tty.WriteStream | undefined = undefined;

if (ttyFdIn !== undefined) {
  assert(tty.isatty(ttyFdIn));
  stdin = new tty.ReadStream(ttyFdIn);
}

if (ttyFdOut !== undefined) {
  assert(tty.isatty(ttyFdOut));
  stdout = new tty.WriteStream(ttyFdOut);
}

export { stdin, stdout };
