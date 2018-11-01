const exists = require('../utils/exists');
const printProgress = require('../utils/print').printProgress;
const tolerate = require('tolerance');

function couldFindDbSDKModule(err) {
  const inlcudesCantFindModule = err.message.includes('Cannot find module');
  const containsApostrophe = err.message.indexOf("'") > 0;
  const lastApostropheIsNotFirst = err.message.lastIndexOf("'") !== err.message.indexOf("'");
  return inlcudesCantFindModule && containsApostrophe && lastApostropheIsNotFirst
}

function getSpecificDbImplementation(options) {
  options.database = options.database.toLowerCase();

  var dbPath = __dirname + "/implementations/" + options.database + ".js";
  if (!exists(dbPath)) {
    var errMsg = `Implementation for db ${options.database} does not exist!
      Implement the specific database here: ${dbPath}`;
    console.error(errMsg);
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
      callback || function () {}
      );
    });
  }
}

module.exports = class DbWrapper {
  constructor(options, callback) {
    const defaults = {
      progress: false
    };

    this.options = {
      ...defaults,
      ...options
    };

    this.count = 0;
    connectDb(this.options, (err, dbInstance) => {
      if (!err) {
        this.dbInstance = dbInstance;
        callback(this);
      }
    });
  }

  startPublish(key, interval) {
    const showProgress = this.options.progress;
    console.info(`Start publishing to the key ${key} with the interval ${interval}`);
    const publishInterval = setInterval(() => {
      if (showProgress) {
        printProgress(`Publishing count: ${this.count} to the key: ${key}`)
      }
      this.dbInstance.publish(key, this.count);
      this.count++;
    }, interval);
    this.dbInstance.setPublishInterval(publishInterval);
  }

  startSubscribe(key) {
    const showProgress = this.options.progress;
    this.dbInstance.subscribe(key, (channel, countPublished) => {
      if (channel === key) {
        if (Number(countPublished) !== Number(this.count)) {
          // This is the whole point of the app ;)
          console.warn(`Lost messages. Count published: ${countPublished}, Count subscriber: ${this.count}, Time: ${new Date()}`);
        } else {
          if (showProgress) {
            printProgress(`Count publsihed: ${countPublished}, Count subscriber: ${this.count}`);
          }
        }
        this.count++;
      }
    });
  }
};
