const exists = require('./utils/exists');
const tolerate = require('tolerance');

function couldFindDbSDKModule() {
  const inlcudesCantFindModule = err.message.includes('Cannot find module');
  const containsApostrophe = err.message.indexOf("'") > 0;
  const lastApostropheIsNotFirst = err.message.lastIndexOf("'") !== err.message.indexOf("'");
  return inlcudesCantFindModule && containsApostrophe && lastApostropheIsNotFirst
}

function getSpecificDbImplementation(options) {
  options.database = options.database.toLowerCase();

  var dbPath = __dirname + "./" + options.database + ".js";
  if (!exists(dbPath)) {
    var errMsg = 'Implementation for db "' + options.database + '" does not exist!';
    console.log(errMsg);
    throw new Error(errMsg);
  }

  try {
    var db = require(dbPath);
    return db;
  } catch (err) {
    if (!couldFindDbSDKModule(err)) {
      const moduleName = err.message.substring(
        err.message.indexOf("'") + 1,
        err.message.lastIndexOf("'")
      );
      console.log(`Please install module ${moduleName} to work with db implementation ${options.database}!`);
    }
    throw err;
  }
}

function connectDb(options, callback) {
  let db = null;
  let dbInstance = null;
  try {
    db = getSpecificDbImplementation(options);
    dbInstance = new db(options);
  } catch (err) {
    if (callback) callback(err);
    throw err;
  }

  if (callback) {
    process.nextTick(() => {
      tolerate(callback => {
        dbInstance.connect(callback);
      },
      options.timeout || 0,
      callback || () => {}
      );
    });
  }
  return dbInstance;
}

module.exports = class DbWrapper {
  constructor(options) {
    this.options = options;
    this.dbInstance = connectDb(options);
  }

  startPublish(key, interval) {
    setInterval(() => {
      this.dbInstance.publish(key, count);
    }, interval);
  },

  startSubscribe(key) {
    this.dbInstance.subscribe(key, (channel, countPublished) => {
      if (channel === key) {
        count++;
        if (countPublished !== this.count) {
          // This is the whole point of the app ;)
          console.warn(new Date(), `Lost messages. Count published: ${countPublished}, Count subscriber: ${count}`);
        }
      }
    });
  }
};
