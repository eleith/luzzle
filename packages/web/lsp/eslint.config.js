import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
	js.configs.recommended,
	prettier,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
			ecmaVersion: 2022,
			sourceType: "module",
		},
		rules: {
			"no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"no-console": "off",
		},
	},
];
