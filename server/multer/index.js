var fs = require("fs");
var express = require('express');
var cors = require('cors'); 
var multer  = require('multer');

var port = 9090;
var deleteOnUpload = false;
var uploadPath = "uploads";

for (var argv = process.argv, i = 0; i < argv.length; i++) {
	var arg = argv[i];
	if (arg == "--port") {
		port = parseInt(argv[i+1], 10);
		if (isNaN(port) || port < 1) {
			console.log("Cannot parse port number " + argv[i+1]);
			process.exit(1);
		}
		i++;
	} else if (arg == "--deleteOnUpload") {
		deleteOnUpload++;
	} else if (arg == "--uploadPath") {
		uploadPath = argv[++i];
	}
}

var upload = multer({ dest: uploadPath });
var app = express();

app.use(cors());

app.post('/demoupload', upload.array('file'), function (req, res, next) {
	console.log("Files uploaded: "+ JSON.stringify(req.files, null, 2));
	if (deleteOnUpload) {
		req.files.forEach(function(file) {
			fs.unlink(file.path);
		});
	}
  res.send('Uploaded');
})

app.get('/', function (req, res) {
	console.log("GET /");
  res.send('Hello World!');
});

app.use("/qooxdoo", express.static("../../../qooxdoo/framework"));
app.use("/uploadmgr", express.static("../.."));

app.listen(port, function () {
  console.log("Example app listening on port " + port + "!");
});

