import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * A cache resource.
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 *
 * @alias ResourceLoader
 * @constructor
 *
 * @see ResourceCache
 *
 * @private
 */
function ResourceLoader() {}

Object.defineProperties(ResourceLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof ResourceLoader.prototype
   *
   * @type {string}
   * @readonly
   * @private
   */
  cacheKey: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },
});

/**
 * Loads the resource.
 * @returns {Promise<ResourceLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
ResourceLoader.prototype.load = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Unloads the resource.
 * @private
 */
ResourceLoader.prototype.unload = function () {};

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @returns {boolean} true once all resourced are ready.
 * @private
 */
ResourceLoader.prototype.process = function (frameState) {
  return false;
};

/**
 * Constructs a {@link RuntimeError} from an errorMessage and an error.
 *
 * @param {string} errorMessage The error message.
 * @param {Error} [error] The error.
 *
 * @returns {RuntimeError} The runtime error.
 * @private
 */
ResourceLoader.prototype.getError = function (errorMessage, error) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("errorMessage", errorMessage);
  //>>includeEnd('debug');

  if (defined(error) && defined(error.message)) {
    errorMessage += `\n${error.message}`;
  }

  const runtimeError = new RuntimeError(errorMessage);
  if (defined(error)) {
    runtimeError.stack = `Original stack:\n${error.stack}\nHandler stack:\n${runtimeError.stack}`;
  }

  return runtimeError;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ResourceLoader#destroy
 * @private
 */
ResourceLoader.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the loaded resource.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} 这个物体被摧毁了,destroy().
 *
 * @example
 * resourceLoader = resourceLoader && resourceLoader.destroy();
 *
 * @see ResourceLoader#isDestroyed
 * @private
 */
ResourceLoader.prototype.destroy = function () {
  this.unload();
  return destroyObject(this);
};

export default ResourceLoader;
