import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Shield, Upload, Download, Copy, Wand2,
  Loader2, X, ClipboardPaste, FileImage, Sparkles, Info, ArrowLeft,
} from 'lucide-react';
import Toggle from '../components/Toggle';
import ImagePanel from '../components/ImagePanel';
import HoverColorPreview from '../components/HoverColorPreview';
import ImageZoomPreview from '../components/ImageZoomPreview';
import SimilarityPreviewSlider from '../components/SimilarityPreviewSlider';
import { useDebouncedEffect } from '../hooks/useDebouncedProcess';
import { useImageWorker } from '../hooks/useImageWorker';
import {
  parseColor, rgbToHex, loadImageFromFile, imageToImageData,
  imageDataToBlob, copyImageToClipboard, downloadBlob,
  cloneImageDataForWorker, drawImageDataToCanvas, getCanvasImageData,
  isAcceptedImage, ACCEPTED_EXTENSIONS,
  getPixelColor, canvasCoordsFromEvent, getPixelColorFromImageDataOrCanvas,
  defaultHueRange, defaultLightnessRange,
} from '../utils/colorUtils';

const T = {
  vi: {
    badge: '100% xử lý trên trình duyệt — bảo mật tuyệt đối',
    title: 'Đổi màu',
    titleHighlight: 'Color Replacer',
    subtitle: 'Chọn màu cần thay trên ảnh PNG/JPG, điều chỉnh dải màu và đổi sang màu mới — giữ nguyên tone sáng/tối nếu cần.',
    inputTitle: 'Ảnh gốc',
    outputTitle: 'Ảnh kết quả',
    clickToLoad: 'Nhấn để tải ảnh',
    dropHint: 'Kéo thả, dán (Ctrl+V) hoặc chọn tệp PNG/JPG',
    startHint: '← Bắt đầu bằng cách tải ảnh vào',
    importFile: 'Chọn tệp',
    saveAs: 'Lưu PNG',
    copyClipboard: 'Sao chép',
    toolOptions: 'Tùy chọn công cụ',
    sourceColor: 'Màu cần đổi',
    sourceColorHint: 'Click trên ảnh gốc để lấy màu nguồn',
    targetColor: 'Màu đích',
    targetColorHint: 'Màu mới sẽ thay thế vùng đã chọn',
    rangeHint: 'Kéo 2 đầu dải xanh trên từng thanh để chỉnh vùng đổi màu.',
    lightnessBar: 'Độ sáng',
    rainbowBar: 'Sắc màu (cầu vồng)',
    saturationNeutralBar: 'Độ xám (trắng/đen)',
    hueValue: 'Độ rộng sắc',
    lightnessValue: 'Độ rộng sáng',
    neutralHueHint: 'Màu xám/trắng — chỉ lọc theo độ sáng.',
    bandHint: 'Mỗi thanh + slider độc lập. Shift + nắm: 2 đầu mở/thu ngược chiều.',
    masterTolerance: 'Độ nhạy độ sáng (%)',
    masterHint: 'Chỉ thanh độ sáng — không ảnh hưởng cầu vồng.',
    handleMin: 'Thu hẹp dải (đầu trái)',
    handleMax: 'Mở rộng dải (đầu phải)',
    handleMove: 'Dịch cả dải (giữa)',
    tolerance: 'Độ nhạy màu tương tự (%)',
    pickColorFirst: 'Click ảnh gốc để chọn màu nguồn trước',
    matchTone: 'Giữ tone gốc',
    matchToneHint: 'Giữ độ sáng/tối của pixel gốc, chỉ đổi sắc thái sang màu đích',
    previewMask: 'Xem trước vùng đổi',
    previewMaskHint: 'Vùng cam = sẽ bị đổi màu',
    processing: 'Đang xử lý...',
    copied: 'Đã sao chép!',
    saved: 'Đã lưu!',
    errorLoad: 'Không thể tải ảnh. Vui lòng chọn file PNG hoặc JPG.',
    errorCopy: 'Không thể sao chép. Trình duyệt có thể chưa hỗ trợ.',
    errorTimeout: 'Xử lý quá lâu — thử ảnh nhỏ hơn hoặc tải lại trang.',
    errorWorker: 'Worker xử lý ảnh thất bại.',
    secureTitle: 'Bảo mật tuyệt đối',
    secureDesc: 'Ảnh được xử lý hoàn toàn trên trình duyệt qua Web Worker.',
    instantTitle: 'Xử lý tức thì',
    instantDesc: 'Kéo dải màu và xem kết quả ngay. Hỗ trợ PNG và JPG.',
    exportTitle: 'Xuất linh hoạt',
    exportDesc: 'Tải PNG hoặc sao chép vào clipboard.',
    clearImage: 'Xóa ảnh',
    continueEdit: 'Chỉnh tiếp',
    continueEditHint: 'Dùng ảnh kết quả làm ảnh gốc để chỉnh thêm',
    continuedEdit: 'Đã chuyển ảnh kết quả sang ảnh gốc',
    clickToZoom: 'Click để xem phóng to',
    zoomPreviewTitle: 'Xem phóng to',
    zoomIn: 'Phóng to',
    zoomOut: 'Thu nhỏ',
    zoomFit: 'Vừa màn hình',
    zoom100: '100%',
    zoomHint: 'Lăn chuột để zoom • Kéo để di chuyển • Esc để đóng',
    close: 'Đóng',
    colorPicked: (hex) => `Đã chọn màu nguồn ${hex}`,
  },
  en: {
    badge: '100% browser-side — fully private',
    title: 'Replace Image',
    titleHighlight: 'Colors',
    subtitle: 'Pick a color to replace on PNG/JPG images, adjust the color range, and swap to a new color — optionally preserving original tone.',
    inputTitle: 'Original image',
    outputTitle: 'Result image',
    clickToLoad: 'Click to load an image',
    dropHint: 'Drop, paste (Ctrl+V), or select a PNG/JPG file',
    startHint: '← Start by loading an input image',
    importFile: 'Import file',
    saveAs: 'Save PNG',
    copyClipboard: 'Copy',
    toolOptions: 'Tool Options',
    sourceColor: 'Source color',
    sourceColorHint: 'Click the input image to pick the source color',
    targetColor: 'Target color',
    targetColorHint: 'New color to apply within the selected range',
    rangeHint: 'Drag the blue band ends on each bar to set the replace area.',
    lightnessBar: 'Lightness',
    rainbowBar: 'Hue (rainbow)',
    saturationNeutralBar: 'Gray level (white/black)',
    hueValue: 'Hue width',
    lightnessValue: 'Lightness width',
    neutralHueHint: 'Gray/white pick — lightness only.',
    bandHint: 'Each bar + slider independent. Shift + grip: both ends expand opposite ways.',
    masterTolerance: 'Lightness sensitivity (%)',
    masterHint: 'Lightness bar only — does not affect rainbow.',
    handleMin: 'Narrow band (left edge)',
    handleMax: 'Widen band (right edge)',
    handleMove: 'Move whole band (center)',
    tolerance: 'Similar tone tolerance (%)',
    pickColorFirst: 'Click the input image to pick a source color first',
    matchTone: 'Match original tone',
    matchToneHint: 'Keep original lightness/shadows while shifting hue to the target color',
    previewMask: 'Preview replace area',
    previewMaskHint: 'Orange overlay = area that will be recolored',
    processing: 'Processing...',
    copied: 'Copied!',
    saved: 'Saved!',
    errorLoad: 'Could not load image. Please select a PNG or JPG file.',
    errorCopy: 'Could not copy. Browser may not support clipboard images.',
    errorTimeout: 'Processing took too long — try a smaller image or reload the page.',
    errorWorker: 'Image worker failed.',
    secureTitle: 'Fully private',
    secureDesc: 'Images are processed entirely in your browser via Web Worker.',
    instantTitle: 'Instant preview',
    instantDesc: 'Adjust the color range and see results immediately.',
    exportTitle: 'Flexible export',
    exportDesc: 'Download PNG or copy to clipboard.',
    clearImage: 'Clear image',
    continueEdit: 'Continue edit',
    continueEditHint: 'Use the result as the new input for further edits',
    continuedEdit: 'Result moved to input image',
    clickToZoom: 'Click to zoom preview',
    zoomPreviewTitle: 'Zoom preview',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomFit: 'Fit to screen',
    zoom100: '100%',
    zoomHint: 'Scroll to zoom • Drag to pan • Esc to close',
    close: 'Close',
    colorPicked: (hex) => `Picked source color ${hex}`,
  },
};

export default function ColorReplacer({ lang }) {
  const t = T[lang];

  const [inputData, setInputData] = useState(null);
  const [outputData, setOutputData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const [sourceColorInput, setSourceColorInput] = useState('');
  const [sourcePicked, setSourcePicked] = useState(false);
  const [targetColorInput, setTargetColorInput] = useState('#0B57D0');
  const [hueRange, setHueRange] = useState(() => defaultHueRange(15));
  const [lightnessRange, setLightnessRange] = useState({ start: 0, end: 100 });
  const [lightnessTolerance, setLightnessTolerance] = useState(20);
  const [matchTone, setMatchTone] = useState(true);
  const [previewMask, setPreviewMask] = useState(false);
  const [hoverPreview, setHoverPreview] = useState(null);
  const [zoomPreviewOpen, setZoomPreviewOpen] = useState(false);

  const fileInputRef = useRef(null);
  const inputCanvasRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const outputDisplaySizeRef = useRef({ width: 0, height: 0 });
  const processOptionsRef = useRef({});
  const workerHandlersRef = useRef({});

  const workerUrl = useMemo(
    () => new URL('../workers/colorReplaceWorker.js', import.meta.url),
    []
  );
  const { postJob, setCallbacks } = useImageWorker(workerUrl);

  workerHandlersRef.current = {
    onSuccess: (result) => {
      setIsProcessing(false);
      setOutputData(result);
    },
    onError: (message) => {
      setIsProcessing(false);
      if (message === 'Processing timeout') setError(t.errorTimeout);
      else if (message === 'Worker processing failed') setError(t.errorWorker);
      else setError(message);
    },
  };

  useEffect(() => {
    setCallbacks({
      onStart: () => setIsProcessing(true),
      onSuccess: (result) => workerHandlersRef.current.onSuccess(result),
      onError: (message) => workerHandlersRef.current.onError(message),
      onEnd: () => setIsProcessing(false),
    });
  }, [setCallbacks]);

  const sourceColor = useMemo(
    () => (sourcePicked ? parseColor(sourceColorInput) : null),
    [sourceColorInput, sourcePicked]
  );
  const targetColor = useMemo(() => parseColor(targetColorInput), [targetColorInput]);
  const sourceHex = sourceColor ? rgbToHex(sourceColor) : '#808080';
  const targetHex = rgbToHex(targetColor);

  useEffect(() => {
    if (!sourceColor) return;
    setHueRange(defaultHueRange(15));
    setLightnessRange(defaultLightnessRange(sourceColor, 20));
    setLightnessTolerance(20);
  }, [sourceColor]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const drawToCanvas = useCallback((canvasRef, imageData, targetWidth, targetHeight) => {
    if (!canvasRef.current || !imageData) return;
    drawImageDataToCanvas(canvasRef.current, imageData, targetWidth, targetHeight);
  }, []);

  useEffect(() => { drawToCanvas(inputCanvasRef, inputData); }, [inputData, drawToCanvas]);
  useEffect(() => {
    if (!outputData) return;
    const { width, height } = outputDisplaySizeRef.current;
    drawToCanvas(outputCanvasRef, outputData, width || outputData.width, height || outputData.height);
  }, [outputData, drawToCanvas]);

  processOptionsRef.current = {
    sourceColor, targetColor, hueRange, lightnessRange, matchTone, previewMask,
  };

  const processImage = useCallback((data) => {
    if (!data || !sourceColor) return;
    outputDisplaySizeRef.current = { width: data.width, height: data.height };

    requestAnimationFrame(() => {
      try {
        const opts = processOptionsRef.current;
        if (!opts.sourceColor) return;
        const { imageData: workerData } = cloneImageDataForWorker(data);
        postJob({
          imageData: workerData,
          options: opts,
        }, [workerData.data.buffer]);
      } catch (err) {
        setIsProcessing(false);
        setError(err?.message || t.errorWorker);
      }
    });
  }, [sourceColor, postJob, t.errorWorker]);

  const runProcess = useCallback(() => {
    if (inputData && sourcePicked) processImage(inputData);
  }, [inputData, sourcePicked, processImage]);

  useDebouncedEffect(runProcess, [
    inputData,
    sourcePicked,
    sourceColorInput,
    targetColorInput,
    hueRange.start,
    hueRange.end,
    lightnessRange.start,
    lightnessRange.end,
    matchTone,
    previewMask,
  ], 300);

  const handleFile = useCallback(async (file) => {
    if (!file || !isAcceptedImage(file)) {
      setError(t.errorLoad);
      return;
    }
    setError(null);
    try {
      const img = await loadImageFromFile(file);
      setInputData(imageToImageData(img));
      setOutputData(null);
      setSourcePicked(false);
      setSourceColorInput('');
      setFileName(file.name.replace(/\.(jpe?g|png)$/i, ''));
    } catch {
      setError(t.errorLoad);
    }
  }, [t.errorLoad]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  useEffect(() => {
    const onPaste = (e) => {
      for (const item of e.clipboardData?.items || []) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFile]);

  const getExportImageData = useCallback(() => {
    return getCanvasImageData(outputCanvasRef.current) ?? outputData;
  }, [outputData]);

  const handleSave = async () => {
    const exportData = getExportImageData();
    if (!exportData || previewMask) return;
    const blob = await imageDataToBlob(exportData, 'image/png');
    downloadBlob(blob, `${fileName || 'image'}-recolored.png`);
    showToast(t.saved);
  };

  const handleCopy = async () => {
    const exportData = getExportImageData();
    if (!exportData || previewMask) return;
    try {
      await copyImageToClipboard(exportData);
      showToast(t.copied);
    } catch {
      setError(t.errorCopy);
    }
  };

  const handleContinueEdit = () => {
    const exportData = getExportImageData();
    if (!exportData || previewMask || isProcessing) return;
    const copy = new ImageData(
      new Uint8ClampedArray(exportData.data),
      exportData.width,
      exportData.height
    );
    setInputData(copy);
    setOutputData(null);
    setSourcePicked(false);
    setSourceColorInput('');
    setPreviewMask(false);
    setHoverPreview(null);
    showToast(t.continuedEdit);
  };

  const handleClear = () => {
    setInputData(null);
    setOutputData(null);
    setFileName('');
    setError(null);
    setSourcePicked(false);
    setSourceColorInput('');
    setHoverPreview(null);
  };

  const handleInputCanvasClick = useCallback((e) => {
    if (!inputData || !inputCanvasRef.current) return;
    const { x, y } = canvasCoordsFromEvent(inputCanvasRef.current, e.clientX, e.clientY);
    const rgb = getPixelColorFromImageDataOrCanvas(inputData, inputCanvasRef.current, x, y);
    if (!rgb) return;
    const hex = rgbToHex(rgb);
    setSourceColorInput(hex);
    setSourcePicked(true);
    showToast(t.colorPicked(hex));
  }, [inputData, showToast, t]);

  const handleInputCanvasMove = useCallback((e) => {
    if (!inputData || !inputCanvasRef.current) {
      setHoverPreview(null);
      return;
    }
    const { x, y } = canvasCoordsFromEvent(inputCanvasRef.current, e.clientX, e.clientY);
    const rgb = getPixelColorFromImageDataOrCanvas(inputData, inputCanvasRef.current, x, y);
    if (!rgb) {
      setHoverPreview(null);
      return;
    }
    setHoverPreview({ hex: rgbToHex(rgb), x: e.clientX, y: e.clientY });
  }, [inputData]);

  const zoomImageData = useMemo(() => {
    if (!zoomPreviewOpen) return outputData;
    return getCanvasImageData(outputCanvasRef.current) ?? outputData;
  }, [zoomPreviewOpen, outputData]);

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#041E49] text-white text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}
      <HoverColorPreview preview={hoverPreview} />
      <ImageZoomPreview
        imageData={zoomImageData}
        open={zoomPreviewOpen}
        onClose={() => setZoomPreviewOpen(false)}
        title={t.zoomPreviewTitle}
        checkerboard={false}
        labels={{
          zoomIn: t.zoomIn,
          zoomOut: t.zoomOut,
          zoomFit: t.zoomFit,
          zoom100: t.zoom100,
          zoomHint: t.zoomHint,
          close: t.close,
        }}
      />

      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D3E3FD] text-[#041E49] text-sm font-semibold mb-6">
          <Shield className="w-4 h-4 text-[#0B57D0]" />
          <span>{t.badge}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          {lang === 'vi' ? (
            <>{t.title} <span className="text-[#0B57D0]">{t.titleHighlight}</span></>
          ) : (
            <><span className="text-[#0B57D0]">{t.titleHighlight}</span> {t.title}</>
          )}
        </h1>
        <p className="text-base text-[#49454F] leading-relaxed mb-8">{t.subtitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mb-10">
          {[
            { icon: Shield, title: t.secureTitle, desc: t.secureDesc },
            { icon: Sparkles, title: t.instantTitle, desc: t.instantDesc },
            { icon: Download, title: t.exportTitle, desc: t.exportDesc },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="m3-card p-4 flex gap-3 items-start">
              <div className="p-2 rounded-full bg-[#D3E3FD] shrink-0">
                <Icon className="w-4 h-4 text-[#0B57D0]" />
              </div>
              <div>
                <h4 className="text-sm font-bold mb-0.5">{title}</h4>
                <p className="text-xs text-[#49454F] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-2xl bg-[#FFDAD6] text-[#410002] text-sm flex items-center gap-3">
          <Info className="w-5 h-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ImagePanel
          title={t.inputTitle}
          checkerboard={false}
          actions={
            <>
              <button className="m3-btn-tonal !bg-white/20 !text-white hover:!bg-white/30" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" />{t.importFile}
              </button>
              {inputData && (
                <button className="m3-btn-tonal !bg-white/10 !text-white/80 hover:!bg-white/20" onClick={handleClear}>
                  <X className="w-4 h-4" />{t.clearImage}
                </button>
              )}
            </>
          }
        >
          {!inputData ? (
            <label
              className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'bg-[#D3E3FD]/60' : 'hover:bg-[#E9EEF6]/40'}`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
            >
              <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={handleFileChange} />
              <div className="p-4 rounded-full bg-[#D3E3FD] mb-4"><FileImage className="w-8 h-8 text-[#0B57D0]" /></div>
              <span className="m3-btn-filled mb-3">{t.clickToLoad}</span>
              <p className="text-xs text-[#49454F] flex items-center gap-1.5"><ClipboardPaste className="w-3.5 h-3.5" />{t.dropHint}</p>
            </label>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto">
              <canvas
                ref={inputCanvasRef}
                onClick={handleInputCanvasClick}
                onMouseMove={handleInputCanvasMove}
                onMouseLeave={() => setHoverPreview(null)}
                className="max-w-full max-h-full object-contain shadow-sm rounded-lg cursor-crosshair"
              />
            </div>
          )}
        </ImagePanel>

        <ImagePanel
          title={t.outputTitle}
          checkerboard={false}
          actions={
            <>
              <button
                className="m3-btn-tonal !bg-white/20 !text-white hover:!bg-white/30"
                onClick={handleContinueEdit}
                disabled={!outputData || previewMask || isProcessing}
                title={t.continueEditHint}
              >
                <ArrowLeft className="w-4 h-4" />{t.continueEdit}
              </button>
              <button className="m3-btn-tonal !bg-white/20 !text-white hover:!bg-white/30" onClick={handleSave} disabled={!outputData || previewMask || isProcessing}>
                <Download className="w-4 h-4" />{t.saveAs}
              </button>
              <button className="m3-btn-tonal !bg-white/20 !text-white hover:!bg-white/30" onClick={handleCopy} disabled={!outputData || previewMask || isProcessing}>
                <Copy className="w-4 h-4" />{t.copyClipboard}
              </button>
            </>
          }
        >
          {!outputData && !isProcessing ? (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="text-sm text-[#49454F] font-medium">
                {sourcePicked ? t.startHint : t.pickColorFirst}
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto">
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 shadow-md text-sm font-semibold text-[#0B57D0]">
                    <Loader2 className="w-4 h-4 animate-spin" />{t.processing}
                  </div>
                </div>
              )}
              <canvas
                ref={outputCanvasRef}
                onClick={() => outputData && !isProcessing && setZoomPreviewOpen(true)}
                title={outputData && !isProcessing ? t.clickToZoom : undefined}
                className={`max-w-full max-h-full object-contain rounded-lg ${outputData && !isProcessing ? 'cursor-zoom-in' : ''}`}
              />
            </div>
          )}
        </ImagePanel>
      </div>

      <div className="m3-card-high p-6 sm:p-8">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-[#0B57D0]" />{t.toolOptions}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#0B57D0] uppercase tracking-wide">{lang === 'vi' ? 'Màu nguồn & đích' : 'Source & Target'}</h3>
            <div>
              <p className="text-xs font-semibold text-[#49454F] mb-1.5">{t.sourceColor}</p>
              <div className="flex gap-2 items-center">
                <input type="color" value={sourceHex} onChange={(e) => { setSourceColorInput(e.target.value); setSourcePicked(true); }} className="w-10 h-10 rounded-lg shrink-0" disabled={!inputData} />
                <input type="text" className="m3-input flex-1" value={sourceColorInput} onChange={(e) => { setSourceColorInput(e.target.value); setSourcePicked(true); }} placeholder="#000000" disabled={!inputData} />
              </div>
              <p className="m3-input-label">{t.sourceColorHint}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#49454F] mb-1.5">{t.targetColor}</p>
              <div className="flex gap-2 items-center">
                <input type="color" value={targetHex} onChange={(e) => setTargetColorInput(e.target.value)} className="w-10 h-10 rounded-lg shrink-0" disabled={!inputData} />
                <input type="text" className="m3-input flex-1" value={targetColorInput} onChange={(e) => setTargetColorInput(e.target.value)} disabled={!inputData} />
              </div>
              <p className="m3-input-label">{t.targetColorHint}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#0B57D0] uppercase tracking-wide">{lang === 'vi' ? 'Dải màu' : 'Color Range'}</h3>
            <SimilarityPreviewSlider
              sourceColor={sourceColor || [128, 128, 128]}
              hueRange={hueRange}
              lightnessRange={lightnessRange}
              onHueRangeChange={setHueRange}
              onLightnessRangeChange={setLightnessRange}
              lightnessTolerance={lightnessTolerance}
              onLightnessToleranceChange={setLightnessTolerance}
              disabled={!inputData || !sourcePicked}
              labels={{
                lightness: t.lightnessBar,
                rainbow: t.rainbowBar,
                saturationNeutral: t.saturationNeutralBar,
                neutralHueHint: t.neutralHueHint,
                bandHint: t.bandHint,
                masterTolerance: t.masterTolerance,
                masterHint: t.masterHint,
                handleMin: t.handleMin,
                handleMax: t.handleMax,
                handleMove: t.handleMove,
              }}
            />
            <p className="m3-input-label">{t.rangeHint}</p>
            <div className="flex items-start gap-3 pt-2">
              <Toggle active={matchTone} onChange={setMatchTone} disabled={!inputData} />
              <div>
                <p className="text-sm font-semibold">{t.matchTone}</p>
                <p className="text-xs text-[#49454F] mt-0.5">{t.matchToneHint}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#0B57D0] uppercase tracking-wide">{lang === 'vi' ? 'Xem trước' : 'Preview'}</h3>
            <div className="flex items-start gap-3">
              <Toggle active={previewMask} onChange={setPreviewMask} disabled={!inputData} />
              <div>
                <p className="text-sm font-semibold">{t.previewMask}</p>
                <p className="text-xs text-[#49454F] mt-0.5">{t.previewMaskHint}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
