export default function HoverColorPreview({ preview }) {
  if (!preview?.hex) return null;

  const hex = String(preview.hex);

  return (
    <div
      className="fixed z-50 pointer-events-none flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-[#CAC4D0] shadow-lg text-xs font-semibold text-[#1D1B20]"
      style={{ left: preview.x + 16, top: preview.y + 16 }}
    >
      <span
        className="w-5 h-5 rounded-md border border-[#CAC4D0] shrink-0"
        style={{ backgroundColor: hex }}
      />
      {hex.toUpperCase()}
    </div>
  );
}
