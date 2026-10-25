import React from 'react';
import { BookOpen } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="w-full bg-[#fcfbf9] border-b border-[#e8e2d8] px-3.5 py-3 sticky top-0 z-30 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-left group transition-opacity hover:opacity-85 focus:outline-hidden min-w-0"
          title="На главную"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3d2f24] text-[#f7f3ec] flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-4 h-4 text-[#f0dfcc]" />
          </div>
          <div className="truncate">
            <h1 className="text-sm sm:text-base font-bold font-serif text-[#2c2219] leading-tight flex items-center gap-1.5 truncate">
              Книжная мастерская
            </h1>
            <p className="text-[10px] sm:text-[11px] font-sans text-[#786b5d] tracking-wide truncate">
              Конвертер PDF → EPUB 3
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
