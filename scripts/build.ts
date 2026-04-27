import { mkdirSync, rmSync, watch } from 'node:fs';
import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const srcDir = resolve(root, 'src');
const outDir = resolve(root, 'dist');

const entrypoints = [resolve(srcDir, 'entries.ts'), resolve(srcDir, 'results.ts'), resolve(srcDir, 'startlist.ts')];

async function copyStaticAssets(): Promise<void> {
	await cp(resolve(root, 'manifest.json'), resolve(outDir, 'manifest.json'));
	mkdirSync(resolve(outDir, 'images'), { recursive: true });
	await cp(resolve(root, 'images/icon.png'), resolve(outDir, 'images/icon.png'));
}

async function build(): Promise<void> {
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });

	const result = await Bun.build({
		entrypoints,
		outdir: outDir,
		target: 'browser',
		format: 'iife',
		minify: true,
	});

	if (!result.success) {
		for (const log of result.logs) {
			console.error(log);
		}
		throw new Error('Bun.build failed');
	}

	await copyStaticAssets();
	console.log(`oris-ranking-chrome-extension - built ${result.outputs.length} entrypoints to ${outDir}`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const isWatch = args.includes('--watch');

	await build();

	if (!isWatch) return;

	console.log('oris-ranking-chrome-extension - watching for changes in src/');

	let timer: ReturnType<typeof setTimeout> | null = null;
	let building = false;
	const debounceMs = 100;

	watch(srcDir, { recursive: true }, () => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(async () => {
			if (building) return;
			building = true;
			try {
				await build();
			} catch (err) {
				console.error('rebuild failed:', err);
			} finally {
				building = false;
			}
		}, debounceMs);
	});
}

await main();
