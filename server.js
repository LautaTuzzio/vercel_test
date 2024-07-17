const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Connect to SQLite database
const db = new sqlite3.Database(':memory:');

// Create numbers table
db.serialize(() => {
    db.run("CREATE TABLE numbers (value INTEGER)");
});

wss.on('connection', (ws) => {
    // Send the initial list of numbers to the client
    db.all("SELECT value FROM numbers", (err, rows) => {
        if (err) throw err;
        const numbers = rows.map(row => row.value);
        ws.send(JSON.stringify({ type: 'init', data: numbers }));
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'add-number') {
            const number = data.number;
            db.run("INSERT INTO numbers (value) VALUES (?)", [number], (err) => {
                if (err) throw err;
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update', number }));
                    }
                });
            });
        }
    });
});

app.use(express.static('public'));

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
