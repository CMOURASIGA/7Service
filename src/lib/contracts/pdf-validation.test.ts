import { describe, expect, it } from 'vitest';

import { assertPdfSignature, contractPdfStoragePath, validateContractPdfMetadata } from './pdf-validation';

const valid = { originalName: 'contrato-assinado.pdf', mimeType: 'application/pdf', sizeBytes: 1024 };

describe('validateContractPdfMetadata', () => {
  it('accepts PDF metadata', () => {
    expect(() => validateContractPdfMetadata(valid)).not.toThrow();
    expect(() => validateContractPdfMetadata({ ...valid, originalName: 'CONTRATO.PDF' })).not.toThrow();
  });

  it.each([' contrato.pdf', 'contrato.pdf ', 'contrato.txt', '../contrato.pdf', 'folder/contrato.pdf', 'folder\\contrato.pdf', 'contrato\n.pdf'])(
    'rejects unsafe filename %s',
    (originalName) => {
      expect(() => validateContractPdfMetadata({ ...valid, originalName })).toThrow();
    },
  );

  it('rejects a non-PDF MIME type', () => {
    expect(() => validateContractPdfMetadata({ ...valid, mimeType: 'image/png' })).toThrow();
  });

  it.each([0, -1, 0.5, 10 * 1024 * 1024 + 1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid byte size %s',
    (sizeBytes) => {
      expect(() => validateContractPdfMetadata({ ...valid, sizeBytes })).toThrow();
    },
  );
});


describe('private PDF storage helpers', () => {
  const contractId = '123e4567-e89b-42d3-a456-426614174000';
  const documentId = '123e4567-e89b-42d3-a456-426614174001';

  it('generates an opaque storage path', () => {
    expect(contractPdfStoragePath(contractId, documentId)).toBe(`${contractId}/${documentId}.pdf`);
  });

  it.each(['../other', 'not-a-uuid', ''])('rejects invalid IDs: %s', (id) => {
    expect(() => contractPdfStoragePath(id, documentId)).toThrow();
  });

  it('permits the exact configured maximum size', () => {
    expect(() => validateContractPdfMetadata({ ...valid, sizeBytes: 10 * 1024 * 1024 })).not.toThrow();
  });

  it('rejects IDs that look like paths', () => {
    expect(() => contractPdfStoragePath('invalid/path', documentId)).toThrow();
    expect(() => contractPdfStoragePath(contractId, '../other.pdf')).toThrow();
  });

  it('accepts a PDF signature', () => {
    expect(() => assertPdfSignature(new Uint8Array([37, 80, 68, 70, 45, 49]))).not.toThrow();
  });

  it('rejects arbitrary bytes and truncated headers', () => {
    expect(() => assertPdfSignature(new Uint8Array([80, 78, 71, 0, 0]))).toThrow();
    expect(() => assertPdfSignature(new Uint8Array([37, 80, 68]))).toThrow();
  });
});
