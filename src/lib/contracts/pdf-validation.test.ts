import { describe, expect, it } from 'vitest';

import { validateContractPdfMetadata } from './pdf-validation';

const valid = { originalName: 'contrato-assinado.pdf', mimeType: 'application/pdf', sizeBytes: 1024 };

describe('validateContractPdfMetadata', () => {
  it('accepts PDF metadata', () => {
    expect(() => validateContractPdfMetadata(valid)).not.toThrow();
    expect(() => validateContractPdfMetadata({ ...valid, originalName: 'CONTRATO.PDF' })).not.toThrow();
  });

  it.each(['contrato.txt', '../contrato.pdf', 'folder/contrato.pdf', 'folder\\contrato.pdf', 'contrato\n.pdf'])(
    'rejects unsafe filename %s',
    (originalName) => {
      expect(() => validateContractPdfMetadata({ ...valid, originalName })).toThrow();
    },
  );

  it('rejects a non-PDF MIME type', () => {
    expect(() => validateContractPdfMetadata({ ...valid, mimeType: 'image/png' })).toThrow();
  });

  it.each([0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid byte size %s',
    (sizeBytes) => {
      expect(() => validateContractPdfMetadata({ ...valid, sizeBytes })).toThrow();
    },
  );
});
