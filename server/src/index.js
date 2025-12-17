"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const routes_1 = __importDefault(require("./routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Static Files
// Serve uploaded card templates
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Serve generated cards
app.use('/generated', express_1.default.static(path_1.default.join(__dirname, '../public/generated')));
// API Routes
app.use('/api', routes_1.default);
// Initialize DB
(0, db_1.initDb)();
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map