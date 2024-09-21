import defaultValue from "../Core/defaultValue.js";

/**
 * Represents a burst of {@link Particle}s from a {@link ParticleSystem} at a given time in the systems lifetime.
 *
 * @alias ParticleBurst
 * @constructor
 *
 * @param {object} [options] An 对象，具有以下属性:
 * @param {number} [options.time=0.0] The time in seconds after the beginning of the particle system's lifetime that the burst will occur.
 * @param {number} [options.minimum=0.0] The minimum number of particles emmitted in the burst.
 * @param {number} [options.maximum=50.0] The maximum number of particles emitted in the burst.
 */
function ParticleBurst(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The time in seconds after the beginning of the particle system's lifetime that the burst will occur.
   * @type {number}
   * @default 0.0
   */
  this.time = defaultValue(options.time, 0.0);
  /**
   * The minimum number of particles emitted.
   * @type {number}
   * @default 0.0
   */
  this.minimum = defaultValue(options.minimum, 0.0);
  /**
   * The maximum number of particles emitted.
   * @type {number}
   * @default 50.0
   */
  this.maximum = defaultValue(options.maximum, 50.0);

  this._complete = false;
}

Object.defineProperties(ParticleBurst.prototype, {
  /**
   * <code>true</code> if the burst has been completed; <code>false</code> otherwise.
   * @memberof ParticleBurst.prototype
   * @type {boolean}
   */
  complete: {
    get: function () {
      return this._complete;
    },
  },
});
export default ParticleBurst;
