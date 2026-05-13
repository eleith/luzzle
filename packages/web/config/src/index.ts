import { WebPiecesAsset, WebPieces, WebPieceTags } from "./lib/types.js";
import type { Config, ConfigPublic } from "./lib/config/config.js";
import {
	loadConfig,
	getConfigValue,
	setConfigValue,
} from "./lib/config/config.js";

export {
	type WebPieceTags,
	type WebPiecesAsset,
	type WebPieces,
	type Config,
	type ConfigPublic,
	loadConfig,
	getConfigValue,
	setConfigValue,
};