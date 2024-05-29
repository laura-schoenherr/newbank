import sqlite3 from 'sqlite3';
sqlite3.verbose();
const db = new sqlite3.Database(':memory:'); // or 'cards.db' for a file-based database

// Create table
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_value BLOB,
            money INTEGER DEFAULT 20
        )
    `);
});

export default db;
