import { defaultValue, defined, DeveloperError } from "@cesium/engine";
import knockout from "./ThirdParty/knockout.js";

/**
 * A view model which exposes the properties of a toggle button.
 * @alias ToggleButtonViewModel
 * @constructor
 *
 * @param {Command} command The command which will be executed when the button is toggled.
 * @param {object} [options] 对象，具有以下属性:
 * @param {boolean} [options.toggled=false] A boolean indicating whether the button should be initially toggled.
 * @param {string} [options.tooltip=''] A string containing the button's tooltip.
 */
function ToggleButtonViewModel(command, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(command)) {
    throw new DeveloperError("command is required.");
  }
  //>>includeEnd('debug');

  this._command = command;

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * Gets or sets whether the button is currently toggled.  这个属性是可观察的。
   * @type {boolean}
   * @default false
   */
  this.toggled = defaultValue(options.toggled, false);

  /**
   * 获取或设置button's tooltip.  这个属性是可观察的。
   * @type {string}
   * @default ''
   */
  this.tooltip = defaultValue(options.tooltip, "");

  knockout.track(this, ["toggled", "tooltip"]);
}

Object.defineProperties(ToggleButtonViewModel.prototype, {
  /**
   * Gets the command which will be executed when the button is toggled.
   * @memberof ToggleButtonViewModel.prototype
   * @type {Command}
   */
  command: {
    get: function () {
      return this._command;
    },
  },
});
export default ToggleButtonViewModel;
