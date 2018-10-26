module.exports = function exists(toCheck) {
  var _exists = require('fs').existsSync || require('path').existsSync;
  if (require('fs').accessSync) {
    _exists = function (toCheck) {
      try {
        require('fs').accessSync(toCheck);
        return true;
      } catch (e) {
        return false;
      }
    };
  }
  return _exists(toCheck);
}

