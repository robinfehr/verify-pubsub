const Base = require('./base');
const redis = require('redis');

module.exports = class Redis extends Base {
  constructor(options) {
    super();

    if (!options.host) throw new Error('Redis - Host not specified');
    if (!options.port) throw new Error('Redis - Port not specified');
    if (!options.password) throw new Error('Redis - Password not specified');

    const defaults = {
      infoBeat: 10 * 1000, // all 10 seconds
      retry_strategy: (options) => {
        console.log(options);
        return undefined;
      }
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

    this.clientPubSub = new redis.createClient(options.port || options.socket, options.host, options);
    this.clientHeartBeat = new redis.createClient(options.port || options.socket, options.host, options);

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
      this.clientPubSub.select(options.db);
      this.clientHeartBeat.select(options.db);
    }

    // End - for both heartbeat and pubsub
    this.clientPubSub.on('end', () => {
      console.log('Redis - End PubSub')
      this.disconnect();
    });
    this.clientHeartBeat.on('end', () => {
      console.log('Redis - End Info')
      this.disconnect();
    });

    // Error - for both heartbeat and pubsub
    this.clientPubSub.on('error', (err) => {
      console.error(err);
      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });
    this.clientHeartBeat.on('error', (err) => {
      console.error(err);
      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });

    // Connected - for pubsub only
    this.clientPubSub.on('connect', () => {
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

    // Subscriptions - for pubsub only
    this.clientPubSub.on('subscribe', (key) => {
      console.info(`A subscriber got attached to the key: ${key}`);
    });
  }

  disconnect(callback) {
    this.stopHeartbeat();

    if (this.clientPubSub) {
      this.clientPubSub.end(true);
    }
    if (this.clientHeartBeat) {
      this.clientHeartBeat.end(true);
    }
    console.info('Redis - disconnect');

    if (callback) callback(null, this);
  }

  publish(key, count) {
    this.clientPubSub.publish(key, count);
  }

  subscribe(key, callback) {
    this.clientPubSub.on('message', (channel, countPublished) => {
      callback(channel, countPublished);
    });
    this.clientPubSub.subscribe(key);
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
    this.infoInterval = setInterval(() => {
      // Abort if client info command takes too long
      const graceTimer = setTimeout(() => {
        if (this.infoInterval) {
          console.error((new Error ('Info timed out after ' + gracePeriod + 'ms (redis)')).stack);
          this.disconnect();
        }
      }, gracePeriod);

      this.clientHeartBeat.info((err) => {
        if (graceTimer) clearTimeout(graceTimer);
        if (err) {
          console.error(err.stack || err);
          return this.disconnect();
        }
      });
    }, this.options.infoBeat);
  }
}
