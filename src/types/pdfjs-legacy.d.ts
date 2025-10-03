declare module 'pdfjs-dist/legacy/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<unknown>;
  }
  export function getDocument(src: string | unknown): { promise: Promise<PDFDocumentProxy> };
}

declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<unknown>;
  }
  export function getDocument(src: string | unknown): { promise: Promise<PDFDocumentProxy> };
  export const version: string;
}

declare module 'pdfjs-dist/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<unknown>;
  }
  export function getDocument(src: string | unknown): { promise: Promise<PDFDocumentProxy> };
  export const version: string;
}

