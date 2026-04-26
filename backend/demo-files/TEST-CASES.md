# Suggested test cases

1. Happy path
- Resume: `resume-good.txt`
- JD: `jd-good.txt`
- Expected: 200 response with complete structured output.

2. Empty resume (validation)
- Resume: `resume-empty.txt`
- JD: `jd-good.txt`
- Expected: 400 with "Invalid input" error.

3. Very short JD
- Resume: `resume-good.txt`
- JD: `jd-minimal.txt`
- Expected: 200, but lower confidence/detail in output.

4. Role mismatch
- Resume: `resume-mismatch.txt`
- JD: `jd-backend-senior.txt`
- Expected: 200 with low fit score and strong gap analysis.

5. Missing API key/base URL
- Remove one env value from `.env` and restart server.
- Expected: startup warning + optimize request fails with 500.

6. PDF upload (UI)
- Export `resume-good.txt` or your real resume to PDF (Word / Google Docs → Save as PDF).
- Upload the PDF in the Resume file picker.
- Expected: activity log shows extract success; textarea fills with text; optimize returns 200.

7. DOCX upload (UI)
- Save the same content as `.docx` and upload.
- Expected: same as PDF (mammoth extracts plain text).

8. Legacy .doc
- Upload an old `.doc` file.
- Expected: 400 from `/api/extract-text` with message to use .docx or PDF.

9. Startup env errors in the UI
- If you still see `ASI_ONE_* is not set` after editing `.env`, fully stop the dev server (`Ctrl+C`) and run `npm run dev` again from the project folder so `src/loadEnv.ts` can read the file.
