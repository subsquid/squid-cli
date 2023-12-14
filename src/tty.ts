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
    ttyFdIn: fs.openSync('/dev/tty', 'r'),
    ttyFdOut: fs.openSync('/dev/tty', 'w'),
  };
}

const { ttyFdIn, ttyFdOut } = getTTY();

assert(tty.isatty(ttyFdIn));
const stdin = new tty.ReadStream(ttyFdIn);

assert(tty.isatty(ttyFdOut));
const stdout = new tty.WriteStream(ttyFdOut);

export { stdin, stdout };
