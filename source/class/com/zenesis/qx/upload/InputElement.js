qx.Class.define("com.zenesis.qx.upload.InputElement", {
  extend: qx.html.Element,

  construct(widget, name) {
    // styling the input[type=file]
    // element is a bit tricky. Some browsers just ignore the normal
    // css style input. Firefox is especially tricky in this regard.
    // since we are providing our one look via the underlying qooxdoo
    // button anyway, all we have todo is position the ff upload
    // button over the button element. This is tricky in itself
    // as the ff upload button consists of a text and a button element
    // which are not css accessible themselfes. So the best we can do,
    // is align to the top right corner of the upload widget and set its
    // font so large that it will cover even realy large underlying buttons.
    var css = {
      position: "absolute",
      cursor: "pointer",
      hideFocus: "true",
      zIndex: widget.getZIndex() + 11,
      opacity: 0,
      // align to the top right hand corner
      top: "0px",
      right: "0px",
      // ff ignores the width setting pick a realy large font size to get
      // a huge button that covers the area of the upload button
      fontFamily: "Arial",
      // from valums.com/ajax-upload: 4 persons reported this, the max values
      // that worked for them were 243, 236, 236, 118
      fontSize: "118px",
    };

    if (
      (qx.core.Environment &&
        qx.core.Environment.get("browser.name") == "ie" &&
        qx.core.Environment.get("browser.version") < 9) ||
      (!qx.core.Environment &&
        qx.bom.client.Engine.MSHTML &&
        qx.bom.client.Engine.VERSION < 9.0)
    ) {
      css.filter = "alpha(opacity=0)";
      css.width = "200%";
      css.height = "100%";
    }

    var attrs = {
      type: "file",
      name: name,
      title: " ",
    };

    super("input", css, attrs);
    if (
      qx.Class.hasMixin(widget.constructor, com.zenesis.qx.upload.MUploadButton)
    ) {
      widget.bind("acceptUpload", this, "acceptUpload");
      widget.bind("multiple", this, "multiple");
      widget.bind("directory", this, "directory");
    }
    this.__relatedWidget = widget;
  },

  properties: {
    acceptUpload: {
      init: null,
      nullable: true,
      check: "String",
      apply: "_applyAcceptUpload",
    },

    multiple: {
      init: false,
      check: "Boolean",
      nullable: false,
      apply: "_applyMultiple",
    },

    directory: {
      init: false,
      check: "Boolean",
      nullable: false,
      apply: "_applyDirectory",
    },
  },

  members: {
    __relatedWidget: null,

    getWidget() {
      return this.__relatedWidget;
    },

    _applyAcceptUpload(value) {
      if (value) this.setAttribute("accept", value, true);
      else this.removeAttribute("accept", true);
    },
    _applyDirectory(value) {
      if (value) this.setAttribute("webkitdirectory", "webkitdirectory", true);
      else this.removeAttribute("webkitdirectory", true);
    },

    _applyMultiple(value) {
      if (value) this.setAttribute("multiple", "multiple", true);
      else this.removeAttribute("multiple", true);
    },
  },
});
