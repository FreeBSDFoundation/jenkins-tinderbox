var http = require('http');
var fs = require('fs');
var path = require('path');

http.createServer(function(req, res) {
    var filePath = path.join(__dirname, 'example.json');
    var stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': stat.size,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    });

    var readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
})
.listen(8000);
