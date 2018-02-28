var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var azure = require('azure-storage');
var multiparty = require('multiparty');
var uuidv1 = require('uuid/v1');
var os = require('os');
var shouldRun = true;


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/host', function(req, res){
    res.sendFile(path.join(__dirname, 'views/host.html'));
  });

app.get('/health.html', function(req, res){
        res.status(200).send('HEALTHY');
});

app.get('/data', function (req, res) {

  //Create connection to azure tableservice
  var tableSvc = azure.createTableService();

  //Create a date object 1Hr behind current time
  var dateVal = new Date(new Date().getTime() - 60 * 60 * 24 * 1000);  
  
  //Create a query to find table rows that have a timestamp greater than query time
  var query = new azure.TableQuery().select('data').where('Timestamp >= ?date?', dateVal);

  //Create a query that finds top 5 where partition key equals images.
  //var query = new azure.TableQuery().select('data').top(5).where('PartitionKey eq ?', 'images');

  tableSvc.queryEntities('imageTable',query, null, function(error, result, response) {
     if(!error) {
        // query was successful
        console.log("Found: " + result.entries.length)
        var results = [];

        var server = {
            "hostname" : os.hostname(),
            "osname" : os.type(),
            "osplatform" : os.platform(),
            "osrelease" : os.release(),
            "osuptime" : os.uptime(),
            "osnics" : os.networkInterfaces(),
            "cpuarch" : os.arch(),
            "cpuload" : os.loadavg(),
            "cpus" : os.cpus(),
            "memtotal" : os.totalmem(),
            "memfree" : os.freemem()
        };

            if(result.entries.length > 0){
                result.entries.forEach(entry => {
                    var entryData = {
                        "imageUri" : JSON.parse(entry.data._).imageUri,
                        "thumbUri" : JSON.parse(entry.data._).thumbUri,
                        "description": {
                            "value": JSON.parse(entry.data._).description.value,
                            "confidence": JSON.parse(entry.data._).description.confidence
                        },
                        "tags": JSON.parse(entry.data._).tags.value,
                        "colours": JSON.parse(entry.data._).colours.value
                    }
                    results.push(entryData);
                    });
                }
            var jsonData = {server, results}
            res.send(jsonData);
            }else{
            // query failed
            var jsonData = {server, results}
            res.send(jsonData);
            console.log("no results error")
     }
  });
});


module.exports = app;