import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import db from './database.js';

const PORT = 3000;

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes
app.use(cors());

// Body parser middleware
app.use(bodyParser.json());

// Handle GET request from Arduino
app.get('/card', (req, res) => {
    const cardValue = req.query.card_value;

    if (cardValue) {
        db.get("SELECT * FROM cards WHERE card_value = ?", [cardValue], (err, row) => {
            if (err) {
                return res.status(500).json({ error: "Database retrieval error" });
            }
            if (!row) {
                // Create the card in the database if it does not exist
                const initialMoney = 20; // Default initial money
                db.run("INSERT INTO cards (card_value, money) VALUES (?, ?)", [cardValue, initialMoney], function (err) {
                    if (err) {
                        return res.status(500).json({ error: "Database insertion error" });
                    }
                    io.emit('new_card', { id: this.lastID, card_value: cardValue, money: initialMoney });
                    res.status(200).json({ money: initialMoney });
                });
            } else {
                io.emit('new_card', { id: row.id, card_value: row.card_value, money: row.money });
                res.status(200).json({ money: row.money });
            }
        });
    } else {
        res.status(400).json({ error: "No card value provided" });
    }
});

// Handle withdrawal request
app.post('/withdraw', (req, res) => {
    const { card_value, amount } = req.body;

    if (card_value && amount) {
        db.get("SELECT * FROM cards WHERE card_value = ?", [card_value], (err, row) => {
            if (err) {
                return res.status(500).json({ error: "Database retrieval error" });
            }
            if (!row) {
                return res.status(404).json({ error: "Card not found" });
            }
            if (row.money < amount) {
                return res.status(400).json({ error: "Insufficient funds" });
            }

            const newBalance = row.money - amount;
            db.run("UPDATE cards SET money = ? WHERE card_value = ?", [newBalance, card_value], (err) => {
                if (err) {
                    return res.status(500).json({ error: "Database update error" });
                }

                io.emit('new_card', { id: row.id, card_value: row.card_value, money: newBalance });

                res.status(200).json({ new_money: newBalance });
            });
        });
    } else {
        res.status(400).json({ error: "Invalid request" });
    }
});

// Handle Socket.IO connections with CORS
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"], // Allow GET and POST methods
    }
});

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send all existing card values to the newly connected client
    db.all("SELECT * FROM cards", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        socket.emit('initial_data', rows);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
