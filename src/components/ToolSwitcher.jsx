import { useState, useRef, useEffect } from 'react';
import { LayoutGrid, Eraser, Palette, ChevronDown, History } from 'lucide-react';

const TOOLS = {
  'bg-remover': {
    icon: Eraser,
    vi: 'Xóa nền ảnh',
    en: 'Background Remover',
  },
  'bg-remover-old': {
    icon: History,
    vi: 'Xóa nền (cũ)',
    en: 'BG Remover (Classic)',
  },
  'color-replacer': {
    icon: Palette,
    vi: 'Đổi màu ảnh',
    en: 'Color Replacer',
  },
};

export default function ToolSwitcher({ activeTool, onChange, lang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = TOOLS[activeTool];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="absolute top-4 left-4 z-20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E9EEF6] border border-[#CAC4D0] shadow-sm hover:bg-[#D3E3FD] transition-all cursor-pointer text-sm font-bold text-[#1D1B20]"
      >
        <LayoutGrid className="w-4 h-4 text-[#0B57D0]" />
        <CurrentIcon className="w-4 h-4 text-[#0B57D0]" />
        <span>{current[lang]}</span>
        <ChevronDown className={`w-4 h-4 text-[#49454F] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[220px] p-2 rounded-2xl bg-white border border-[#CAC4D0] shadow-lg">
          {Object.entries(TOOLS).map(([id, tool]) => {
            const Icon = tool.icon;
            const isActive = id === activeTool;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#D3E3FD] text-[#041E49]'
                    : 'text-[#49454F] hover:bg-[#F0F4F9] hover:text-[#1D1B20]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tool[lang]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
