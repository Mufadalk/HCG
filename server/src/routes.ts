import { OAuth2Client } from 'google-auth-library';
import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db';
import { generateSignedCard } from './imageService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ALLOWED_ADMIN_EMAILS = (process.env.ALLOWED_ADMIN_EMAILS || '').split(',').map(e => e.trim());

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const router = express.Router();

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/cards'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Middleware for Generic Auth (Any valid Google User)
const requireAuth = async (req: Request, res: Response, next: Function) => {
    // Fallback for dev if needed, typically removed in strict prod
    const authHeader = req.headers['authorization'];
    if (process.env.ADMIN_PASSWORD && authHeader === process.env.ADMIN_PASSWORD) {
        (req as any).isAdmin = true;
        next();
        return;
    }

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing Token' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            throw new Error('No email in token');
        }

        // Attach user info
        (req as any).user = payload;
        (req as any).isAdmin = ALLOWED_ADMIN_EMAILS.includes(payload.email);

        next();
    } catch (error) {
        console.error('Auth Error:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid Token' });
    }
};

// Middleware for Admin Only
const requireAdmin = (req: Request, res: Response, next: Function) => {
    if ((req as any).isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admins Only' });
    }
};

// === Public Routes (Authenticated) ===

// Get all active cards
router.get('/cards', requireAuth, (req, res) => {
    const isAdmin = (req as any).isAdmin || req.query.admin === 'true';
    let query = 'SELECT * FROM cards';
    if (!isAdmin) {
        query += ' WHERE is_active = 1';
    }
    const cards = db.prepare(query).all();
    res.json(cards);
});

// Generate Card
router.post('/generate', requireAuth, async (req, res) => {
    try {
        const { cardId, userName, greeting } = req.body;
        if (!cardId || !userName) {
            res.status(400).json({ error: 'Missing cardId or userName' });
            return;
        }
        const filename = await generateSignedCard(Number(cardId), userName, greeting);
        res.json({ url: `/generated/${filename}` });
    } catch (error: any) {
        console.error("Generation error:", error);
        res.status(500).json({ error: 'Failed to generate card' });
    }
});

// Get all greetings
router.get('/greetings', requireAuth, (req, res) => {
    try {
        const greetings = db.prepare('SELECT * FROM greetings ORDER BY text ASC').all();
        res.json(greetings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch greetings' });
    }
});


// === Admin Routes ===

// Admin Stats (Protected)
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
    const totalGenerated = db.prepare('SELECT COUNT(*) as count FROM usage_log').get() as any;
    const popularCards = db.prepare(`
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

// Add greeting (Protected)
router.post('/greetings', requireAuth, requireAdmin, (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            res.status(400).json({ error: 'Text required' });
            return;
        }
        const info = db.prepare('INSERT INTO greetings (text) VALUES (?)').run(text);
        res.json({ id: info.lastInsertRowid, text, success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete greeting (Protected)
router.delete('/greetings/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        db.prepare('DELETE FROM greetings WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


// Upload new card (Protected)
router.post('/cards', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
    try {
        const { name, category, signature_x, signature_y, signature_size, signature_color } = req.body;
        if (!req.file) {
            res.status(400).json({ error: 'No image uploaded' });
            return;
        }

        const imagePath = `uploads/cards/${req.file.filename}`;

        const stmt = db.prepare(`
            INSERT INTO cards (name, image_path, category, signature_x, signature_y, signature_size, signature_color, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `);

        const info = stmt.run(
            name,
            imagePath,
            category,
            Number(signature_x || 500),
            Number(signature_y || 500),
            Number(signature_size || 50),
            signature_color || '#000000'
        );

        res.json({ id: info.lastInsertRowid, success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Delete card (Protected)
router.delete('/cards/:id', requireAuth, requireAdmin, (req, res) => {
    db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Update card (Protected)
router.put('/cards/:id', requireAuth, requireAdmin, (req, res) => {
    const { name, category, signature_x, signature_y, signature_size, signature_color, is_active } = req.body;
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (signature_x !== undefined) { updates.push('signature_x = ?'); params.push(signature_x); }
    if (signature_y !== undefined) { updates.push('signature_y = ?'); params.push(signature_y); }
    if (signature_size !== undefined) { updates.push('signature_size = ?'); params.push(signature_size); }
    if (signature_color) { updates.push('signature_color = ?'); params.push(signature_color); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

    if (updates.length > 0) {
        params.push(req.params.id);
        const sql = `UPDATE cards SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...params);
    }

    res.json({ success: true });
});

export default router;
