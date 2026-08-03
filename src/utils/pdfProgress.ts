export interface PDFProgressInfo {
  current: number;
  total: number;
  stage: string;
}

type Listener = (info: PDFProgressInfo | null) => void;

let current: PDFProgressInfo | null = null;
const listeners = new Set<Listener>();

export const reportPDFProgress = (info: PDFProgressInfo | null) => {
  current = info;
  listeners.forEach((listener) => listener(info));
};

export const subscribePDFProgress = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getPDFProgress = () => current;
