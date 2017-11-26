var express = require('express');
var send_request = require('request');
var bodyParser = require('body-parser')
var _ = require('lodash');
var app = express();

var expressWs = require('express-ws')(app);

var webhooks = [];
var connections = [];

var moment = require('moment');
var countdown = require('moment-countdown');

const processTimer = () => {
  var result = {};
  var timer = webhooks[webhooks.length - 1];
  
  if (timer && timer.start) {
    var done = moment(timer.start).add(timer.time, 'minutes');
    result = moment().countdown(done);
  }
  console.log('processTimer', timer, result);
  return _.extend(result, { task: timer.task });
}

app.use(express.static('views'));
app.use(bodyParser.json());

app.on('timer:start', function(){
  const con = connections[0]
  var msg = JSON.stringify(processTimer())
  console.log('timer started', con && con.readyState)
  con && con.readyState === 1 && con.send(msg)
});

app.on('timer:stop', function(){
  const con = connections[0]
  console.log('timer stopped', con && con.readyState)
  con && con.readyState === 1 && con.send(JSON.stringify({stop: true}))
});

app.ws('/timer/status', function(ws, req) {
  console.log('receiving websocket req from magicmiror', req.url);
  
  ws.send(JSON.stringify({type: 'connect'}));
  connections.push(ws);
  
  ws.on('headers', function() {
    console.log('ws headers');
  });
  
  ws.on('close', function() {
    console.log('ws close');
    connections = []
  });
  
  ws.on('message', function(msg) {
    // ws.send(JSON.stringify({type: 'prepare'}));
    console.log('ws message', msg);
  });
})

app.get("/", function (request, response) {
  response.send('MMM-PomoDone Websocket proxy');
});

app.get("/timer/status", function (request, response) {
  console.log("receiving request from magicmirror");
  
  response.json(processTimer());
  
//   var options = {
//     url: process.env.ZAPIER_WEBHOOK_URL,
//     json: true,
//     formData: {
//       title: 'My cat is awesome',
//       description: 'Sent on ' + new Date()
//     }
//   };
  
//   send_request.post(options, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//       console.log(body); // Show the response from Zapier
//     }
//   });
//   response.redirect("/");  
});

// Handle webhook from Zapier
app.post("/timer/start", function (request, response) {
  console.log("Webhook received from Zapier", request.body);
  webhooks.push(request.body);
  
  app.emit('timer:start')
  response.sendStatus(200);  
});

app.post("/timer/stop", function (request, response) {
  console.log("Webhook received from Zapier", request.body);  
  webhooks.push(request.body);
  
  app.emit('timer:stop')
  response.sendStatus(200);  
});

// Send list of webhooks received
app.get("/get_webhooks", function (request, response) {
  response.send(webhooks); 
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});