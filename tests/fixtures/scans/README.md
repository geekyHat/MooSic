# Scan fixtures

`../scans.ts` generates a high-contrast image, a digital text PDF and an image-only PDF from original invented study lyrics. Browser tests run the actual local OCR/PDF engines; the recognized text is never supplied by a mocked OCR response.

`password-protected.pdf` is the same generated text PDF encrypted with qpdf 12.4.2. Its test-only user password is `scan-test-password`; it checks that password-protected input is rejected without prompting or saving. It contains no third-party song.

To regenerate (qpdf required only for fixture generation):

```sh
node --import ./tests/unit/register.js --input-type=module -e 'import { writeFileSync } from "node:fs"; import { textPdf } from "./tests/fixtures/scans.ts"; writeFileSync("/tmp/moosic-scan-source.pdf", textPdf())'
qpdf --encrypt scan-test-password owner-test-password 256 -- /tmp/moosic-scan-source.pdf tests/fixtures/scans/password-protected.pdf
```
