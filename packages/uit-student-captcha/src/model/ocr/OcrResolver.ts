// The single stable extension seam every OCR backend implements (Constitution II,
// FR-019). See data-model.md §1 and contracts/ocr-resolver.contract.md.

/** What the ViewModel hands a resolver. Carries both representations so a resolver
 *  picks whichever its provider/config wants (URL by default; bytes for EasyOCR). */
export interface OcrInput {
  readonly imageUrl: string | null;
  readonly imageBytes: Blob | null;
  readonly mimeType: string;
}

/** Uniform success shape returned by every resolver. */
export interface OcrResult {
  readonly provider: string;
  readonly rawText: string;
  readonly text: string;
  readonly confidence: number | null;
}

/** The single stable extension seam. Resolvers throw OcrError on failure. */
export interface OcrResolver {
  readonly id: string;
  resolve(input: OcrInput): Promise<OcrResult>;
}
