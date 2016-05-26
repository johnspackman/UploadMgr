/* ***********************************************************************

   UploadMgr - provides an API for uploading one or multiple files
   with progress feedback (on modern browsers), does not block the user
   interface during uploads, supports cancelling uploads.

   http://qooxdoo.org

   Copyright:
     2011 Zenesis Limited, http://www.zenesis.com

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php

     This software is provided under the same licensing terms as Qooxdoo,
     please see the LICENSE file in the Qooxdoo project's top-level directory
     for details.

   Authors:
 * John Spackman (john.spackman@zenesis.com)

 ************************************************************************/

/**
 * Manages uploading of files directly into javascript using the File API
 * specification (https://www.w3.org/TR/file-upload/).
 *
 * @require(qx.event.handler.Input)
 */
qx.Class.define("com.zenesis.qx.upload.FileReader", {
  extend: qx.core.Object,
  include: [ com.zenesis.qx.upload.MParameters ],

  construct: function(widget) {
    this.base(arguments);
    this.__widgetsData = {};
    if (widget) {
      this.addWidget(widget);
    }
  },

  events: {
    /**
     * Fired when the file has been read completely. The data is the file blob.
     * If there are multiple files, the event is fired for each file
     * individually.
     */
    "completeRead": "qx.event.type.Data"
  },

  properties: {
    /**
     * Whether to automatically start uploading when a file is added
     * (default=true)
     */
    autoUpload: {
      check: "Boolean",
      init: true,
      nullable: false,
      event: "changeAutoUpload",
      apply: "_applyAutoUpload"
    },

    /**
     * Prefix to apply to the name of input fields
     */
    inputNamePrefix: {
      check: "String",
      init: "uploadMgrInput",
      nullable: false,
      event: "changeInputNamePrefix"
    }
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
     *
     * @param widget {qx.ui.core.Widget}
     */
    addWidget: function(widget) {
      var appearId = widget.addListenerOnce("appear", function() {
        var data = this.__widgetsData[widget.toHashCode()];
        if (data) {
          data.appearId = null;
          var container = widget.getContentElement();
          container.setStyle("overflow", "hidden");
          if (widget.getEnabled() && !data.inputElement) {
            container.addAt(this._createInputElement(widget), 0);
          }
          this.__fixupSize(widget);
        }
      }, this);
      var keydownId = null;
      if (qx.core.Environment.get("engine.name") !== "gecko") {
        keydownId = widget.addListener("keydown", function() {
          var data = this.__widgetsData[widget.toHashCode()];
          if (data && data.inputElement) {
            var dom = data.inputElement.getDomElement();
            if (dom && typeof dom.click === "function") {
              // dom.focus();
              dom.click();
            }
          }
        }, this);
      }
      this.__widgetsData[widget.toHashCode()] = {
        appearId: appearId,
        keydownId: keydownId,
        widget: widget,
        inputElement: null
      };
      widget.addListener("resize", function() {
        this.__fixupSize(widget);
      }, this);
      widget.addListener("changeEnabled", function(evt) {
        if (evt.getData()) {
          var container = widget.getContentElement();
          container.addAt(this._createInputElement(widget), 0);
        } else {
          this._removeInputElement(widget);
        }
      }, this);
    },

    /**
     * Removes a widget
     *
     * @param widget {qx.ui.core.Widget}
     */
    removeWidget: function(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      if (data) {
        if (data.appearId) {
          widget.removeListener(data.appearId);
        }
        if (data.keydownId) {
          widget.removeListener(data.keydownId);
        }
        delete this.__widgetsData[widget.toHashCode()];
      }
    },

    /**
     * Helper method that corrects the size of the input element to match the
     * size of the widget
     *
     * @param widget {qx.ui.core.Widget}
     */
    __fixupSize: function(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      if (data && data.inputElement) {
        var bounds = widget.getBounds();
        data.inputElement.setStyles({
          width: bounds.width + "px",
          height: bounds.height + "px"
        });
      }
    },

    /**
     * Callback for changes to the autoUpload property
     */
    _applyAutoUpload: function() {
      this.getUploadHandler().beginUploads();
    },

    /**
     * Creates the input[type=file] element
     *
     * @param widget {qx.ui.core.Widget}
     * @return {qx.html.Element}
     */
    _createInputElement: function(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      var name = this.getInputNamePrefix() + '-' + (++this.__inputSerial);
      qx.core.Assert.assertNull(data.inputElement);
      var elem = data.inputElement = new com.zenesis.qx.upload.InputElement(widget, false, name);
      elem.addListenerOnce("change", qx.lang.Function.bind(this._onInputChange, this, elem));

      return elem;
    },

    /**
     * Removes the input element - ie discards the current one (which presumably
     * has already been queued for uploading)
     */
    _removeInputElement: function(widget) {
      var data = this.__widgetsData[widget.toHashCode()];
      var elem = data.inputElement;
      var container = widget.getContentElement();
      data.inputElement = null;
      container.remove(elem);
    },

    /**
     * Resets the input element - ie discards the current one (which presumably
     * has already been queued for uploading) and creates a new one
     */
    _resetInputElement: function(widget) {
      this._removeInputElement(widget);
      var container = widget.getContentElement();
      container.addAt(this._createInputElement(widget), 0);
    },

    /**
     * Callback for changes to the input[ty=file]'s value, ie this is called
     * when the user has selected a file to upload
     */
    _onInputChange: function(elem) {
      var widget = elem.getWidget();

      this.getUploadHandler().addFile(elem.getDomElement());
      if (this.getAutoUpload()) {
        this.getUploadHandler().beginUploads();
      }
      this._resetInputElement(widget);
    },

    /**
     * Returns the upload handler
     */
    getUploadHandler: function() {
      if (!this.__uploadHandler) {
        this.__uploadHandler = new com.zenesis.qx.upload.FileApiHandler(this);
      }
      return this.__uploadHandler;
    }
  }
});
