import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="w-full bg-[#fcfbf9] border-b border-[#e8e2d8] px-4 py-3.5 sticky top-0 z-30 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 text-left group transition-opacity hover:opacity-85 focus:outline-hidden"
          title="На главную"
        >
          <div className="w-9 h-9 rounded-lg bg-[#3d2f24] text-[#f7f3ec] flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5 text-[#f0dfcc]" />
          </div>
          <div>
            <h1 className="text-base font-bold font-serif text-[#2c2219] leading-tight flex items-center gap-1.5">
              Книжная мастерская
            </h1>
            <p className="text-[11px] font-sans text-[#786b5d] tracking-wide">
              Конвертер PDF → EPUB 3
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 text-[11px] font-medium text-[#6c5e50] bg-[#f2ede4] px-2.5 py-1 rounded-full border border-[#e2d8c9]">
          <Sparkles className="w-3 h-3 text-[#b45309]" />
          <span>EPUB 3</span>
        </div>
      </div>
    </header>
  );
};
