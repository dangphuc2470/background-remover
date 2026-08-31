import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import {
  buildLightnessGradient,
  buildRainbowGradient,
  buildSaturationGradient,
  symmetricLightnessRange,
  isChromaticSource,
  sourceLightnessCenter,
  clamp,
  rgbToHex,
} from '../utils/colorUtils';

const MIN_GAP = 2;

function shiftRange(start, end, delta) {
  const width = end - start;
  let nextStart = start + delta;
  let nextEnd = end + delta;
  if (nextStart < 0) {
    nextStart = 0;
    nextEnd = width;
  }
  if (nextEnd > 100) {
    nextEnd = 100;
    nextStart = 100 - width;
  }
  return { start: nextStart, end: nextEnd };
}

function expandRangeFromCenter(initialStart, initialEnd, edge, value) {
  const center = (initialStart + initialEnd) / 2;
  if (edge === 'start') {
    const newStart = clamp(value, 0, center - MIN_GAP / 2);
    const half = center - newStart;
    return {
      start: newStart,
      end: clamp(center + half, center + MIN_GAP / 2, 100),
    };
  }
  const newEnd = clamp(value, center + MIN_GAP / 2, 100);
  const half = newEnd - center;
  return {
    start: clamp(center - half, 0, center - MIN_GAP / 2),
    end: newEnd,
  };
}

function computeDragRange(dragState, clientX, shiftKey, valueFromClientX, baseRange) {
  const value = valueFromClientX(clientX);
  const { edge, initialStart, initialEnd, initialPointer } = dragState;

  if (shiftKey && edge === 'move') {
    return shiftRange(initialStart, initialEnd, value - initialPointer);
  }
  if (shiftKey && edge !== 'move') {
    return expandRangeFromCenter(initialStart, initialEnd, edge, value);
  }
  if (edge === 'move') {
    return shiftRange(initialStart, initialEnd, value - initialPointer);
  }
  if (edge === 'start') {
    return { ...baseRange, start: clamp(value, 0, baseRange.end - MIN_GAP) };
  }
  return { ...baseRange, end: clamp(value, baseRange.start + MIN_GAP, 100) };
}

function PreviewStrip({
  gradient,
  start,
  end,
  center,
  label,
  rangeLabel,
  onHandlePointerDown,
  handleLabels,
}) {
  const bandWidth = Math.max(end - start, 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#49454F]">{label}</p>
        <p className="text-[10px] font-semibold text-[#49454F]">{rangeLabel}</p>
      </div>
      <div className="relative h-9 rounded-lg overflow-visible border border-[#CAC4D0] shadow-inner">
        <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ background: gradient }} />
        <div
          className="absolute inset-y-0 border-y-[3px] border-[#0B57D0] bg-white/25 pointer-events-none rounded-sm"
          style={{
            left: `${start}%`,
            width: `${bandWidth}%`,
            borderLeftWidth: '3px',
            borderRightWidth: '3px',
          }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-[#041E49] z-10 pointer-events-none"
          style={{ left: `${center}%` }}
          title="Màu nguồn"
        />
        <div
          className="absolute top-0 bottom-0 w-1.5 -translate-x-1/2 rounded-full bg-white border-2 border-[#041E49]/70 shadow z-20 pointer-events-none"
          style={{ left: `${center}%` }}
        />

        {bandWidth >= MIN_GAP * 2 && (
          <button
            type="button"
            aria-label={handleLabels.move}
            onPointerDown={onHandlePointerDown('move')}
            className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md bg-[#0B57D0]/15 border border-[#0B57D0]/40 shadow-sm cursor-grab active:cursor-grabbing z-25 hover:bg-[#0B57D0]/25 active:bg-[#0B57D0]/30 transition-colors touch-none"
            style={{
              left: `${start + 4}%`,
              width: `${Math.max(bandWidth - 8, 4)}%`,
            }}
          >
            <span className="sr-only">{handleLabels.move}</span>
            <span
              className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none"
              aria-hidden
            >
              <span className="w-0.5 h-3 rounded-full bg-[#0B57D0]/70" />
              <span className="w-0.5 h-3 rounded-full bg-[#0B57D0]/70" />
              <span className="w-0.5 h-3 rounded-full bg-[#0B57D0]/70" />
            </span>
          </button>
        )}

        <button
          type="button"
          aria-label={handleLabels.min}
          onPointerDown={onHandlePointerDown('start')}
          className="absolute top-1/2 -translate-y-1/2 w-5 h-9 -translate-x-1/2 rounded-lg bg-white border-2 border-[#0B57D0] shadow-lg cursor-ew-resize z-30 hover:scale-110 active:scale-105 transition-transform touch-none"
          style={{ left: `${start}%` }}
        >
          <span className="sr-only">{handleLabels.min}</span>
          <span className="absolute inset-x-1.5 top-1/2 -translate-y-1/2 h-3 rounded-sm bg-[#0B57D0]/20" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={handleLabels.max}
          onPointerDown={onHandlePointerDown('end')}
          className="absolute top-1/2 -translate-y-1/2 w-5 h-9 -translate-x-1/2 rounded-lg bg-white border-2 border-[#0B57D0] shadow-lg cursor-ew-resize z-30 hover:scale-110 active:scale-105 transition-transform touch-none"
          style={{ left: `${end}%` }}
        >
          <span className="sr-only">{handleLabels.max}</span>
          <span className="absolute inset-x-1.5 top-1/2 -translate-y-1/2 h-3 rounded-sm bg-[#0B57D0]/20" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** 2 thanh — kéo local, commit parent khi thả để không lag UI. */
export default function SimilarityPreviewSlider({
  sourceColor,
  hueRange,
  lightnessRange,
  onHueRangeChange,
  onLightnessRangeChange,
  lightnessTolerance,
  onLightnessToleranceChange,
  disabled,
  labels,
}) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null);
  const localHueRef = useRef(null);
  const localLightRef = useRef(null);
  const masterTimerRef = useRef(null);

  const [localHueRange, setLocalHueRange] = useState(null);
  const [localLightnessRange, setLocalLightnessRange] = useState(null);
  const [localTolerance, setLocalTolerance] = useState(lightnessTolerance);

  const chromatic = useMemo(() => isChromaticSource(sourceColor), [sourceColor]);
  const rainbowGradient = useMemo(() => buildRainbowGradient(sourceColor), [sourceColor]);
  const lightnessGradient = useMemo(() => buildLightnessGradient(sourceColor), [sourceColor]);
  const neutralGradient = useMemo(() => buildSaturationGradient(sourceColor), [sourceColor]);
  const sourceHex = rgbToHex(sourceColor);
  const lightCenter = useMemo(() => sourceLightnessCenter(sourceColor), [sourceColor]);

  const displayHueRange = localHueRange ?? hueRange;
  const displayLightnessRange = localLightnessRange ?? lightnessRange;

  useEffect(() => {
    if (!draggingRef.current) {
      setLocalHueRange(null);
      setLocalLightnessRange(null);
      localHueRef.current = null;
      localLightRef.current = null;
    }
  }, [hueRange, lightnessRange]);

  useEffect(() => {
    setLocalTolerance(lightnessTolerance);
  }, [lightnessTolerance]);

  const valueFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp(Math.round(((clientX - rect.left) / rect.width) * 100), 0, 100);
  }, []);

  const commitDrag = useCallback(() => {
    if (localHueRef.current) {
      onHueRangeChange(localHueRef.current);
      localHueRef.current = null;
      setLocalHueRange(null);
    }
    if (localLightRef.current) {
      onLightnessRangeChange(localLightRef.current);
      localLightRef.current = null;
      setLocalLightnessRange(null);
    }
    draggingRef.current = null;
  }, [onHueRangeChange, onLightnessRangeChange]);

  const applyDrag = useCallback((dragState, clientX, shiftKey) => {
    const isHue = dragState.axis === 'hue';
    const baseRange = isHue ? (localHueRef.current ?? hueRange) : (localLightRef.current ?? lightnessRange);
    const nextRange = computeDragRange(dragState, clientX, shiftKey, valueFromClientX, baseRange);

    if (isHue) {
      localHueRef.current = nextRange;
      setLocalHueRange(nextRange);
    } else {
      localLightRef.current = nextRange;
      setLocalLightnessRange(nextRange);
    }
  }, [valueFromClientX, hueRange, lightnessRange]);

  const commitMasterChange = useCallback((value) => {
    onLightnessToleranceChange(value);
    onLightnessRangeChange(symmetricLightnessRange(sourceColor, value));
  }, [sourceColor, onLightnessToleranceChange, onLightnessRangeChange]);

  const handleMasterInput = useCallback((value) => {
    setLocalTolerance(value);
    if (masterTimerRef.current) clearTimeout(masterTimerRef.current);
    masterTimerRef.current = setTimeout(() => commitMasterChange(value), 250);
  }, [commitMasterChange]);

  const handleMasterPointerUp = useCallback(() => {
    if (masterTimerRef.current) {
      clearTimeout(masterTimerRef.current);
      masterTimerRef.current = null;
    }
    commitMasterChange(localTolerance);
  }, [commitMasterChange, localTolerance]);

  useEffect(() => () => {
    if (masterTimerRef.current) clearTimeout(masterTimerRef.current);
  }, []);

  const makeHandlePointerDown = (axis, range) => (edge) => (e) => {
    if (disabled) return;
    e.preventDefault();
    draggingRef.current = {
      axis,
      edge,
      initialStart: range.start,
      initialEnd: range.end,
      initialPointer: valueFromClientX(e.clientX),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    applyDrag(draggingRef.current, e.clientX, e.shiftKey);
  }, [applyDrag]);

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    commitDrag();
  }, [commitDrag]);

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

  const fmt = (n) => `${Math.round(n)}%`;
  const handleLabels = {
    min: labels.handleMin,
    max: labels.handleMax,
    move: labels.handleMove,
  };

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div
        ref={trackRef}
        className="relative select-none touch-none space-y-4 py-1"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {chromatic ? (
          <PreviewStrip
            gradient={rainbowGradient}
            start={displayHueRange.start}
            end={displayHueRange.end}
            center={50}
            label={labels.rainbow}
            rangeLabel={`${fmt(displayHueRange.start)} – ${fmt(displayHueRange.end)}`}
            onHandlePointerDown={makeHandlePointerDown('hue', displayHueRange)}
            handleLabels={handleLabels}
          />
        ) : (
          <p className="text-xs text-[#49454F] italic">{labels.neutralHueHint}</p>
        )}

        <PreviewStrip
          gradient={chromatic ? lightnessGradient : neutralGradient}
          start={displayLightnessRange.start}
          end={displayLightnessRange.end}
          center={lightCenter}
          label={chromatic ? labels.lightness : labels.saturationNeutral}
          rangeLabel={`${fmt(displayLightnessRange.start)} – ${fmt(displayLightnessRange.end)}`}
          onHandlePointerDown={makeHandlePointerDown('lightness', displayLightnessRange)}
          handleLabels={handleLabels}
        />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#49454F]">{labels.masterTolerance}</p>
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded border border-[#CAC4D0] shrink-0"
            style={{ backgroundColor: sourceHex }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={localTolerance}
            onChange={(e) => handleMasterInput(Number(e.target.value))}
            onPointerUp={handleMasterPointerUp}
            className="flex-1 accent-[#0B57D0]"
            disabled={disabled}
          />
          <span className="text-sm font-bold w-12 text-right shrink-0">{localTolerance}%</span>
        </div>
        <p className="text-xs text-[#49454F]">{labels.masterHint}</p>
      </div>

      <p className="text-xs text-[#49454F] leading-relaxed">{labels.bandHint}</p>
    </div>
  );
}
