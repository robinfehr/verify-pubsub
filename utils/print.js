const readline = require('readline');
module.exports = {
  printProgress:  (progress) => {
    process.stdout.write(progress + '%');
  }
}
