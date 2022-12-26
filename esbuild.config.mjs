import esbuild from "esbuild";
import process from "process";
import builtins from 'builtin-modules';
import {sassPlugin} from 'esbuild-sass-plugin'
import { copy } from 'esbuild-plugin-copy';

const banner =
`/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

const prod = (process.argv[2] === 'production');

esbuild.build({
	banner: {
		js: banner,
	},
	entryPoints: ['main.ts', 'styles.scss'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtins],
	format: 'cjs',
	watch: !prod,
	target: 'es2018',
	logLevel: "info",
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outdir: './dist',
	plugins: [
		sassPlugin({
			filter:	/.(s[ac]ss|css)$/,
		}),
		copy({
		  resolveFrom: 'cwd',	// Returns name of current working directory
		  assets: {
			from: ['./static/**/*'],
			to: ['./dist'],
		  },
		}),
	  ],
}).catch(() => process.exit(1));
