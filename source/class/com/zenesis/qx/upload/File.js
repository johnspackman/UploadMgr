/* ***********************************************************************

   UploadMgr - provides an API for uploading one or multiple files
   with progress feedback (on modern browsers), does not block the user 
   interface during uploads, supports cancelling uploads.

   http://qooxdoo.org

   Copyright:
     2011 Zenesis Limited, http://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     
     This software is provided under the same licensing terms as Qooxdoo,
     please see the LICENSE file in the Qooxdoo project's top-level directory 
     for details.

   Authors:
 * John Spackman (john.spackman@zenesis.com)

 ************************************************************************/

/**
 * Represents a file that is to be or has been uploaded; this should be
 * instantiated by the _createFile method of AbstractHandler implementations and
 * is not expected to be used separately
 */
qx.Class.define("com.zenesis.qx.upload.File", {
  extend: qx.core.Object,

  /**
   * Constructor
   *
   * @param browserObject
   *          {DOM} Anythign the AbstractHandler wants to store, typically an
   *          input[type=file] or a File
   * @param filename
   *          {String} the name of the file
   * @param id
   *          {String} the unique id of the file
   */
  construct(browserObject, filename, id) {
    super();
    qx.core.Assert.assertNotNull(browserObject);
    qx.core.Assert.assertNotNull(filename);
    qx.core.Assert.assertNotNull(id);
    this.__browserObject = browserObject;
    this.setFilename(filename);
    this.setId(id);
  },

  properties: {
    /**
     * The filename
     */
    filename: {
      check: "String",
      nullable: false,
      event: "changeFilename",
    },

    /**
     * A unique ID for the upload
     */
    id: {
      check: "String",
      nullable: false,
      event: "changeId",
    },

    /**
     * Size of the file, if known (not available on older browsers)
     */
    size: {
      check: "Integer",
      nullable: false,
      init: -1,
      event: "changeSize",
    },

    /**
     * Progress of the upload, if known (not available on older browsers)
     */
    progress: {
      check: "Integer",
      nullable: false,
      init: 0,
      event: "changeProgress",
    },

    /**
     * State of the file, re: uploading
     */
    state: {
      check: ["not-started", "uploading", "cancelled", "uploaded"],
      nullable: false,
      init: "not-started",
      event: "changeState",
      apply: "_applyState",
    },

    /**
     * The response string received from the server
     */
    response: {
      init: null,
      nullable: true,
      check: "String",
      event: "changeResponse",
    },

    /**
     * The widget that triggered the upload
     */
    uploadWidget: {
      init: null,
      nullable: true,
      event: "changeUploadWidget",
    },

    /**
     * The status of an XHR request. This can be used to determine if the
     * upload was successful.
     */
    status: {
      init: null,
      nullable: true,
      event: "changeStatus",
    },
  },

  members: {
    __browserObject: null,
    __params: null,

    /**
     * Sets a parameter value to be sent with the file
     *
     * @param name
     *          {String} name of the parameter
     * @param value
     *          {String} the value of the parameter, or null to delete a
     *          previous parameter
     */
    setParam(name, value) {
      if (value !== null && typeof value != "string") value = "" + value;
      if (!this.__params) this.__params = {};
      this.__params[name] = value;
    },

    /**
     * Returns a parameter value to be sent with the file
     *
     * @param name {String} Name of the parameter
     * @returns {Boolean}
     */
    getParam(name) {
      return this.__params && this.__params[name];
    },

    /**
     * Returns a list of parameter names
     *
     * @returns {Array}
     */
    getParamNames() {
      var result = [];
      if (this.__params) for (var name in this.__params) result.push(name);
      return result;
    },

    /**
     * Returns the browser object
     *
     * @returns {DOM}
     */
    getBrowserObject() {
      return this.__browserObject;
    },

    // property apply
    _applyState(value, oldValue) {
      qx.core.Assert.assertTrue(
        (!oldValue && value == "not-started") ||
          (oldValue == "not-started" &&
            (value == "cancelled" || value == "uploading")) ||
          (oldValue == "uploading" &&
            (value == "cancelled" || value == "uploaded"))
      );
    },
  },
});
