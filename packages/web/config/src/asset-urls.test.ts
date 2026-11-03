import { describe, expect, test } from "vitest";
import { configuredAssetFilename, configuredAssetUrl } from "./asset-urls.js";

describe("configured asset URLs", () => {
	test.each([
		["/private/owner/icon.png", "icon.png"],
		["./content/nested/share.png", "share.png"],
		["font.woff2", "font.woff2"],
		["/private/../owner//icon.png///", "icon.png"],
		["/private/owner/back\\slash.png", "back\\slash.png"],
		["/private/./..", ".."],
		["/", ""],
		["", ""],
	])("uses the POSIX basename of %j", (source, filename) => {
		expect(configuredAssetFilename(source)).toBe(filename);
	});

	test.each(["favicon", "opengraph", "fonts"] as const)(
		"encodes only the filename for %s, preserving Unicode and punctuation",
		(kind) => {
			const filename = `café 花 🌱 100% '"(!)*.woff2`;
			const source = `/private/owner/${filename}`;
			const url = configuredAssetUrl(kind, source);
			expect(url).toBe(
				`/assets/${kind}/caf%C3%A9%20%E8%8A%B1%20%F0%9F%8C%B1%20100%25%20'%22(!)*.woff2`,
			);
			expect(decodeURIComponent(url.split("/").at(-1)!)).toBe(
				configuredAssetFilename(source),
			);
			expect(url).not.toMatch(/private|owner/);
		},
	);

	test("encodes percent sequences exactly once without decoding the source", () => {
		expect(configuredAssetUrl("favicon", "/private/icon%2Fname.png")).toBe(
			"/assets/favicon/icon%252Fname.png",
		);
		expect(configuredAssetFilename("/private/icon%2Fname.png")).toBe(
			"icon%2Fname.png",
		);
	});

	test("changes URLs only when the basename changes, not private directories", () => {
		const original = configuredAssetUrl("fonts", "/private/first/font.woff2");
		expect(configuredAssetUrl("fonts", "/private/second/font.woff2")).toBe(
			original,
		);
		expect(
			configuredAssetUrl("fonts", "/private/first/new-font.woff2"),
		).not.toBe(original);
	});
});
