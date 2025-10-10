import { loadConfig } from '@luzzle/tools';
import { copyFile, mkdir } from 'fs/promises';
import path from 'path';

async function syncContent() {
    console.log('Syncing content blocks...');

    const userConfigPath = './config.yaml'
    const config = loadConfig(userConfigPath);

    if (!config.content || !config.content.block) {
        console.log('No content blocks found in config. Nothing to sync.');
        return;
    }

    const outDir = path.resolve(process.cwd(), 'src/lib/content/block');
    await mkdir(outDir, { recursive: true });

    const syncPromises = Object.entries(config.content.block).map(async ([name, sourcePath]) => {
        const source = path.resolve(process.cwd(), sourcePath);
        const destination = path.resolve(outDir, `${name}.md`);
        
        try {
            await copyFile(source, destination);
            console.log(`Synced ${sourcePath} -> src/lib/content/block/${name}.md`);
        } catch (error) {
            console.error(`Error syncing ${sourcePath}:`, error);
            throw error;
        }
    });

    await Promise.all(syncPromises);
    console.log('Content sync complete.');
}

syncContent().catch((error) => {
    console.error('Content sync failed:', error);
    process.exit(1);
});
