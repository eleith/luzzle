import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const defaultConfigPath = path.resolve(process.cwd(), './config/config.defaults.yaml');
const userConfigPath = path.resolve(process.cwd(), './config/config.yaml');

const defaultConfigString = fs.readFileSync(defaultConfigPath, 'utf8');
const defaultConfig = YAML.parse(defaultConfigString);

const userConfigExists = fs.existsSync(userConfigPath);
const userConfigString = userConfigExists ? fs.readFileSync(userConfigPath, 'utf8') : '';
const userConfig = userConfigExists ? YAML.parse(userConfigString) : {};

const mergedUrl = {
    ...(defaultConfig.url || {}),
    ...(userConfig.url || {}),
};

// svelte.config.js expects a `urls` object with `app` and `assets`.
// We construct it from the new `url` object, mapping `app` to `app_assets`
// and `assets` to `luzzle_assets`.
const svelteConfig = {
    urls: {
        app: mergedUrl.app_assets,
        assets: mergedUrl.luzzle_assets,
    }
};

export default svelteConfig;