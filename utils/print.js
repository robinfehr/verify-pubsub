const readline = require('readline');
module.exports = {
  printProgress:  (progress) => {
    readline.clearLine();
    readline.cursorTo(0);
    process.stdout.write(progress + '%');
  }
}
