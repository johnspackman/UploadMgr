var express = require('express')
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

var app = express()

app.post('/demoupload', upload.array('file'), function (req, res, next) {
	console.log("Files uploaded: "+ JSON.stringify(req.files, null, 2));
  res.send('Uploaded');
})

app.get('/', function (req, res) {
	console.log("GET /");
  res.send('Hello World!');
});

app.use("/qooxdoo", express.static("../../../qooxdoo/framework"));
app.use("/uploadmgr", express.static("../.."));

app.listen(8080, function () {
  console.log('Example app listening on port 8080!');
});

