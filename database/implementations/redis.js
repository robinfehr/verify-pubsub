const Base = require('./base');
const redis = require('redis');

module.exports = class Redis extends Base {
  constructor(options) {
    super();
    this.logger = options.logger;

    if (!options.host) throw new Error('Redis - Host not specified');
    if (!options.port) throw new Error('Redis - Port not specified');
    if (!options.password) throw new Error('Redis - Password not specified');

    const defaults = {
      infoBeat: 10 * 1000, // all 10 seconds
      retry_strategy: (options) => {
        this.logger.info(options);
        return undefined;
      }
    };

    this.options = {
      ...defaults,
      ...options
    };
  }

  connect(callback) {
    let calledBack = false;
    const options = this.options;

    this.clientPubSub = new redis.createClient(options.port || options.socket, options.host, options);
    this.logger.info('Pubsub client created');
    this.clientHeartBeat = new redis.createClient(options.port || options.socket, options.host, options);
    this.logger.info('Heartbeat client created');

    if (options.password) {
      this.logger.info('Heartbeat client authentication starting');
      this.clientHeartBeat.auth(options.password, (err) => {
        if (err) {
          this.logger.error('Heartbeat client authentication failed');
        }
        if (err && !calledBack && callback) {
          calledBack = true;
          if (callback) callback(err);
          return;
        }
        if (err) throw err;
        this.logger.info('Heartbeat client authenticated');
      });

      this.logger.info('Pubsub client authentication starting');
      this.clientPubSub.auth(options.password, (err) => {
        if (err) {
          this.logger.error('Pubsub client authentication failed');
        }
        if (err && !calledBack && callback) {
          calledBack = true;
          if (callback) callback(err);
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
      this.logger.info('Redis - End PubSub')
      this.disconnect();
    });
    this.clientHeartBeat.on('end', () => {
      this.logger.info('Redis - End Info')
      this.disconnect();
    });

    // Error - for both heartbeat and pubsub
    this.clientPubSub.on('error', (err) => {
      this.logger.error(err);
      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });
    this.clientHeartBeat.on('error', (err) => {
      this.logger.error(err);
      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });

    // Connected - for pubsub only
    this.clientPubSub.on('connect', () => {
      this.logger.info('Connected to Redis');
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
      this.logger.info(`A subscriber got attached to the key: ${key}`);
    });
  }

  disconnect(callback) {
    this.stopHeartbeat();
    this.stopPublishing();

    if (this.clientPubSub) {
      this.clientPubSub.end(true);
    }
    if (this.clientHeartBeat) {
      this.clientHeartBeat.end(true);
    }
    this.logger.info('Redis - disconnect');

    if (callback) callback(null, this);
  }

  publish(key, count) {
    this.clientPubSub.publish(key, count);
  }

  setPublishInterval(interval) {
    this.publishInterval = interval;
  }

  subscribe(key, callback) {
    this.clientPubSub.on('message', (channel, countPublished) => {
      callback(channel, countPublished);
    });
    this.clientPubSub.subscribe(key);
    this.logger.info(`Subscribing to the key ${key}`);
  }

  stopHeartbeat() {
    if (this.infoInterval) {
      this.logger.info('Redis - Stopping the Info interval');
      clearInterval(this.infoInterval);
      delete this.infoInterval;
    }
  }

  stopPublishing() {
    if (this.publishInterval) {
      this.logger.info('Redis - Stopping the Publish interval');
      clearInterval(this.publishInterval);
      delete this.publishInterval;
    }
  }

  startHearbeat() {
    const gracePeriod = Math.round(this.options.infoBeat / 2);
    this.infoInterval = setInterval(() => {
      // Abort if client info command takes too long
      const graceTimer = setTimeout(() => {
        if (this.infoInterval) {
          this.logger.error((new Error ('Info timed out after ' + gracePeriod + 'ms (redis)')).stack);
          this.disconnect();
        }
      }, gracePeriod);

      this.clientHeartBeat.info((err) => {
        if (graceTimer) clearTimeout(graceTimer);
        if (err) {
          this.logger.error(err.stack || err);
          return this.disconnect();
        }
      });
    }, this.options.infoBeat);
  }
}
