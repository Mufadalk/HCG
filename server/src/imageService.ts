import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_DIR = path.join(__dirname, '../public/generated');

// Ensure generated directory exists
if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

export async function generateSignedCard(cardId: number, userName: string, greeting?: string): Promise<string> {
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as any;
    if (!card) {
        throw new Error('Card not found');
    }

    const inputPath = path.join(__dirname, '../', card.image_path);
    const filename = `card_${cardId}_${Date.now()}.png`;
    const outputPath = path.join(GENERATED_DIR, filename);

    // Create SVG for text overlay

    // We need to know the image dimensions to make the SVG match? 
    // Sharp composites align top-left by default. 
    // Ideally we load the image metadata first to size the SVG same as image, 
    // OR we just assume the text coordinates are absolute pixels.
    // If we make the SVG the same size as the image, we can use absolute coords easily.

    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width || 1080; // Fallback
    const height = metadata.height || 1920;

    console.log(`[CardGen] Generating card ${cardId} for ${userName} (Greeting: ${greeting || 'None'})`);
    console.log(`[CardGen] Image Dimensions: ${width}x${height}`);
    console.log(`[CardGen] Text Coords: (${card.signature_x}, ${card.signature_y}), Color: ${card.signature_color}, Size: ${card.signature_size}`);

    let textContent;
    if (greeting) {
        // Multi-line: Greeting small above, Name normal below
        textContent = `
            <tspan x="${card.signature_x}" dy="-0.6em" font-size="0.8em">${greeting}</tspan>
            <tspan x="${card.signature_x}" dy="1.6em" font-size="1em" font-weight="bold">${userName}</tspan>
        `;
    } else {
        // Single line: Just name
        textContent = userName;
    }

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
            <text x="${card.signature_x}" y="${card.signature_y}" text-anchor="middle" class="signature">${textContent}</text>
        </svg>
    `;

    await sharp(inputPath)
        .composite([
            {
                input: Buffer.from(svgWithDimensions),
                top: 0,
                left: 0,
            },
        ])
        .toFile(outputPath);

    // Log the usage
    db.prepare('INSERT INTO usage_log (card_id, user_name) VALUES (?, ?)').run(cardId, userName);

    return filename;
}
