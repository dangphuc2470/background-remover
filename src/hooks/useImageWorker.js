import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_TIMEOUT_MS = 45000;

export function useImageWorker(workerModuleUrl, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const workerRef = useRef(null);
  const processIdRef = useRef(0);
  const timeoutRef = useRef(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(null);
  const callbacksRef = useRef({
    onStart: () => {},
    onSuccess: () => {},
    onError: () => {},
    onEnd: () => {},
  });
  const sendNextRef = useRef(() => {});

  useEffect(() => {
    const worker = new Worker(workerModuleUrl, { type: 'module' });
    let active = true;

    const sendNext = () => {
      if (!active || !workerRef.current) {
        inFlightRef.current = false;
        return;
      }
      if (!pendingRef.current) {
        inFlightRef.current = false;
        return;
      }

      const { payload, transferables } = pendingRef.current;
      pendingRef.current = null;
      const id = ++processIdRef.current;
      const shouldNotifyStart = !inFlightRef.current;
      inFlightRef.current = true;
      if (shouldNotifyStart) callbacksRef.current.onStart();

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (processIdRef.current !== id) return;
        processIdRef.current += 1;
        pendingRef.current = null;
        inFlightRef.current = false;
        callbacksRef.current.onError('Processing timeout');
      }, timeoutMs);

      try {
        workerRef.current.postMessage({ ...payload, id }, transferables);
      } catch (err) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        inFlightRef.current = false;
        callbacksRef.current.onError(err?.message || 'Failed to send image to worker');
        sendNext();
      }
    };

    sendNextRef.current = sendNext;

    worker.onmessage = (e) => {
      if (!active) return;
      const { id, result, error } = e.data;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;

      const hasPending = pendingRef.current != null;
      const isLatest = id === processIdRef.current && !hasPending;

      if (isLatest) {
        if (error) callbacksRef.current.onError(error);
        else callbacksRef.current.onSuccess(result);
      }

      sendNext();
    };

    worker.onerror = () => {
      if (!active) return;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callbacksRef.current.onError('Worker processing failed');
      sendNext();
    };

    workerRef.current = worker;

    return () => {
      active = false;
      processIdRef.current += 1;
      pendingRef.current = null;
      inFlightRef.current = false;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      worker.terminate();
      workerRef.current = null;
      sendNextRef.current = () => {};
      callbacksRef.current.onEnd();
    };
  }, [workerModuleUrl, timeoutMs]);

  const setCallbacks = useCallback((callbacks) => {
    callbacksRef.current = { ...callbacksRef.current, ...callbacks };
  }, []);

  const postJob = useCallback((payload, transferables = []) => {
    if (!workerRef.current) {
      callbacksRef.current.onError('Worker not ready');
      return;
    }
    pendingRef.current = { payload, transferables };
    if (!inFlightRef.current) sendNextRef.current();
  }, []);

  return { postJob, setCallbacks };
}
