import { useEffect, useRef } from 'react';

export function useDebouncedCallback(callback, delay = 350) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef(null);

  const debounced = useRef((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
  });

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return debounced.current;
}

export function useDebouncedEffect(effect, deps, delay = 350) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    const timer = setTimeout(() => effectRef.current(), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
