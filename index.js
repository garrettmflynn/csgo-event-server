import fs from 'fs';
import * as url from 'url';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import CSGOGSI from 'node-csgo-gsi';
import * as config from './src/config.js';
import { GAME_MONITOR_PORT, EVENT_SERVER_PORT, EVENT_SERVER_URI, filename } from './src/globals.js';

// Try to create a configuration file on the host computer
try {
    config.save(filename) 
} catch (e) {
    console.error(e)
}

// Create Express Server
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
app.use(express.static(__dirname));


app.get('/status', (request, response) => response.json({clients: clients.length}));

let clients = [];
let facts = [];

app.listen(EVENT_SERVER_PORT, () => {
  console.log(`Hypergamma service listening at ${EVENT_SERVER_URI}`)
})

function eventsHandler(request, response, next) {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    };
    response.writeHead(200, headers);
  
    const data = `data: ${JSON.stringify({name: 'init', data: true})}\n\n`;
  
    response.write(data);
  
    const clientId = Date.now();
  
    const newClient = {
      id: clientId,
      response
    };
  
    clients.push(newClient);
  
    request.on('close', () => {
      console.log(`${clientId} Connection closed`);
      clients = clients.filter(client => client.id !== clientId);
    });
  }
  
  app.get('/events', eventsHandler);

  function sendEventsToAll(newFact) {
    clients.forEach(client => client.response.write(`data: ${JSON.stringify(newFact)}\n\n`))
  }
  
//   app.post('/fact', addFact);

// Setup CSGO Events
function onEvent (name, data) {
    console.log(`${name}: ${data}`)
    sendEventsToAll( { name, data } )
}

let gsi = new CSGOGSI({
    port: GAME_MONITOR_PORT,
    // authToken: ["Q79v5tcxVQ8u", "Team2Token", "Team2SubToken"] // this must match the cfg auth token
});

gsi.on("all", function (data) {
    console.log('EVENT', data)
    fs.appendFileSync("./payload.txt", JSON.stringify(data, null, 2));
});

const events = ["gameMap", "gamePhase", "gameRounds", "gameCTscore", "gameTscore", "roundWins", "player", "roundPhase", "roundWinTeam", "bombState", "bombTimeStart", "bombExploded", "bombTimeLeft"]
events.forEach(event => gsi.on(event, (v) => onEvent(event, v)));

// Test sending events to clients
setInterval(() => {
    sendEventsToAll({name: 'test', data: true})
}, 1000)