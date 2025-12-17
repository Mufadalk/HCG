"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignedCard = generateSignedCard;
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("./db"));
const GENERATED_DIR = path_1.default.join(__dirname, '../public/generated');
// Ensure generated directory exists
if (!fs_1.default.existsSync(GENERATED_DIR)) {
    fs_1.default.mkdirSync(GENERATED_DIR, { recursive: true });
}
async function generateSignedCard(cardId, userName) {
    const card = db_1.default.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    if (!card) {
        throw new Error('Card not found');
    }
    const inputPath = path_1.default.join(__dirname, '../', card.image_path);
    const filename = `card_${cardId}_${Date.now()}.png`;
    const outputPath = path_1.default.join(GENERATED_DIR, filename);
    // Create SVG for text overlay
    // Using simple SVG text. We might need to adjust font-family support depending on OS.
    // user-select: none to avoid selection artifacts if any (not relevant for sharp, but good practice in svg)
    const svgText = `
        <svg width="100%" height="100%">
            <style>
                .signature { 
                    fill: ${card.signature_color}; 
                    font-size: ${card.signature_size}px; 
                    font-family: ${card.signature_font}, sans-serif;
                    font-weight: bold;
                }
            </style>
            <text x="${card.signature_x}" y="${card.signature_y}" text-anchor="middle" class="signature">${userName}</text>
        </svg>
    `;
    // We need to know the image dimensions to make the SVG match? 
    // Sharp composites align top-left by default. 
    // Ideally we load the image metadata first to size the SVG same as image, 
    // OR we just assume the text coordinates are absolute pixels.
    // If we make the SVG the same size as the image, we can use absolute coords easily.
    const metadata = await (0, sharp_1.default)(inputPath).metadata();
    const width = metadata.width || 1080; // Fallback
    const height = metadata.height || 1920;
    console.log(`[CardGen] Generating card ${cardId} for ${userName}`);
    console.log(`[CardGen] Image Dimensions: ${width}x${height}`);
    console.log(`[CardGen] Text Coords: (${card.signature_x}, ${card.signature_y}), Color: ${card.signature_color}, Size: ${card.signature_size}`);
    const svgWithDimensions = `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <style>
                .signature { 
                    fill: ${card.signature_color}; 
                    font-size: ${card.signature_size}px; 
                    font-family: ${card.signature_font}, sans-serif;
                    font-weight: bold;
                }
            </style>
            <text x="${card.signature_x}" y="${card.signature_y}" text-anchor="middle" class="signature">${userName}</text>
        </svg>
    `;
    await (0, sharp_1.default)(inputPath)
        .composite([
        {
            input: Buffer.from(svgWithDimensions),
            top: 0,
            left: 0,
        },
    ])
        .toFile(outputPath);
    // Log the usage
    db_1.default.prepare('INSERT INTO usage_log (card_id, user_name) VALUES (?, ?)').run(cardId, userName);
    return filename;
}
//# sourceMappingURL=imageService.js.map