import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

const NetworkSchema = Type.Object(
	{
		internal: Type.Object(
			{
				explorer: Type.String({
					default: "http://luzzle-web:3000",
					description:
						"Explorer address used to allow its hostname in the development server.",
				}),
				lsp: Type.String({
					default: "http://luzzle-lsp:9001",
					description:
						"Reserved LSP address. Proxy routing is configured separately with LUZZLE_PROXY_LSP_UPSTREAM.",
				}),
				worker: Type.String({
					default: "http://luzzle-worker:9000",
					description: "Worker service address for health checks.",
				}),
			},
			{ default: {} },
		),
		public: Type.Object(
			{
				host: Type.String({
					default: "0.0.0.0",
					description:
						"Development server bind address, not the public site URL.",
				}),
				hmr_port: Type.Optional(
					Type.Number({
						description:
							"Vite hot-reload client port, when different from the server port.",
					}),
				),
			},
			{ default: {} },
		),
	},
	{
		default: {},
		description: "Internal service and development network settings.",
	},
);

const UrlSchema = Type.Object(
	{
		app: Type.String({
			default: "${LUZZLE_APP_URL:-http://localhost:8080}",
			description:
				"Public Explorer URL. Supports an explicit environment reference.",
		}),
		app_assets: Type.String({
			default: "",
			description:
				"Application asset base URL. Empty uses same-origin paths; a CDN URL is allowed.",
		}),
		luzzle_assets: Type.String({
			default: "",
			description:
				"Published piece asset base URL. Empty uses same-origin paths; a CDN URL is allowed.",
		}),
	},
	{
		default: {},
		additionalProperties: false,
		description: "Public site and asset URLs.",
	},
);

const SessionSecretSchema = Type.String({
	minLength: 1,
	description:
		"Session-signing secret. Supply a strong random value or an explicit environment reference; required whenever auth is configured.",
	examples: ["${LUZZLE_AUTH_SECRET}"],
});

const CredentialsSchema = Type.Object(
	{
		username: Type.String({
			minLength: 1,
			description: "Administrator username.",
			examples: ["admin"],
		}),
		password: Type.String({
			minLength: 1,
			description:
				"Administrator password or an explicit environment reference.",
			examples: ["${LUZZLE_AUTH_PASSWORD}"],
		}),
	},
	{
		additionalProperties: false,
		description: "Local username/password authentication.",
	},
);

const OidcSchema = Type.Object(
	{
		name: Type.String({
			default: "Single Sign-On",
			description: "Label shown on the sign-in button.",
		}),
		issuer: Type.String({
			minLength: 1,
			description: "OIDC issuer URL or an explicit environment reference.",
			examples: ["https://identity.example.com", "${OIDC_ISSUER}"],
		}),
		clientId: Type.String({
			minLength: 1,
			description: "OIDC client identifier.",
		}),
		clientSecret: Type.String({
			minLength: 1,
			description: "OIDC client secret or an explicit environment reference.",
			examples: ["${OIDC_CLIENT_SECRET}"],
		}),
	},
	{
		additionalProperties: false,
		description: "OpenID Connect authentication.",
	},
);

const AuthSchema = Type.Union(
	[
		Type.Object(
			{ secret: SessionSecretSchema, credentials: CredentialsSchema },
			{ title: "Credentials", additionalProperties: false },
		),
		Type.Object(
			{ secret: SessionSecretSchema, oidc: OidcSchema },
			{ title: "OIDC", additionalProperties: false },
		),
	],
	{
		description:
			"Configure exactly one authentication provider and a session secret. Omit auth for a public-only site with admin access disabled.",
	},
);

const AiSchema = Type.Object(
	{
		provider: Type.Literal("google", {
			description:
				"Generation provider. Google is currently the supported provider; this field is required.",
		}),
		api_key: Type.String({
			minLength: 1,
			description: "Provider API key or an explicit environment reference.",
			examples: ["${GOOGLE_API_KEY}"],
		}),
	},
	{
		additionalProperties: false,
		description:
			"AI generation settings. Omit ai to disable generation; both provider and api_key must be supplied when configured.",
	},
);

const StorageSchema = Type.Object(
	{
		root: Type.String({
			minLength: 1,
			default: "./archive",
			description: "Local Markdown archive directory.",
		}),
	},
	{ default: {}, additionalProperties: false },
);

const SyncSchema = Type.Object(
	{
		config: Type.String({
			default: "/app/rclone/rclone.conf",
			description: "rclone configuration file used by the worker.",
		}),
		archive: Type.Object(
			{
				remote: Type.String({
					default: "",
					description:
						"rclone remote name, not an s3:// URL. Empty remote or path skips archive synchronization.",
				}),
				path: Type.String({
					default: "",
					description:
						"Remote archive path, combined with the remote name as remote:path.",
				}),
				flags: Type.Array(Type.String(), {
					default: [],
					description:
						"Additional rclone arguments, one argument per array entry.",
				}),
			},
			{
				default: {},
				additionalProperties: false,
				description:
					"Bidirectional archive synchronization using rclone bisync.",
			},
		),
		cdn: Type.Object(
			{
				remote: Type.String({
					default: "",
					description:
						"rclone remote name. Empty remote or path skips CDN synchronization.",
				}),
				path: Type.String({
					default: "",
					description: "Remote published-assets path, combined as remote:path.",
				}),
				flags: Type.Array(Type.String(), {
					default: [],
					description:
						"Additional rclone arguments, one argument per array entry.",
				}),
				strategy: Type.Union([Type.Literal("sync"), Type.Literal("copy")], {
					default: "sync",
					description: "sync deletes destination-only files; copy does not.",
				}),
			},
			{
				default: {},
				additionalProperties: false,
				description: "Publish generated assets to a remote destination.",
			},
		),
	},
	{ default: {}, additionalProperties: false },
);

const WorkerSchema = Type.Object(
	{
		queue: Type.Object(
			{
				path: Type.String({
					default: "./data/sidequest.sqlite",
					description:
						"Workflow queue database path. The legacy sidequest.sqlite filename is mapped to openworkflow.sqlite by the application.",
				}),
			},
			{ default: {}, additionalProperties: false },
		),
	},
	{ default: {}, additionalProperties: false },
);

const PathsSchema = Type.Object(
	{
		database: Type.String({
			default: "./data/luzzle.sqlite",
			description:
				"SQLite index path, resolved relative to the config directory.",
		}),
		assets: Type.String({
			default: "./assets/pieces",
			description:
				"Generated piece assets directory. Worker generation uses its working directory for relative paths.",
		}),
		cache: Type.String({
			default: "./nginx",
			description: "Proxy cache directory.",
		}),
		static: Type.String({
			default: "./static",
			description: "Static render assets directory.",
		}),
		config: Type.Optional(
			Type.String({
				description:
					"Runtime metadata: loadConfig records the supplied config filename here.",
				readOnly: true,
			}),
		),
	},
	{ default: {}, additionalProperties: false },
);

const AssetsSchema = Type.Object(
	{
		salt: Type.String({
			default: "${LUZZLE_ASSET_SALT:-}",
			description:
				"Salt for generated asset keys. Changing it changes published asset URLs.",
		}),
	},
	{ default: {}, additionalProperties: false },
);

const ContentSchema = Type.Object(
	{
		component: Type.Optional(
			Type.Object(
				{
					root: Type.Optional(
						Type.String({
							description: "Svelte source path for the home page.",
						}),
					),
					feed: Type.Optional(
						Type.String({ description: "Svelte source path for the feed." }),
					),
					"404": Type.Optional(
						Type.String({
							description: "Svelte source path for the not-found page.",
						}),
					),
					error: Type.Optional(
						Type.String({
							description: "Svelte source path for the error page.",
						}),
					),
				},
				{ additionalProperties: false },
			),
		),
		text: Type.Object(
			{
				title: Type.String({
					default: "Luzzle Explorer",
					description: "Site title.",
				}),
				description: Type.String({
					default: "A Luzzle Explorer instance",
					description: "Site description.",
				}),
			},
			{ default: {}, additionalProperties: false },
		),
	},
	{ default: {}, additionalProperties: false },
);

const PiecesSchema = Type.Array(
	Type.Object(
		{
			type: Type.String({
				description: "Archive piece type associated with this presentation.",
				examples: ["books"],
			}),
			fields: Type.Object(
				{
					media: Type.Optional(
						Type.Array(Type.String(), {
							description: "Frontmatter selectors for media assets.",
							examples: [["cover"]],
						}),
					),
					title: Type.String({
						description:
							"Frontmatter selector for the title, not a literal display title.",
						examples: ["title"],
					}),
					summary: Type.Optional(
						Type.String({
							description: "Frontmatter selector for a summary.",
							examples: ["description"],
						}),
					),
					date_consumed: Type.String({
						description:
							"Frontmatter selector for the consumed/read/viewed date.",
						examples: ["date_read"],
					}),
					tags: Type.Optional(
						Type.String({
							description: "Frontmatter selector for tags.",
							examples: ["keywords"],
						}),
					),
					attachments: Type.Optional(
						Type.Array(Type.String(), {
							description: "Frontmatter selectors for attachments.",
							examples: [["files[*].file"]],
						}),
					),
				},
				{ additionalProperties: false },
			),
			components: Type.Optional(
				Type.Object(
					{
						icon: Type.Optional(
							Type.String({
								description: "Svelte source path for the piece icon.",
							}),
						),
						opengraph: Type.Optional(
							Type.String({
								description: "Svelte source path for the Open Graph image.",
							}),
						),
						page: Type.Optional(
							Type.String({
								description: "Svelte source path for the piece page.",
							}),
						),
					},
					{ additionalProperties: false },
				),
			),
		},
		{ additionalProperties: false },
	),
	{
		default: [],
		description:
			"Ordered presentation and frontmatter mappings for archive piece types.",
	},
);

const codeThemeNames = [
	"andromeeda",
	"aurora-x",
	"ayu-dark",
	"catppuccin-frappe",
	"catppuccin-latte",
	"catppuccin-macchiato",
	"catppuccin-mocha",
	"dark-plus",
	"dracula",
	"dracula-soft",
	"everforest-dark",
	"everforest-light",
	"github-dark",
	"github-dark-default",
	"github-dark-dimmed",
	"github-dark-high-contrast",
	"github-light",
	"github-light-default",
	"github-light-high-contrast",
	"gruvbox-dark-hard",
	"gruvbox-dark-medium",
	"gruvbox-dark-soft",
	"gruvbox-light-hard",
	"gruvbox-light-medium",
	"gruvbox-light-soft",
	"houston",
	"kanagawa-dragon",
	"kanagawa-lotus",
	"kanagawa-wave",
	"laserwave",
	"light-plus",
	"material-theme",
	"material-theme-darker",
	"material-theme-lighter",
	"material-theme-ocean",
	"material-theme-palenight",
	"min-dark",
	"min-light",
	"monokai",
	"night-owl",
	"nord",
	"one-dark-pro",
	"one-light",
	"plastic",
	"poimandres",
	"red",
	"rose-pine",
	"rose-pine-dawn",
	"rose-pine-moon",
	"slack-dark",
	"slack-ochin",
	"snazzy-light",
	"solarized-dark",
	"solarized-light",
	"synthwave-84",
	"tokyo-night",
	"vesper",
	"vitesse-black",
	"vitesse-dark",
	"vitesse-light",
] as const;
const codeThemeChoices = codeThemeNames.map((name) => Type.Literal(name));

const LightPaletteSchema = Type.Object(
	{
		"color-primary": Type.String({ default: "#0d6efd" }),
		"color-on-primary": Type.String({ default: "#ffffff" }),
		"color-primary-container": Type.String({ default: "#cfe2ff" }),
		"color-on-primary-container": Type.String({ default: "#084298" }),
		"color-secondary": Type.String({ default: "#6c757d" }),
		"color-on-secondary": Type.String({ default: "#ffffff" }),
		"color-secondary-container": Type.String({ default: "#d3d3d4" }),
		"color-on-secondary-container": Type.String({ default: "#41464b" }),
		"color-tertiary": Type.String({ default: "#6c757d" }),
		"color-on-tertiary": Type.String({ default: "#ffffff" }),
		"color-tertiary-container": Type.String({ default: "#d3d3d4" }),
		"color-on-tertiary-container": Type.String({ default: "#41464b" }),
		"color-error": Type.String({ default: "#dc3545" }),
		"color-on-error": Type.String({ default: "#ffffff" }),
		"color-error-container": Type.String({ default: "#f8d7da" }),
		"color-on-error-container": Type.String({ default: "#842029" }),
		"color-surface": Type.String({ default: "#f8f9fa" }),
		"color-surface-dim": Type.String({ default: "#e9ecef" }),
		"color-surface-bright": Type.String({ default: "#ffffff" }),
		"color-surface-inverse": Type.String({ default: "#212529" }),
		"color-on-surface": Type.String({ default: "#212529" }),
		"color-on-surface-variant": Type.String({ default: "#495057" }),
		"color-on-surface-inverse": Type.String({ default: "#f8f9fa" }),
		"color-surface-container-lowest": Type.String({ default: "#ffffff" }),
		"color-surface-container-low": Type.String({ default: "#e9ecef" }),
		"color-surface-container": Type.String({ default: "#dee2e6" }),
		"color-surface-container-high": Type.String({ default: "#ced4da" }),
		"color-surface-container-highest": Type.String({ default: "#adb5bd" }),
		"color-shadow": Type.String({ default: "hsla(0, 0%, 0%, 0.15)" }),
		"color-outline": Type.String({ default: "#6c757d" }),
		"color-outline-variant": Type.String({ default: "#ced4da" }),
	},
	{
		default: {},
		additionalProperties: false,
		description:
			"Light palette CSS color values; hex, rgb, hsl and other CSS color syntax are supported.",
	},
);

const DarkPaletteSchema = Type.Object(
	{
		"color-primary": Type.String({ default: "#3b82f6" }),
		"color-on-primary": Type.String({ default: "#ffffff" }),
		"color-primary-container": Type.String({ default: "#0d6efd" }),
		"color-on-primary-container": Type.String({ default: "#cfe2ff" }),
		"color-secondary": Type.String({ default: "#adb5bd" }),
		"color-on-secondary": Type.String({ default: "#212529" }),
		"color-secondary-container": Type.String({ default: "#495057" }),
		"color-on-secondary-container": Type.String({ default: "#d3d3d4" }),
		"color-tertiary": Type.String({ default: "#adb5bd" }),
		"color-on-tertiary": Type.String({ default: "#212529" }),
		"color-tertiary-container": Type.String({ default: "#495057" }),
		"color-on-tertiary-container": Type.String({ default: "#d3d3d4" }),
		"color-error": Type.String({ default: "#f87171" }),
		"color-on-error": Type.String({ default: "#4f0b0b" }),
		"color-error-container": Type.String({ default: "#dc3545" }),
		"color-on-error-container": Type.String({ default: "#f8d7da" }),
		"color-surface": Type.String({ default: "#121212" }),
		"color-surface-dim": Type.String({ default: "#1f1f1f" }),
		"color-surface-bright": Type.String({ default: "#333333" }),
		"color-surface-inverse": Type.String({ default: "#e9ecef" }),
		"color-on-surface": Type.String({ default: "#e9ecef" }),
		"color-on-surface-variant": Type.String({ default: "#adb5bd" }),
		"color-on-surface-inverse": Type.String({ default: "#121212" }),
		"color-surface-container-lowest": Type.String({ default: "#1f1f1f" }),
		"color-surface-container-low": Type.String({ default: "#333333" }),
		"color-surface-container": Type.String({ default: "#4f4f4f" }),
		"color-surface-container-high": Type.String({ default: "#666666" }),
		"color-surface-container-highest": Type.String({ default: "#7f7f7f" }),
		"color-shadow": Type.String({ default: "hsla(0, 0%, 0%, 0.5)" }),
		"color-outline": Type.String({ default: "#6c757d" }),
		"color-outline-variant": Type.String({ default: "#495057" }),
	},
	{
		default: {},
		additionalProperties: false,
		description: "Dark palette CSS color values.",
	},
);

const GlobalsSchema = Type.Object(
	{
		"shadow-raised": Type.String({
			default:
				"0px 3px 1px -2px rgba(251 241 199 / 20%), 0px 2px 2px 0px rgba(251 241 199 / 14%), 0px 1px 5px 0px rgba(0 0 0 / 12%)",
		}),
		"font-mono-name": Type.String({
			default: '"monaco, monospace"',
			description: "CSS font-family value for monospace text.",
		}),
		"font-sans-name": Type.String({
			default: '"Noto Sans"',
			description: "CSS font-family value for sans-serif text.",
		}),
		"font-sans-url": Type.String({
			default: '"/fonts/noto-sans.woff2"',
			description: "CSS-quoted font URL.",
		}),
		"font-sans-weight": Type.String({
			default: "300 600",
			description: "Font-face weight or variable font weight range.",
		}),
		"font-size-xxs": Type.String({ default: "0.7rem" }),
		"font-size-xs": Type.String({ default: "0.825rem" }),
		"font-size-small": Type.String({ default: "1rem" }),
		"font-size-normal": Type.String({ default: "1.25rem" }),
		"font-size-medium": Type.String({ default: "1.5rem" }),
		"font-size-large": Type.String({ default: "1.75rem" }),
		"font-size-xl": Type.String({ default: "2rem" }),
		"font-size-xxl": Type.String({ default: "2.25rem" }),
		"font-size-mobile-responsive-factor": Type.Number({
			default: 0.8,
			description: "Mobile font-size multiplier.",
		}),
		"font-size-root": Type.Number({
			default: 22,
			description: "Root font size in pixels.",
		}),
		"font-weight-light": Type.Number({ default: 300 }),
		"font-weight-normal": Type.Number({ default: 400 }),
		"font-weight-medium": Type.Number({ default: 500 }),
		"font-weight-semibold": Type.Number({ default: 550 }),
		"font-weight-bold": Type.Number({ default: 600 }),
		"radius-none": Type.String({ default: "0" }),
		"radius-small": Type.String({ default: "0.25rem" }),
		"radius-medium": Type.String({ default: "0.375rem" }),
		"radius-large": Type.String({ default: "0.5rem" }),
		"radius-xl": Type.String({ default: "0.75rem" }),
		"radius-x2l": Type.String({ default: "1rem" }),
		"radius-x3l": Type.String({ default: "1.5rem" }),
		"radius-x4l": Type.String({ default: "2.5rem" }),
		"radius-full": Type.String({ default: "9999px" }),
		"breakpoint-phone": Type.Number({
			default: 640,
			description: "Phone breakpoint in pixels.",
		}),
		"breakpoint-tablet": Type.Number({
			default: 768,
			description: "Tablet breakpoint in pixels.",
		}),
		"breakpoint-laptop": Type.Number({
			default: 1024,
			description: "Laptop breakpoint in pixels.",
		}),
		"breakpoint-desktop": Type.Number({
			default: 1280,
			description: "Desktop breakpoint in pixels.",
		}),
		"space-1": Type.String({ default: "0.25rem" }),
		"space-2": Type.String({ default: "0.5rem" }),
		"space-3": Type.String({ default: "0.75rem" }),
		"space-4": Type.String({ default: "1rem" }),
		"space-5": Type.String({ default: "1.25rem" }),
		"space-6": Type.String({ default: "1.5rem" }),
		"space-7": Type.String({ default: "1.75rem" }),
		"space-8": Type.String({ default: "2rem" }),
		"space-9": Type.String({ default: "2.25rem" }),
		"space-10": Type.String({ default: "2.5rem" }),
		"space-0-5": Type.String({ default: "0.125rem" }),
		"space-1-5": Type.String({ default: "0.375rem" }),
		"space-2-5": Type.String({ default: "0.625rem" }),
		"space-3-5": Type.String({ default: "0.875rem" }),
	},
	{
		default: {},
		additionalProperties: false,
		description:
			"Global CSS tokens. Sizes, spacing and radii are CSS-length strings unless a field explicitly uses a number.",
	},
);

const MarkdownThemeSchema = Type.Object(
	{
		sidenote: Type.Object(
			{
				"sidenote-callout-before-content": Type.String({ default: '"[ "' }),
				"sidenote-callout-after-content": Type.String({ default: '" ]"' }),
				"sidenote-citation-before-content": Type.String({ default: '""' }),
				"sidenote-citation-after-content": Type.String({ default: '":"' }),
			},
			{
				default: {},
				additionalProperties: false,
				description:
					"CSS content values for sidenotes; include CSS string quotes inside the YAML value.",
			},
		),
		code: Type.Object(
			{
				light: Type.Union(codeThemeChoices, {
					default: "github-light",
					description:
						"Shiki theme for light-mode code blocks and both editors.",
				}),
				dark: Type.Union(codeThemeChoices, {
					default: "github-dark",
					description:
						"Shiki theme for dark-mode code blocks and both editors.",
				}),
			},
			{ default: {}, additionalProperties: false },
		),
	},
	{ default: {}, additionalProperties: false },
);

const ThemeSchema = Type.Object(
	{
		light: LightPaletteSchema,
		dark: DarkPaletteSchema,
		globals: GlobalsSchema,
		markdown: MarkdownThemeSchema,
	},
	{
		default: {},
		additionalProperties: false,
		description:
			"Theme overrides. Omit any defaulted tokens you do not need to customize.",
	},
);

export const ConfigSchema = Type.Object(
	{
		network: NetworkSchema,
		url: UrlSchema,
		auth: Type.Optional(AuthSchema),
		storage: StorageSchema,
		sync: SyncSchema,
		worker: WorkerSchema,
		ai: Type.Optional(AiSchema),
		paths: PathsSchema,
		assets: AssetsSchema,
		content: ContentSchema,
		pieces: PiecesSchema,
		theme: ThemeSchema,
	},
	{ title: "Luzzle web configuration", additionalProperties: false },
);

export type Config = Static<typeof ConfigSchema>;
