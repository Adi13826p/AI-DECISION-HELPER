import archiver from '/home/runner/workspace/node_modules/.pnpm/archiver@8.0.0/node_modules/archiver/index.js';
import { createWriteStream } from 'fs';

const archive = archiver('zip', { zlib: { level: 9 } });
const output = createWriteStream('decision-ai-extension.zip');

output.on('close', () => console.log('Done:', archive.pointer(), 'bytes'));
archive.on('error', err => { throw err; });

archive.pipe(output);
archive.directory('extensions/decision-ai', 'decision-ai-extension');
archive.finalize();
