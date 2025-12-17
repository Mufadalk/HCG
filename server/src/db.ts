import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(dbPath);

// Initialize Database Schema
export function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image_path TEXT NOT NULL,
            category TEXT NOT NULL,
            signature_x INTEGER DEFAULT 100,
            signature_y INTEGER DEFAULT 100,
            signature_font TEXT DEFAULT 'Arial',
            signature_color TEXT DEFAULT '#000000',
            signature_size INTEGER DEFAULT 50,
            is_active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS usage_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(card_id) REFERENCES cards(id)
        );

        CREATE TABLE IF NOT EXISTS greetings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL UNIQUE
        );
    `);

    // Seed default greetings if empty
    const greetingCount = db.prepare('SELECT COUNT(*) as count FROM greetings').get() as any;
    if (greetingCount.count === 0) {
        const insert = db.prepare('INSERT INTO greetings (text) VALUES (?)');
        const defaults = [
            'Happy Holidays',
            "Season's Greetings",
            'Best Wishes',
            'Sincerely',
            'Warmest Regards',
            'From the desk of'
        ];
        defaults.forEach(g => insert.run(g));
    }

    console.log("Database initialized.");
}

export default db;
