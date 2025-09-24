import style from "@isentinel/eslint-config";

import prettier from "eslint-plugin-prettier";

export default style(
	{
		perfectionist: {
			customClassGroups: [
				"onInit",
				"onStart",
				"onPlayerJoin",
				"onPlayerLeave",
				"onRender",
				"onPhysics",
				"onTick",
			],
		},
		plugins: {
			prettier,
		},
		pnpm: true,
		react: true,
		rules: {
			"@cspell/spellchecker": "off",
			"antfu/consistent-list-newline": "off",
			"antfu/top-level-function": "off",
			"better-max-params/better-max-params": "off",
			"id-length": "off",
			"jsdoc/informative-docs": "off",
			"jsdoc/require-description-complete-sentence": "off",
			"max-classes-per-file": "off",
			"max-lines": "off",
			"max-lines-per-function": "off",
			"perfectionist/sort-objects": [
				"error",
				{
					customGroups: {
						id: "^id$",
						name: "^name$",
						callbacks: ["\b(on[A-Z][a-zA-Z]*)\b"],
						reactProps: ["^children$", "^ref$"],
						reflex: ["^loadPlayerData$", "^closePlayerData$"],
					},
					groups: ["id", "name", "reflex", "unknown", "reactProps"],
					order: "asc",
					partitionByComment: "^Part:\\*\\*(.*)$",
					type: "natural",
				},
			],
			"react-hooks-extra/no-unnecessary-use-memo": "off",
			"roblox/lua-truthiness": "off",
			"ts/no-empty-object-type": "off",
			"unicorn/no-keyword-prefix": "off",
		},
		type: "game",
		typescript: {
			parserOptions: {
				project: "tsconfig.build.json",
			},
			tsconfigPath: "tsconfig.build.json",
		},
	},
	{
		files: ["src/client/ui/hooks/**/*", "src/client/ui/components/**/*"],
		rules: {
			"max-lines-per-function": "off",
		},
	},
	{
		ignores: [
			// Markdown files
			"**/*.md",
			"docs/**/*.md",
			"prompts/**/*.md",
			"src/shared/ecs/configs/*.d.ts",

			// Yaml files
			"**/*.yaml",
			"**/*.yml",

			// Assets
			"assets/**/*.*",
			"asset/**/*.*",

			// Build outputs
			"dist/",
			"build/",
			"out/",

			// Node modules
			"node_modules/",

			"src/types/configs/**/*",
			"configs/**/*",
		],
	},
	{
		files: ["**/ecs/**/*"],
		rules: {
			"max-depth": "off",
			"react-hooks-roblox/rules-of-hooks": "off",
			"ts/no-floating-promises": "off",
		},
	},
	{
		files: ["**/ecs/systems/**/*"],
		rules: {
			"jsdoc/require-param": "off",
			"sonar/cognitive-complexity": "off",
			"ts/explicit-function-return-type": "off",
		},
	},
	{
		files: ["**/commands/**/*"],
		rules: {
			"unicorn/filename-case": "off",
		},
	},
);
