import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, '../config/config.defaults.yaml');

console.log('--- Patching config.defaults.yaml for build with localhost placeholder URLs ---');

try {
    let content = fs.readFileSync(configPath, 'utf8');

    // Use the .localhost placeholders as requested
    content = content.replace(/^(\s*app_assets:).*/m, "$1 'https://luzzle-app-assets.localhost'");
    content = content.replace(/^(\s*luzzle_assets:).*/m, "$1 'https://luzzle-assets.localhost'");

    fs.writeFileSync(configPath, content);

    console.log(`Successfully patched ${configPath}`);
} catch (error) {
    console.error(`Error patching config file: ${error.message}`);
    process.exit(1);
}
