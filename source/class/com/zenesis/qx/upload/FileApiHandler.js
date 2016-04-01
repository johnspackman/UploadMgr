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
 * Implements the File API (https://www.w3.org/TR/file-upload/).
 */
qx.Class.define("com.zenesis.qx.upload.FileApiHandler", {
  extend: qx.core.Object,

  construct : function(uploader) {
    this.base(arguments);
    this.__uploader = uploader;
    this.__uploadQueue = [];
  },

  members: {

    __uploader : null,
    __uploadQueue : null,

    addFile : function(element) {
      for (var i=0; i < element.files.length; i++) {
        this.__uploadQueue.push(element.files[i]);
      }
    },

    beginUploads : function() {
      this.__uploadQueue.forEach(function(file) {
        var uploader = this.__uploader;
        var reader = new FileReader();
        reader.onload = (function() {
          return function(e) {
            uploader.fireDataEvent("completeRead", e.target.result);
          };
        })(file);
        reader.readAsText(file);
      }, this);
    }
  }
});
