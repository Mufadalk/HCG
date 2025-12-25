import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import routes from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Static Files
// Serve uploaded card templates
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Serve generated cards
app.use('/generated', express.static(path.join(__dirname, '../public/generated')));

// API Routes
app.use('/api', routes);

// Initialize DB
// Initialize DB
initDb();

// Serve React Frontend (Production)
// Assume client is built to ../client/dist
const CLIENT_BUILD_PATH = path.join(__dirname, '../../client/dist');
app.use(express.static(CLIENT_BUILD_PATH));

// Handle React Routing, return all requests to React app
app.use((req, res, next) => {
    // Skip if API request (though express matches top-down, so API routes above should handle it)
    if (req.path.startsWith('/api')) {
        next();
        return;
    }
    // If we got here, it's a page request, send index.html
    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
