'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client-api.js';

export function useApi(url) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!url) { setState({ data: null, meta: null, loading: false, error: null }); return undefined; }
    setState((s) => ({ ...s, loading: true, error: null }));
    api(url)
      .then((r) => alive && setState({ data: r.data, meta: r.meta || null, loading: false, error: null }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message })));
    return () => { alive = false; };
  }, [url, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
