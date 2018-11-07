const NotImplementedError = require('../../utils/errors').NotImplementedError;

/**
 * Interface for database implementations.
 * @param {Object} options The options can have information like host, port, etc. [optional]
 */
module.exports = class Base {
  /**
   * Initiate communication with the lock.
   * @param  {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err, queue){}`
   */
  connect() { throw new NotImplementedError }
  /**
   * Terminate communication with the lock.
   * @param  {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err){}`
   */
  disconnect() { throw new NotImplementedError}
  /**
   * Implements the publish using the API of the database.
   * Publishes the count to the key specified via argv.
   * Count will be used by the subscirbers to check for message loss.
   * @key  {String} is the key/ channel where the messages get publish to.
   * @count  {Number} The number we want to publish (we only publiish numbers to verify the test).
   * @method  {String} Method e.g. use (set / get) or (pub / sub).
   */
  set(key, count) { throw new NotImplementedError}
  /**
   * Sets the publishInterval which will be closed if an error occurs.
   * @interval {Number} Id of the interval retrieved by the return value of setInterval.
   */
  setInterval(interval) { throw new NotImplementedError }
  /**
   * Implements the subscription for the above published counts using the API of the database.
   * @key  {String} is the key/ channel where we subscribe to.
   * @callback  {Function} fn that has to be called on message retrieval.
   * @method  {String} method e.g. pubusb
   */
  listen(key, callback) { throw new NotImplementedError}
  /**
   * Heartbeat start to check whether the db is up and running.
   * We need to detect a unavailability because we can't guarantee the sucessfullness
   * if the database had donwtimes.
   */
  startHearbeat() { throw new NotImplementedError}
  /**
   * Heartbeat stop.
   */
  stopHeartbeat() { throw new NotImplementedError}
};
