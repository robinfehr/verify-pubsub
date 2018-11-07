const Base = require('./base');
const redis = require('redis');

module.exports = class Redis extends Base {
  constructor(options, logger) {
    super();
    if (!options.host) throw new Error('Redis - Host not specified');
    if (!options.port) throw new Error('Redis - Port not specified');
    if (!options.password) throw new Error('Redis - Password not specified');

    this.logger = logger;
    this.infoInterval = null;
    this.publishInterval = null;

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

    this.clientSetGet = new redis.createClient(options.port || options.socket, options.host, options);
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
      this.clientSetGet.auth(options.password, (err) => {
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
      this.clientSetGet.select(options.db);
      this.clientHeartBeat.select(options.db);
    }

    // End - for both heartbeat and pubsub
    this.clientSetGet.on('end', () => {
      this.logger.info('Redis - End PubSub')
      this.disconnect();
    });
    this.clientHeartBeat.on('end', () => {
      this.logger.info('Redis - End Info')
      this.disconnect();
    });

    // Error - for both heartbeat and pubsub
    this.clientSetGet.on('error', (err) => {
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
    this.clientSetGet.on('connect', () => {
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
    this.clientSetGet.on('subscribe', (key) => {
      this.logger.info(`A subscriber got attached to the key: ${key}`);
    });
  }

  disconnect(callback) {
    this.stopHeartbeat();
    this.stopPublishing();
    this.stopListening();

    if (this.clientSetGet) {
      this.clientSetGet.end(true);
    }
    if (this.clientHeartBeat) {
      this.clientHeartBeat.end(true);
    }
    this.logger.info('Redis - disconnect');

    if (callback) callback(null, this);
  }

  set(key, count) {
    // count needs to be a number that so that we can verify if the messages
    // per interval got received properly.
    this.clientSetGet.set(key, count);
  }

  setInterval(interval) {
    this.publishInterval = interval;
  }

  listen(key, callback) {
    // We attach a listener that GET's the value in the same interval
    // as the publisher. We therefore should always see an increase per interval.
    // If not something went wrong.
    this.listenInterval = setInterval(() => {
      const countPublished = this.clientSetGet.get(key, (err, reply) => callback(key, reply));
    }, this.publishInterval);

    this.logger.info(`Listener setup for the key ${key}`);
  }

  stopHeartbeat() {
    if (this.infoInterval) {
      this.logger.info('Redis - Stopping the Info interval');
      clearInterval(this.infoInterval);
      this.infoInterval = null;
    }
  }

  stopPublishing() {
    if (this.publishInterval) {
      this.logger.info('Redis - Stopping the Publish interval');
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }
  }

  stopListening() {
    if (this.listenInterval) {
      this.logger.info('Redis - Stopping the listening interval');
      clearInterval(this.listenInterval);
      this.listenInterval = null;
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
