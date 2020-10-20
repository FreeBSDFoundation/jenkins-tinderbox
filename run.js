var express = require('express');
var fs = require('fs')
var app = express();

app.use(express.static(__dirname)); 
app.get('/', function(req, res){
    fs.readFile('test.html', function(err, text) {
        res.setHeader('Content-Type', 'text/html');
        res.end(text);
    })
});

app.listen(3000);
console.log('Listening on port 3000');
