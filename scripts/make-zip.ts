import archiver from "archiver";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = archiver("zip", { zlib: { level: 9 } });
const output = createWriteStream(path.join(root, "decision-ai-extension.zip"));

output.on("close", () => console.log("Done:", archive.pointer(), "bytes"));
archive.on("error", (err) => { throw err; });

archive.pipe(output);
archive.directory(path.join(root, "extensions", "decision-ai"), "decision-ai-extension");
archive.finalize();
