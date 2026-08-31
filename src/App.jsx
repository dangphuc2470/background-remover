import { useState } from 'react';
import ToolSwitcher from './components/ToolSwitcher';
import BackgroundRemover from './tools/BackgroundRemover';
import BackgroundRemoverOld from './tools/BackgroundRemoverOld';
import ColorReplacer from './tools/ColorReplacer';

const TOOL_COMPONENTS = {
  'bg-remover': BackgroundRemover,
  'bg-remover-old': BackgroundRemoverOld,
  'color-replacer': ColorReplacer,
};

export default function App() {
  const [lang, setLang] = useState('vi');
  const [activeTool, setActiveTool] = useState('bg-remover');

  const ToolComponent = TOOL_COMPONENTS[activeTool];

  return (
    <div className="relative min-h-screen grid-bg text-[#1D1B20] flex flex-col">
      <ToolSwitcher activeTool={activeTool} onChange={setActiveTool} lang={lang} />

      <div className="absolute top-4 right-4 flex items-center gap-4 z-20">
        <div className="flex items-center gap-1 bg-[#E9EEF6] p-1 rounded-full border border-[#CAC4D0] shadow-sm">
          {['vi', 'en'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                lang === l ? 'bg-[#0B57D0] text-white shadow' : 'text-[#49454F] hover:text-[#1D1B20]'
              }`}
            >
              {l === 'vi' ? 'Tiếng Việt' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-8 pb-12 sm:px-6 lg:px-8 w-full">
        <ToolComponent lang={lang} key={activeTool} />
      </div>
    </div>
  );
}
