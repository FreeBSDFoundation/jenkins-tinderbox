// simple proxy server to avoid dealing with CORS for local testing

var http = require('http');
var request = require('request');

http.createServer(function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  req.pipe(request('http://localhost:8180' + req.url)).pipe(res);
}).listen(8000);
