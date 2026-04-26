import { Router, Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { extractTextFromBuffer } from "../utils/documentParser";
import { logActivity } from "../activityStream";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = Router();

router.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          logActivity("API", "extract-text rejected: file too large.", "error");
          res.status(413).json({ error: "File too large (max 5MB)." });
          return;
        }
        logActivity("API", `extract-text multer error: ${err.message}`, "error");
        res.status(400).json({ error: err.message });
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        logActivity("API", "extract-text called without a file.", "error");
        res.status(400).json({ error: "Missing multipart field 'file'." });
        return;
      }

      logActivity("API", `Extracting text from: ${file.originalname}`);

      const text = await extractTextFromBuffer(file.buffer, file.originalname);

      if (!text.trim()) {
        logActivity("API", `No extractable text in: ${file.originalname}`, "error");
        res.status(422).json({ error: "No text could be extracted from this file." });
        return;
      }

      logActivity("API", `Extracted ${text.length} characters from ${file.originalname}.`);
      res.status(200).json({ text });
    } catch (error) {
      const message = (error as Error).message;
      logActivity("API", `extract-text failed: ${message}`, "error");
      res.status(400).json({ error: message });
    }
  }
);

export default router;
