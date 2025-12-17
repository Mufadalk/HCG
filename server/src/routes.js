"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("./db"));
const imageService_1 = require("./imageService");
const router = express_1.default.Router();
// Configure Multer for image uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../uploads/cards'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = (0, multer_1.default)({ storage });
// === Public Routes ===
// Get all active cards
router.get('/cards', (req, res) => {
    const isAdmin = req.query.admin === 'true'; // Simple check for now
    let query = 'SELECT * FROM cards';
    if (!isAdmin) {
        query += ' WHERE is_active = 1';
    }
    const cards = db_1.default.prepare(query).all();
    res.json(cards);
});
// Generate Card
router.post('/generate', async (req, res) => {
    try {
        const { cardId, userName } = req.body;
        if (!cardId || !userName) {
            res.status(400).json({ error: 'Missing cardId or userName' });
            return;
        }
        const filename = await (0, imageService_1.generateSignedCard)(Number(cardId), userName);
        res.json({ url: `/generated/${filename}` });
    }
    catch (error) {
        console.error("Generation error:", error);
        res.status(500).json({ error: 'Failed to generate card' });
    }
});
// === Admin Routes ===
// Upload new card
router.post('/cards', upload.single('image'), (req, res) => {
    try {
        const { name, category, signature_x, signature_y, signature_size, signature_color } = req.body;
        if (!req.file) {
            res.status(400).json({ error: 'No image uploaded' });
            return;
        }
        const imagePath = `uploads/cards/${req.file.filename}`;
        const stmt = db_1.default.prepare(`
            INSERT INTO cards (name, image_path, category, signature_x, signature_y, signature_size, signature_color, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);
        const info = stmt.run(name, imagePath, category, Number(signature_x || 500), Number(signature_y || 500), Number(signature_size || 50), signature_color || '#000000');
        res.json({ id: info.lastInsertRowid, success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Delete card
router.delete('/cards/:id', (req, res) => {
    db_1.default.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});
// Update card (e.g. toggle active, change coords)
router.put('/cards/:id', (req, res) => {
    const { name, category, signature_x, signature_y, signature_size, signature_color, is_active } = req.body;
    const updates = [];
    const params = [];
    if (name) {
        updates.push('name = ?');
        params.push(name);
    }
    if (category) {
        updates.push('category = ?');
        params.push(category);
    }
    if (signature_x !== undefined) {
        updates.push('signature_x = ?');
        params.push(signature_x);
    }
    if (signature_y !== undefined) {
        updates.push('signature_y = ?');
        params.push(signature_y);
    }
    if (signature_size !== undefined) {
        updates.push('signature_size = ?');
        params.push(signature_size);
    }
    if (signature_color) {
        updates.push('signature_color = ?');
        params.push(signature_color);
    }
    if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active);
    }
    if (updates.length > 0) {
        params.push(req.params.id);
        const sql = `UPDATE cards SET ${updates.join(', ')} WHERE id = ?`;
        db_1.default.prepare(sql).run(...params);
    }
    res.json({ success: true });
});
// Stats
router.get('/stats', (req, res) => {
    const totalGenerated = db_1.default.prepare('SELECT COUNT(*) as count FROM usage_log').get();
    const popularCards = db_1.default.prepare(`
        SELECT c.name, COUNT(l.id) as use_count 
        FROM usage_log l 
        JOIN cards c ON l.card_id = c.id 
        GROUP BY l.card_id 
        ORDER BY use_count DESC 
        LIMIT 5
    `).all();
    res.json({
        totalGenerated: totalGenerated.count,
        popularCards
    });
});
exports.default = router;
//# sourceMappingURL=routes.js.map