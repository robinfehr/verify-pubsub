const Base = require('./base');
const redis = require('redis');

module.exports = class Redis extends Base {
  constructor(options) {
    super();

    if (!options.host) throw new Error('Redis - Host not specified');
    if (!options.port) throw new Error('Redis - Port not specified');
    if (!options.password) throw new Error('Redis - Password not specified');

    const defaults = {
      max_attempts: 1,
      retry_strategy: function (options) {
        return undefined;
      },
      infoBeat: 10 * 1000, // all 10 seconds
    };

    this.notified = {
      subscribers: false
    };
    this.options = {
      ...defaults,
      options
    };
  }

  connect(callback) {
    let calledBack = false;
    const options = this.options;

    this.client = new redis.createClient(options.port || options.socket, options.host, options);
    console.log('should have set the client')

    if (options.password) {
      this.client.auth(options.password, (err) => {
        if (err && !calledBack && callback) {
          calledBack = true;
          if (callback) callback(err, this);
          return;
        }
        if (err) throw err;
      });
    }

    if (options.db) {
      this.client.select(options.db);
    }

    this.client.on('end', () => {
      this.disconnect(); this.stopHeartbeat();
    });

    this.client.on('error', (err) => {
      console.error(err);
      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      if (options.db) {
        this.client.send_anyways = true;
        this.client.select(options.db);
        this.client.send_anyways = false;
      }

      if (this.options.infoBeat) {
        this.startHearbeat();
      }

      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });

    this.client.on('subscribe', (key) => {
      console.info(`A subscriber got attached to the key: ${key}`);
    });
  }

  disconnect(callback) {
    this.stopHeartbeat();

    if (this.client) {
      this.client.end(true);
    }
    this.emit('disconnect');
    if (callback) callback(null, this);
  }

  publish(key, count) {
    this.client.publish(key, count);
  }

  subscribe(key, callback) {
    this.client.on('message', (channel, countPublished) => {
      callback(channel, countPublished);
    });
    this.client.subscribe(key);
    console.info(`Subscribing to the key ${key}`);
  }

  stopHeartbeat() {
    if (this.infoInterval) {
      clearInterval(this.infoInterval);
      delete this.infoInterval;
    }
  }

  startHearbeat() {
    const gracePeriod = Math.round(this.options.infoBeat / 2);
    this.infoBeatInterval = setInterval(function () {
      // Abort if client info command takes too long
      const graceTimer = setTimeout(() => {
        if (this.infoBeatInterval) {
          console.error((new Error ('Info timed out after ' + gracePeriod + 'ms (redis)')).stack);
          this.disconnect();
        }
      }, gracePeriod);

      this.client.info((err) => {
        if (graceTimer) clearTimeout(graceTimer);
        if (err) {
          console.error(err.stack || err);
          return this.disconnect();
        }
      });
    }, this.options.infoBeat);
  }
}
