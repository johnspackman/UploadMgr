/* ***********************************************************************

   UploadMgr - provides an API for uploading one or multiple files
   with progress feedback (on modern browsers), does not block the user 
   interface during uploads, supports cancelling uploads.

   http://qooxdoo.org

   Copyright:
     2019 Henner Kollmann

   License:
     MIT: https://opensource.org/licenses/MIT
     
     This software is provided under the same licensing terms as Qooxdoo,
     please see the LICENSE file in the Qooxdoo project's top-level directory 
     for details.

     Parts of this code is based on the work by Andrew Valums (andrew@valums.com)
     and is covered by the GNU GPL and GNU LGPL2 licenses; please see
     http://valums.com/ajax-upload/.

   Authors:
 * Henner Kollmann (henner.kollmann@gmx.de)

 ************************************************************************/
/**
 * @ignore(JSZip)
 */
qx.Class.define("com.zenesis.qx.upload.ZipHandler", {
  extend: com.zenesis.qx.upload.AbstractHandler,

  construct: function(uploader) {
    this.base(arguments, uploader);
    this.__zip = new JSZip();
  },

  members: {
    generateAsync: function(options, onUpdate) {
		return this.__zip.generateAsync(options, onUpdate);
    },		
    
    /*
     * @Override
     */
    addBlob: function (filename, blob, params){
     var id = "upload-" + this._getUniqueFileId();
     var file = new com.zenesis.qx.upload.File(blob, filename, id);
     if (params) {
      for (var name in params) {
         var value = params[name];
         if (value !== null)
           file.setParam(name, value);
      }
     }
     this._addFile(file);
    },
	
      
    /*
     * @Override
     */
    _createFile: function(input) {
      var bomFiles = input.files;
      if (!bomFiles || !bomFiles.length)
        this.debug("No files found to upload via ZipHandler");

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
    _doUpload: function(file) {
	   this.__zip.file(file.getFilename(), file.getBrowserObject());
       this._onCompleted(file, "add to zip");
	   
    },

    /*
     * @Override
     */
    _doCancel: function(file) {
1   },

    __zip: null
  }
});
