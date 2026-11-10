'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const Ctx = createContext({ toast: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lift ${t.type === 'error' ? 'border-red-200' : 'border-sage'}`}>
            {t.type === 'error' ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf" />}
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="text-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
