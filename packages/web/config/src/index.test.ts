import { describe, expect, expectTypeOf, test } from "vitest";
import { configuredAssetUrl } from "./asset-urls.js";
import {
	loadConfig,
	validateConfig,
	getConfigValue,
	setConfigValue,
	ConfigError,
	siteImageDefaults,
	type Config,
	type ConfigPublic,
} from "./index.js";

describe("index (package entry point)", () => {
	test("exports the loader, validator and config value helpers", () => {
		expect(typeof loadConfig).toBe("function");
		expect(typeof validateConfig).toBe("function");
		expect(typeof getConfigValue).toBe("function");
		expect(typeof setConfigValue).toBe("function");
		expectTypeOf(validateConfig).returns.toEqualTypeOf<Config>();
	});

	test("exports the schema's built-in site image sources", () => {
		expect(siteImageDefaults).toEqual({
			favicon: "/images/favicon.png",
			opengraph: "/images/opengraph.png",
		});
		expect(validateConfig({}, {}).content.images).toEqual(siteImageDefaults);
	});

	test("resolved Config requires both image sources", () => {
		expectTypeOf<Config["content"]["images"]>().toEqualTypeOf<{
			favicon: string;
			opengraph: string;
		}>();
		// @ts-expect-error Resolved images cannot omit the Open Graph source.
		const faviconOnly: Config["content"]["images"] = { favicon: "./icon.png" };
		// @ts-expect-error Resolved images cannot omit the favicon source.
		const opengraphOnly: Config["content"]["images"] = {
			opengraph: "./share.png",
		};
		expect(faviconOnly).not.toHaveProperty("opengraph");
		expect(opengraphOnly).not.toHaveProperty("favicon");
	});

	test("exports ConfigError with structured validation issues", () => {
		try {
			validateConfig({ storage: { root: "" } }, {});
			throw new Error("Expected validation to fail");
		} catch (error) {
			expect(error).toBeInstanceOf(ConfigError);
			if (!(error instanceof ConfigError)) throw error;
			expect(error.issues).toContainEqual({
				path: "/storage/root",
				message: expect.any(String),
			});
		}
	});

	test("exports resolved types with required defaulted sections and optional services", () => {
		const config: Config = validateConfig({}, {});
		expect(config.auth).toBeUndefined();
		expect(config.ai).toBeUndefined();
		expectTypeOf(config.network.internal.explorer).toEqualTypeOf<string>();
		expectTypeOf(config.network.public.host).toEqualTypeOf<string>();
		expectTypeOf(config.network.public.hmr_port).toEqualTypeOf<
			number | undefined
		>();
		expectTypeOf(config.sync.archive.remote).toEqualTypeOf<string>();
		expectTypeOf(config.sync.cdn.flags).toEqualTypeOf<string[]>();
		expectTypeOf(config.sync.cdn.strategy).toEqualTypeOf<"sync" | "copy">();
		expectTypeOf(config.worker.queue.path).toEqualTypeOf<string>();
		expectTypeOf(config.theme.light["color-primary"]).toEqualTypeOf<string>();
		expectTypeOf(
			config.theme.globals["font-size-root"],
		).toEqualTypeOf<number>();
		expectTypeOf<Config["ai"]>().toEqualTypeOf<
			{ provider: "google"; api_key: string } | undefined
		>();
		expectTypeOf<Config["auth"]>().toEqualTypeOf<
			| { secret: string; credentials: { username: string; password: string } }
			| {
					secret: string;
					oidc: {
						name: string;
						issuer: string;
						clientId: string;
						clientSecret: string;
					};
			  }
			| undefined
		>();
	});

	test("keeps ConfigPublic an explicit projection without sensitive sections", () => {
		const config = validateConfig(
			{
				auth: {
					secret: "private-secret",
					credentials: { username: "admin", password: "private-password" },
				},
				ai: { provider: "google", api_key: "private-key" },
				content: {
					fonts: { sans: "/private/font.woff2" },
					images: {
						favicon: "/private/icon.png",
						opengraph: "/private/share.png",
					},
				},
			},
			{},
		);
		const publicConfig: ConfigPublic = {
			url: config.url,
			content: {
				text: config.content.text,
				images: {
					favicon: configuredAssetUrl("favicon", config.content.images.favicon),
					opengraph: configuredAssetUrl(
						"opengraph",
						config.content.images.opengraph,
					),
				},
			},
		};
		expect(publicConfig.url.app).toBe("http://localhost:8080");
		expect(publicConfig.content.text.title).toBe("Luzzle Explorer");
		expectTypeOf<keyof ConfigPublic>().toEqualTypeOf<"url" | "content">();
		expectTypeOf<keyof ConfigPublic["content"]>().toEqualTypeOf<
			"text" | "images"
		>();
		expect(publicConfig.content.images).toEqual({
			favicon: "/assets/favicon/icon.png",
			opengraph: "/assets/opengraph/share.png",
		});
		expect(JSON.stringify(publicConfig)).not.toContain("/private/");
		expectTypeOf<keyof ConfigPublic["url"]>().toEqualTypeOf<
			"app" | "app_assets" | "luzzle_assets"
		>();
		// @ts-expect-error Session secrets and provider credentials are not public.
		expect(publicConfig.auth).toBeUndefined();
		// @ts-expect-error AI API keys are not public.
		expect(publicConfig.ai).toBeUndefined();
		// @ts-expect-error Asset salts are not public.
		expect(publicConfig.assets).toBeUndefined();
		// @ts-expect-error Local storage configuration is not public.
		expect(publicConfig.storage).toBeUndefined();
		// @ts-expect-error Internal network addresses are not public.
		expect(publicConfig.network).toBeUndefined();
		// @ts-expect-error Configured font sources are not public.
		expect(publicConfig.content.fonts).toBeUndefined();
	});
});
