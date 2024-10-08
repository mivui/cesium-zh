/**
 * 创建全局唯一标识符 （GUID） 字符串。 GUID 的长度为 128 位，可以保证跨空间和时间的唯一性。
 *
 * @function
 *
 * @returns {string}
 *
 *
 * @example
 * this.guid = Cesium.createGuid();
 *
 * @see {@link http://www.ietf.org/rfc/rfc4122.txt|RFC 4122 A Universally Unique IDentifier (UUID) URN Namespace}
 */
function createGuid() {
  // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
export default createGuid;
