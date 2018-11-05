const Base = require('./base');
const redis = require('redis');

module.exports = class Redis extends Base {
  constructor(options) {
    super();
    this.logger = options.logger;
    delete options.logger;
    console.log('Redis - Logger starting init', this.logger);
    this.logger.info('Redis - Logger initiated', this.logger);

    if (!options.host) throw new Error('Redis - Host not specified');
    if (!options.port) throw new Error('Redis - Port not specified');
    if (!options.password) throw new Error('Redis - Password not specified');

    const defaults = {
      infoBeat: 10 * 1000, // all 10 seconds
      retry_strategy: (options) => {
        console.log('before retry');
        this.logger.info(options);
        console.log('after retry');
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

    console.log('before create client 1');
    this.clientPubSub = new redis.createClient(options.port || options.socket, options.host, options);
    console.log('after create client 1');

    console.log('before pubsub 1');
    this.logger.info('Pubsub client created');
    console.log('after pubsub 1');

    console.log('before create client 2');
    this.clientHeartBeat = new redis.createClient(options.port || options.socket, options.host, options);
    console.log('after create client 2');

    console.log('before h1');
    this.logger.info('Heartbeat client created');
    console.log('after h1');

    if (options.password) {
      console.log('before heatbeat start');
      this.logger.info('Heartbeat client authentication starting');
      console.log('after heatbeat start');
      this.clientHeartBeat.auth(options.password, (err) => {
        if (err) {
          console.log('before auth fail');
          this.logger.error('Heartbeat client authentication failed');
          console.log('after auth fail');
        }
        if (err && !calledBack && callback) {
          calledBack = true;
          if (callback) callback(err);
          return;
        }
        if (err) throw err;
        console.log('before auth ok');
        this.logger.info('Heartbeat client authenticated');
        console.log('after auth ok');
      });

      console.log('before pubsub start');
      this.logger.info('Pubsub client authentication starting');
      console.log('after pubsub start');
      this.clientPubSub.auth(options.password, (err) => {
        if (err) {
          console.log('before auth ok pubsub');
          this.logger.error('Pubsub client authentication failed');
          console.log('after auth ok pubsub');
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
      console.log('before pubsub end');
      this.logger.info('Redis - End PubSub')
      console.log('after pubsub end');
      this.disconnect();
    });
    this.clientHeartBeat.on('end', () => {
      console.log('before heartbeat end');
      this.logger.info('Redis - End Info')
      console.log('after heartbeat end');
      this.disconnect();
    });

    // Error - for both heartbeat and pubsub
    this.clientPubSub.on('error', (err) => {
      console.log('before pubsub eror');
      this.logger.error(err);
      console.log('after pubsub eror');
      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });
    this.clientHeartBeat.on('error', (err) => {
      console.log('before hearbeat eror');
      this.logger.error(err);
      console.log('after hearbeat eror');
      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, this);
    });

    // Connected - for pubsub only
    this.clientPubSub.on('connect', () => {
      console.log('bfore pubsub connected');
      this.logger.info('Connected to Redis');
      console.log('aftter pubsub connected');
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
      console.log('before pubsub subscribed');
      this.logger.info(`A subscriber got attached to the key: ${key}`);
      console.log('after pubsub subscribed');
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
    console.log('before gen. discon');
    this.logger.info('Redis - disconnect');
    console.log('after gen. discon');

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
    console.log('before gen subscribing');
    this.logger.info(`Subscribing to the key ${key}`);
    console.log('after gen subscribing');
  }

  stopHeartbeat() {
    if (this.infoInterval) {
      console.log('before ge. heartbeat stop');
      this.logger.info('Redis - Stopping the Info interval');
      console.log('after ge. heartbeat stop');
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
