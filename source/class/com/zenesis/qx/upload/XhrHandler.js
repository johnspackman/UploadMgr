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

     Parts of this code is based on the work by Andrew Valums (andrew@valums.com)
     and is covered by the GNU GPL and GNU LGPL2 licenses; please see
     http://valums.com/ajax-upload/.

   Authors:
 * John Spackman (john.spackman@zenesis.com)

 ************************************************************************/
/**
 * @ignore(File)
 * @ignore(FileReader)
 * @ignore(FormData)
 */
/**
 * Implementation of AbstractHandler that uses XMLHttpRequest; this is based on
 * work at http://valums.com/ajax-upload/.
 *
 * Call com.zenesis.qx.upload.XhrHandler.isSupported() to check whether this
 * class can be used (otherwise use FormHandler)
 */
qx.Class.define("com.zenesis.qx.upload.XhrHandler", {
  extend: com.zenesis.qx.upload.AbstractHandler,

  members: {
    __extraHeaders: null,

    /**
     * Extra headers to be sent with the XHR upload
     *
     * @param {Map<String,String>} headers
     */
    setExtraHeaders(extraHeaders) {
      this.__extraHeaders = extraHeaders;
    },

    /*
     * @Override
     */
    addBlob(filename, blob, params) {
      var id = "upload-" + this._getUniqueFileId();
      var file = new com.zenesis.qx.upload.File(blob, filename, id);
      if (params) {
        for (var name in params) {
          var value = params[name];
          if (value !== null) file.setParam(name, value);
        }
      }
      this._addFile(file);
    },

    /*
     * @Override
     */
    _createFile(input) {
      var bomFiles = input.files;
      if (!bomFiles || !bomFiles.length) this.debug("No files found to upload via XhrHandler");

      var files = [];
      for (var i = 0; i < bomFiles.length; i++) {
        var bomFile = bomFiles[i];
        var id = "upload-" + this._getUniqueFileId();
        var filename = typeof bomFile.name != "undefined" ? bomFile.name : bomFile.fileName;
        var file = new com.zenesis.qx.upload.File(bomFile, filename, id);
        var fileSize = typeof bomFile.size != "undefined" ? bomFile.size : bomFile.fileSize;
        file.setSize(fileSize);
        files.push(file);
      }

      return files;
    },

    /*
     * @Override
     */
    _doUpload(file) {
      const setRequestHeader = (name, value) => {
        xhr.setRequestHeader(name, value);
        headerLength += name.length + 2 + value.length + 1;
      };

      const sendAsMime = binaryData => {
        body += binaryData + "\r\n";
        body += "--" + boundary + "--";

        xhr.open("POST", action, true);
        setRequestHeader("X-Requested-With", "XMLHttpRequest");
        setRequestHeader("X-File-Name", encodeURIComponent(file.getFilename()));
        setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        if (this.__extraHeaders) {
          for (let key in this.__extraHeaders) {
            setRequestHeader(key, this.__extraHeaders[key]);
          }
        }
        xhr.send(body);
      };

      /*
       * The upload progress includes the size of the headers, but we cannot ask XMLHttpRequest what the
       * headers were so we count the headers we set and also add these below.  This is never going to be
       * completely accurate, but it gets us a lot closer.
       */
      var headerLength = 0;
      var DEFAULT_HEADERS = {
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en,en-US;q=0.8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Length": "" + file.getSize(),
        "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundaryTfptZDRmE8C3dZmW",
        Host: document.location.host,
        Pragma: "no-cache",
        Referer: document.location.href,
        "User-Agent": navigator.userAgent
      };

      if (document.location.origin) {
        DEFAULT_HEADERS.Origin = document.location.origin;
      }
      for (var key in DEFAULT_HEADERS) {
        headerLength += key.length + 2 + DEFAULT_HEADERS[key].length + 1;
      }
      if (this.__extraHeaders) {
        for (let key in this.__extraHeaders) {
          headerLength += key.length + 2 + this.__extraHeaders[key].length + 1;
        }
      }

      var xhr = new XMLHttpRequest();
      if (com.zenesis.qx.upload.XhrHandler.isWithCredentials()) {
        xhr.withCredentials = true;
      }

      var self = this;

      file.setUserData("com.zenesis.qx.upload.XhrHandler", xhr);

      xhr.upload.onprogress = function (e) {
        self.debug(
          "onprogress: lengthComputable=" +
            e.lengthComputable +
            ", total=" +
            e.total +
            ", loaded=" +
            e.loaded +
            ", headerLength=" +
            headerLength
        );
        if (e.lengthComputable) {
          file.setSize(e.total - headerLength);
          file.setProgress(e.loaded - headerLength);
        }
      };

      const onFileUploaded = () => {
        if (file.getState() == "uploading") {
          file.setUserData("com.zenesis.qx.upload.XhrHandler", null);
          file.setStatus(xhr.status);
          self._onCompleted(file, xhr.responseText);
        }
      };

      //xhr.upload.onload = onFileUploaded;

      xhr.onreadystatechange = function () {
        console.log("upload xhr: readyState=" + xhr.readyState);
        if (xhr.readyState == 4) {
          onFileUploaded();
        }
      };

      if (typeof FormData == "function" || typeof FormData == "object") {
        var fd = new FormData();

        // build query string
        var action = this._getUploader().getUploadUrl();
        var params = this._getMergedParams(file);
        for (var name in params) fd.append(name, encodeURIComponent(params[name]));
        fd.append("file", file.getBrowserObject());

        xhr.open("POST", action, true);
        setRequestHeader("X-Requested-With", "XMLHttpRequest");
        setRequestHeader("X-File-Name", encodeURIComponent(file.getFilename()));
        if (this.__extraHeaders) {
          for (let key in this.__extraHeaders) {
            setRequestHeader(key, this.__extraHeaders[key]);
          }
        }
        xhr.send(fd);
      } else {
        var browserFile = file.getBrowserObject();
        var boundary = "--------FormData" + Math.random(),
          body = "",
          action = this._getUploader().getUploadUrl(),
          params = this._getMergedParams(file);
        for (var name in params) {
          body += "--" + boundary + "\r\n";
          body += 'Content-Disposition: form-data; name="' + name + '";\r\n\r\n';
          body += params[name] + "\r\n";
        }
        body += "--" + boundary + "\r\n";
        body += 'Content-Disposition: form-data; name="file"; filename="' + file.getFilename() + '"\r\n';
        body += "Content-Type: " + (browserFile.type || "application/octet-stream") + "\r\n\r\n";

        if (typeof browserFile.getAsBinary == "function") {
          sendAsMime(browserFile.getAsBinary());
        } else {
          var reader = new FileReader();
          reader.onload = function (evt) {
            sendAsMime(evt.target.result);
          };
          reader.readAsBinaryString(browserFile);
        }
      }
    },

    /*
     * @Override
     */
    _doCancel(file) {
      var xhr = file.getUserData("com.zenesis.qx.upload.XhrHandler");
      if (xhr) {
        xhr.abort();
        file.setUserData("com.zenesis.qx.upload.XhrHandler", null);
      }
    }
  },

  statics: {
    __withCredentials: false,

    /**
     * Detects whether this handler is support on the current browser
     *
     * @returns {Boolean}
     */
    isSupported(requireMultipartFormData) {
      var input = document.createElement("input");
      input.type = "file";

      var isSupported =
        "multiple" in input && typeof File != "undefined" && typeof new XMLHttpRequest().upload != "undefined";

      return isSupported;
    },

    /**
     * Whether to set XMLHttpRequest.withCredentials (used for CORS uploads wth
     * cookies)
     */
    setWithCredentials(value) {
      this.__withCredentials = true;
    },

    /**
     * Whether to set XMLHttpRequest.withCredentials (used for CORS uploads wth
     * cookies)
     */
    isWithCredentials() {
      return this.__withCredentials;
    }
  }
});
