import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const router = Router();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const extensionDir = path.join(repoRoot, "extensions", "decision-ai");

router.get("/download", (_req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="decision-ai-extension.zip"');

  const archive = new ZipArchive({ zlib: { level: 9 } });

  archive.on("error", (err) => {
    console.error("Archiver error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to create zip" });
    }
  });

  archive.pipe(res);
  archive.directory(extensionDir, "decision-ai-extension");
  archive.finalize();
});

export default router;
