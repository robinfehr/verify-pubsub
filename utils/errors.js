module.exports = {
  NotImplementedError: class NotImplementedError extends Error {
    constructor(message, ...params) {
      // Pass remaining arguments (including vendor specific ones) to parent constructor
      super(...params);

      // Maintains proper stack trace for where our error was thrown (only available on V8)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, NotImplementedError);
      }

      // Custom debugging information
      this.message = message;
      this.date = new Date();
    }
  }
}
