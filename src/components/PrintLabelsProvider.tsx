import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LabelCard } from '@/components/LabelCard';
import type { LabelUnit } from '@/lib/labels';

interface PrintLabelsContextValue {
  printLabels: (units: LabelUnit[]) => void;
}

const PrintLabelsContext = createContext<PrintLabelsContextValue | null>(null);

export function PrintLabelsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<LabelUnit[] | null>(null);

  useEffect(() => {
    if (!units || units.length === 0) return;

    document.body.classList.add('printing-labels');
    window.print();

    const cleanup = () => {
      document.body.classList.remove('printing-labels');
      setUnits(null);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    return () => window.removeEventListener('afterprint', cleanup);
  }, [units]);

  const printLabels = useCallback((next: LabelUnit[]) => {
    if (next.length === 0) return;
    setUnits(next);
  }, []);

  return (
    <PrintLabelsContext.Provider value={{ printLabels }}>
      {children}
      {createPortal(
        <div id="label-print-area">
          {units?.map((unit) => <LabelCard key={unit.printCode} unit={unit} />)}
        </div>,
        document.body,
      )}
    </PrintLabelsContext.Provider>
  );
}

export function usePrintLabels(): (units: LabelUnit[]) => void {
  const ctx = useContext(PrintLabelsContext);
  if (!ctx) throw new Error('usePrintLabels debe usarse dentro de PrintLabelsProvider');
  return ctx.printLabels;
}
