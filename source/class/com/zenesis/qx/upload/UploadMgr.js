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
 * Manages uploading of files to the server; this class can use any suitable
 * widget to attach the input[type=file] to, provided the widget includes
 * com.zenesis.qx.upload.MUploadButton.
 *
 * Uploader will use XhrHandler to upload via XMLHttpRequest if supported or
 * will fall back to FormHandler.
 *
 * @require(qx.event.handler.Input)
 */
qx.Class.define("com.zenesis.qx.upload.UploadMgr", {
  extend: qx.core.Object,
  include: [com.zenesis.qx.upload.MParameters],

  construct(widget, uploadUrl) {
    super();
    this.__widgetsData = {};
    if (widget) this.addWidget(widget);
    if (uploadUrl) this.setUploadUrl(uploadUrl);
  },

  events: {
    /**
     * Fired when a file is added to the queue; data is the
     * com.zenesis.qx.upload.File
     */
    addFile: "qx.event.type.Data",

    /**
     * Fired when a file starts to be uploaded; data is the
     * com.zenesis.qx.upload.File
     */
    beginUpload: "qx.event.type.Data",

    /**
     * Fired when a file has been uploaded; data is the
     * com.zenesis.qx.upload.File
     */
    completeUpload: "qx.event.type.Data",

    /**
     * Fired when a file upload has been cancelled; data is the
     * com.zenesis.qx.upload.File
     */
    cancelUpload: "qx.event.type.Data",
  },

  properties: {
    /**
     * The URL to upload to
     */
    uploadUrl: {
      check: "String",
      nullable: false,
      init: "",
      event: "changeUploadUrl",
    },

    /**
     * Whether to automatically start uploading when a file is added
     * (default=true)
     */
    autoUpload: {
      check: "Boolean",
      init: true,
      nullable: false,
      event: "changeAutoUpload",
      apply: "_applyAutoUpload",
    },

    /**
     * Whether to support multiple files (default=true); this is not supported
     * on older browsers
     */
    multiple: {
      check: "Boolean",
      init: true,
      nullable: false,
      event: "changeMultiple",
      apply: "_applyMultiple",
      event: "changeMultiple",
    },

    directory: {
      init: false,
      check: "Boolean",
      nullable: false,
      apply: "_applyDirectory",
      event: "changeDirectory",
    },

    /**
     * Prefix to apply to the name of input fields
     */
    inputNamePrefix: {
      check: "String",
      init: "uploadMgrInput",
      nullable: false,
      event: "changeInputNamePrefix",
    },

    /**
     * Whether the server can only handle multipart/form-data content type
     */
    requireMultipartFormData: {
      check: "Boolean",
      init: true,
      nullable: false,
      event: "changeRequireMultipartFormData",
      apply: "_applyRequireMultipartFormData",
    },
  },

  members: {
    __widgetsData: null,
    __inputSerial: 0,
    __uploadHandler: null,
    __uploadId: 0,

    /**
     * Adds a widget which is to have an input[type=file] attached; this would
     * typically be an instance of com.zenesis.qx.upload.UploadButton (see
     * com.zenesis.qx.upload.MUploadButton for implementing for other widgets)
     */
    addWidget(widget) {
      var appearId = widget.addListenerOnce(
        "appear",
        function (evt) {
          var data = this.__widgetsData[widget.toHashCode()];
          if (data) {
            data.appearId = null;
            var container = widget.getContentElement();
            container.setStyle("overflow", "hidden");
            if (widget.getEnabled() && !data.inputElement)
              container.addAt(this._createInputElement(widget), 0);
            this.__fixupSize(widget);
          }
        },
        this
      );
      var keydownId = null;
      if (qx.core.Environment.get("engine.name") != "gecko") {
        keydownId = widget.addListener(
          "keydown",
          function (evt) {
            var data = this.__widgetsData[widget.toHashCode()];
            if (data && data.inputElement) {
              var dom = data.inputElement.getDomElement();
              if (dom && typeof dom.click == "function") {
                // dom.focus();
                dom.click();
              }
            }
          },
          this
        );
      }
      this.__widgetsData[widget.toHashCode()] = {
        appearId: appearId,
        keydownId: keydownId,
        widget: widget,
        inputElement: null,
      };

      widget.addListener(
        "resize",
        function (evt) {
          this.__fixupSize(widget);
        },
        this
      );
      widget.addListener(
        "changeEnabled",
        function (evt) {
          if (evt.getData()) {
            var container = widget.getContentElement();
            container.addAt(this._createInputElement(widget), 0);
          } else {
            this._removeInputElement(widget);
          }
        },
        this
      );
      if (
        qx.Class.hasMixin(
          widget.constructor,
          com.zenesis.qx.upload.MUploadButton
        )
      ) {
        this.bind("multiple", widget, "multiple");
        this.bind("directory", widget, "directory");
      }
    },

    /**
     * Removes a widget
     *
     * @param widget {qx.ui.core.Widget} Widget to remvove
     */
    removeWidget(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      if (data) {
        if (data.appearId) widget.removeListener(data.appearId);
        if (data.keydownId) widget.removeListener(data.keydownId);
        delete this.__widgetsData[widget.toHashCode()];
      }
    },

    /**
     * Adds a blob to the upload list
     *
     * @param blob    {Blob}    the blob to upload
     * @param params  {Object}  List of params added to the upload params
     */
    addBlob(filename, blob, params) {
      this.getUploadHandler().addBlob(filename, blob, params);
      if (this.getAutoUpload()) this.getUploadHandler().beginUploads();
    },

    /**
     * Helper method that corrects the size of the input element to match the
     * size of the widget
     *
     * @param widget {qx.ui.core.Widget} Widget to fixup size
     */
    __fixupSize(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      if (data && data.inputElement) {
        var bounds = widget.getBounds();
        // It may be that if the widgets icon is styled
        // through a theme, neither label nor icon are set yet.
        // In this situation bounds calculation would fail.
        if (bounds) {
          data.inputElement.setStyles({
            width: bounds.width + "px",
            height: bounds.height + "px",
          });
        }
      }
    },

    // property apply
    _applyAutoUpload(value, oldValue) {
      this.getUploadHandler().beginUploads();
    },

    // property apply
    _applyMultiple(value, oldValue) {
      for (var hash in this.__widgetsData) {
        var data = this.__widgetsData[hash];
        if (data.inputElement) data.inputElement.setMultiple(value);
      }
    },

    // property directory
    _applyDirectory(value, oldValue) {
      for (var hash in this.__widgetsData) {
        var data = this.__widgetsData[hash];
        if (data.inputElement) data.inputElement.setDirectory(value);
      }
    },

    // property apply
    _applyRequireMultipartFormData(value, oldValue) {
      if (this.__uploadHandler)
        throw new Error(
          "Changing the requireMultipartFormData property of " +
            this +
            " has no effect once uploads have started"
        );
    },

    /**
     * Cancels a file being uploaded
     *
     * @param file {String} Upload to cancel
     */
    cancel(file) {
      this.getUploadHandler().cancel(file);
    },

    /**
     * Cancels all files being uploaded
     */
    cancelAll() {
      this.getUploadHandler().cancelAll();
    },

    /**
     * Creates the input[type=file] element
     *
     * @returns
     */
    _createInputElement(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      var name = this.getInputNamePrefix() + "-" + ++this.__inputSerial;
      qx.core.Assert.assertNull(data.inputElement);
      var elem = (data.inputElement = new com.zenesis.qx.upload.InputElement(
        widget,
        name
      ));
      elem.addListenerOnce(
        "change",
        qx.lang.Function.bind(this._onInputChange, this, elem)
      );
      return elem;
    },

    /**
     * Removes the input element - ie discards the current one (which presumably
     * has already been queued for uploading)
     */
    _removeInputElement(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      var elem = data.inputElement;
      var container = widget.getContentElement();
      data.inputElement = null;
      if (elem) container.remove(elem);
    },

    /**
     * Resets the input element - ie discards the current one (which presumably
     * has already been queued for uploading) and creates a new one
     */
    _resetInputElement(widget) {
      this._removeInputElement(widget);
      var container = widget.getContentElement();
      container.addAt(this._createInputElement(widget), 0);
    },

    /**
     * Callback for changes to the input[ty=file]'s value, ie this is called
     * when the user has selected a file to upload
     *
     * @param elem {Element} Element which is affected
     * @param evt {Event} Event data
     */
    _onInputChange(elem, evt) {
      var widget = elem.getWidget();

      this.getUploadHandler().addFile(elem.getDomElement(), widget);
      if (this.getAutoUpload()) this.getUploadHandler().beginUploads();
      this._resetInputElement(widget);
    },

    /**
     * Returns the upload handler
     *
     * @returns
     */
    getUploadHandler() {
      if (!this.__uploadHandler) {
        if (
          com.zenesis.qx.upload.XhrHandler.isSupported(
            this.isRequireMultipartFormData()
          )
        )
          this.__uploadHandler = new com.zenesis.qx.upload.XhrHandler(this);
        else this.__uploadHandler = new com.zenesis.qx.upload.FormHandler(this);
      }
      return this.__uploadHandler;
    },

    /**
     * Sets the upload handler
     *
     * @param elem {AbstractHandler} The upload handler
     */
    setUploadHandler(handler) {
      this.__uploadHandler = handler;
    },

    /**
     * Allocates a new upload ID; this is just a unique number that widgets or
     * application code can use to uniquely identify themselves to the server
     */
    allocateUploadId() {
      return "uploadId:" + ++this.__uploadId;
    },
  },
});
