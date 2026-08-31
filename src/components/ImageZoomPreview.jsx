import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Scan } from 'lucide-react';

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 12;

export default function ImageZoomPreview({
  imageData,
  open,
  onClose,
  title,
  checkerboard = false,
  labels = {},
}) {
  const {
    zoomIn = 'Zoom in',
    zoomOut = 'Zoom out',
    zoomFit = 'Fit',
    zoom100 = '100%',
    zoomHint = 'Scroll to zoom • Drag to pan • Esc to close',
    close = 'Close',
  } = labels;

  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const fitToScreen = useCallback(() => {
    if (!viewportRef.current || !imageData) return;
    const { clientWidth, clientHeight } = viewportRef.current;
    const pad = 32;
    const scale = Math.min(
      (clientWidth - pad) / imageData.width,
      (clientHeight - pad) / imageData.height,
      1
    );
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  }, [imageData]);

  useEffect(() => {
    if (!open || !imageData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    try {
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext('2d').putImageData(imageData, 0, 0);
      requestAnimationFrame(fitToScreen);
    } catch {
      onClose();
    }
  }, [open, imageData, fitToScreen, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom((z) => clampZoom(z * factor));
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    dragOrigin.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e) => {
    if (!isPanning) return;
    setPan({
      x: dragOrigin.current.panX + (e.clientX - dragOrigin.current.x),
      y: dragOrigin.current.panY + (e.clientY - dragOrigin.current.y),
    });
  }, [isPanning]);

  const handlePointerUp = useCallback((e) => {
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  if (!open || !imageData) return null;

  const zoomPct = Math.round(zoom * 100);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#041E49]/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 bg-[#041E49] text-white shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{title}</p>
          <p className="text-xs text-white/70 hidden sm:block">{zoomHint}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" className="p-2 rounded-full hover:bg-white/10 cursor-pointer" onClick={() => setZoom((z) => clampZoom(z / 1.25))} title={zoomOut} aria-label={zoomOut}>
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold tabular-nums w-12 text-center">{zoomPct}%</span>
          <button type="button" className="p-2 rounded-full hover:bg-white/10 cursor-pointer" onClick={() => setZoom((z) => clampZoom(z * 1.25))} title={zoomIn} aria-label={zoomIn}>
            <ZoomIn className="w-5 h-5" />
          </button>
          <button type="button" className="p-2 rounded-full hover:bg-white/10 cursor-pointer" onClick={fitToScreen} title={zoomFit} aria-label={zoomFit}>
            <Maximize2 className="w-5 h-5" />
          </button>
          <button type="button" className="p-2 rounded-full hover:bg-white/10 cursor-pointer" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title={zoom100} aria-label={zoom100}>
            <Scan className="w-5 h-5" />
          </button>
          <button type="button" className="p-2 rounded-full hover:bg-white/10 cursor-pointer ml-1" onClick={onClose} title={close} aria-label={close}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`flex-1 overflow-hidden touch-none select-none ${checkerboard ? 'checkerboard' : 'bg-[#1a1a1a]'}`}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-2xl pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />
        </div>
      </div>
    </div>
  );
}
