module.exports = {
  printProgress:  (progress) => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress + '%');
  }
}
