import { ImageIcon } from 'lucide-react';

export default function ImagePanel({ title, children, actions, checkerboard = true, className = '' }) {
  return (
    <div className={`m3-card overflow-hidden flex flex-col ${className}`}>
      <div className="px-5 py-3 border-b border-[var(--md-surface-variant)] bg-[var(--md-surface-container-high)]">
        <h3 className="text-sm font-bold text-[#1D1B20] flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#0B57D0]" />
          {title}
        </h3>
      </div>
      <div className={`flex-1 min-h-[320px] relative ${checkerboard ? 'checkerboard' : 'bg-[#f5f5f5]'}`}>
        {children}
      </div>
      {actions && (
        <div className="px-4 py-3 bg-[#0B57D0] flex flex-wrap gap-2 justify-center sm:justify-start">
          {actions}
        </div>
      )}
    </div>
  );
}
