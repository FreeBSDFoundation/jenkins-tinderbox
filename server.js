// simple proxy server to avoid dealing with CORS for local testing

var http = require('http');
var request = require('request');

http.createServer(function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  req.pipe(request("https://ci.freebsd.org" + req.url)).pipe(res);
}).listen(8000);
console.log('Proxy running on port 8000');
