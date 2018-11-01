const readline = require('readline');
module.exports = {
  printProgress:  (progress) => {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
    process.stdout.write(progress + '%');
  }
}
