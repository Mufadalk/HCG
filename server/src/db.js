"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.join(__dirname, '../database.sqlite');
const db = new better_sqlite3_1.default(dbPath);
// Initialize Database Schema
function initDb() {
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
    `);
    console.log("Database initialized.");
}
exports.default = db;
//# sourceMappingURL=db.js.map