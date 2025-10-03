export {};

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (src: string) => { promise: Promise<any> };
      version?: string;
    };
  }
}

