import path from "node:path";
import mammoth from "mammoth";

type PdfParseFn = (data: Buffer) => Promise<{ text?: string }>;

async function loadPdfParse(): Promise<PdfParseFn> {
  const mod = await import("pdf-parse");
  const candidate = (mod as { default?: unknown }).default ?? mod;
  if (typeof candidate === "function") {
    return candidate as PdfParseFn;
  }
  throw new Error("pdf-parse module did not export a parser function.");
}

export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") {
    const pdfParse = await loadPdfParse();
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }

  if (ext === ".doc") {
    throw new Error(
      "Legacy .doc format is not supported. Save the file as .docx or PDF and upload again."
    );
  }

  throw new Error(`Unsupported file type "${ext}". Use .pdf, .docx, or plain text.`);
}
