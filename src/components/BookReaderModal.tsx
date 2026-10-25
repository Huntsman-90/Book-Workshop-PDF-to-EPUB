import React, { useState } from 'react';
import { BookChapter, BookSettings } from '../types/converter';
import { X, ZoomIn, ZoomOut, Moon, Sun, BookOpen } from 'lucide-react';

interface BookReaderModalProps {
  chapters: BookChapter[];
  settings: BookSettings;
  coverDataUrl?: string;
  onClose: () => void;
}

type ReaderTheme = 'paper' | 'sepia' | 'dark';

export const BookReaderModal: React.FC<BookReaderModalProps> = ({
  chapters,
  settings,
  coverDataUrl,
  onClose,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [fontSize, setFontSize] = useState<number>(17);
  const [theme, setTheme] = useState<ReaderTheme>('paper');

  const chapter = chapters[currentChapterIndex] || chapters[0];

  const getThemeStyles = () => {
    switch (theme) {
      case 'sepia':
        return {
          bg: 'bg-[#f4ebd9]',
          text: 'text-[#2b2216]',
          headerBg: 'bg-[#ebdfca] border-[#d8c8af]',
          controlBtn: 'bg-[#dfceb3] text-[#3d2f1f] hover:bg-[#d4c1a3]',
        };
      case 'dark':
        return {
          bg: 'bg-[#1b1a18]',
          text: 'text-[#ded7cd]',
          headerBg: 'bg-[#262421] border-[#383530]',
          controlBtn: 'bg-[#33302a] text-[#f2ece4] hover:bg-[#423f38]',
        };
      case 'paper':
      default:
        return {
          bg: 'bg-[#fdfcf9]',
          text: 'text-[#26201a]',
          headerBg: 'bg-[#f2ece0] border-[#ded5c5]',
          controlBtn: 'bg-[#e7dece] text-[#33281e] hover:bg-[#dcd1be]',
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-xs">
      {/* Top Reader Controls Bar */}
      <div className={`w-full px-3 py-2.5 border-b flex items-center justify-between shadow-xs select-none ${themeStyles.headerBg}`}>
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <BookOpen className="w-4 h-4 shrink-0 text-[#8a5323]" />
          <span className="text-xs font-serif font-bold truncate max-w-[150px] sm:max-w-xs text-[#2b2118]">
            {settings.title || 'Книга'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Font Controls */}
          <button
            onClick={() => setFontSize(s => Math.max(13, s - 2))}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${themeStyles.controlBtn}`}
            title="Уменьшить шрифт"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1">{fontSize}</span>
          <button
            onClick={() => setFontSize(s => Math.min(26, s + 2))}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${themeStyles.controlBtn}`}
            title="Увеличить шрифт"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Theme Controls */}
          <div className="flex items-center gap-1 ml-1 border-l border-black/10 pl-1.5">
            <button
              onClick={() => setTheme('paper')}
              className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] ${
                theme === 'paper' ? 'border-[#8a5323] ring-1 ring-[#8a5323]' : 'border-gray-300'
              } bg-[#fdfcf9] text-black`}
              title="Светлая бумага"
            >
              <Sun className="w-3 h-3" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] ${
                theme === 'sepia' ? 'border-[#8a5323] ring-1 ring-[#8a5323]' : 'border-gray-300'
              } bg-[#f4ebd9] text-[#553b1b]`}
              title="Сепия"
            >
              S
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] ${
                theme === 'dark' ? 'border-[#8a5323] ring-1 ring-[#8a5323]' : 'border-gray-600'
              } bg-[#1b1a18] text-white`}
              title="Тёмная тема"
            >
              <Moon className="w-3 h-3" />
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 ml-2 rounded-lg bg-black/10 hover:bg-black/20 text-[#33281e] transition-colors"
            title="Закрыть читалку"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chapter Selection Bar */}
      {chapters.length > 1 && (
        <div className={`px-3 py-1.5 border-b text-xs flex items-center gap-2 overflow-x-auto ${themeStyles.headerBg}`}>
          <span className="text-[11px] text-[#716457] shrink-0 font-medium">Глава:</span>
          <select
            value={currentChapterIndex}
            onChange={e => setCurrentChapterIndex(Number(e.target.value))}
            className="py-1 px-2 text-xs rounded-md border border-[#cfc3b0] bg-white text-[#2a221a] focus:outline-hidden"
          >
            {chapters.map((ch, idx) => (
              <option key={ch.id} value={idx}>
                {idx + 1}. {ch.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Reader Content Body */}
      <div className={`flex-1 overflow-y-auto px-4 py-8 select-text ${themeStyles.bg} ${themeStyles.text}`}>
        <div className="max-w-xl mx-auto space-y-4 font-serif leading-relaxed">
          {/* Chapter 0 Cover Display if available */}
          {currentChapterIndex === 0 && coverDataUrl && (
            <div className="text-center mb-8">
              <img
                src={coverDataUrl}
                alt="Обложка книги"
                className="max-h-72 mx-auto rounded-lg shadow-md object-contain border border-black/10"
              />
            </div>
          )}

          {/* Chapter Heading */}
          <h2 className="text-center text-xl font-bold tracking-tight mb-6 pb-2 border-b border-black/10">
            {chapter?.title || 'Глава книги'}
          </h2>

          {/* Formatted Paragraphs */}
          {chapter?.plainText.split(/\n\n+/).map((para, pIdx) => {
            const isDialogue = /^[—–-]\s+/.test(para);
            return (
              <p
                key={pIdx}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.6',
                  textAlign: 'justify',
                  hyphens: 'auto',
                  textIndent: isDialogue ? '0' : '1.4em',
                }}
                className={isDialogue ? 'pl-4 -indent-4 my-1' : 'my-0'}
              >
                {para}
              </p>
            );
          })}
        </div>
      </div>

      {/* Bottom Pager Footer */}
      <div className={`px-4 py-2 border-t text-xs flex items-center justify-between ${themeStyles.headerBg}`}>
        <button
          disabled={currentChapterIndex === 0}
          onClick={() => setCurrentChapterIndex(i => Math.max(0, i - 1))}
          className="px-3 py-1.5 rounded-lg border border-[#cfc3b0] disabled:opacity-30 disabled:cursor-not-allowed font-medium"
        >
          ← Предыдущая
        </button>
        <span className="text-[11px] text-[#786b5e]">
          Глава {currentChapterIndex + 1} из {chapters.length}
        </span>
        <button
          disabled={currentChapterIndex >= chapters.length - 1}
          onClick={() => setCurrentChapterIndex(i => Math.min(chapters.length - 1, i + 1))}
          className="px-3 py-1.5 rounded-lg border border-[#cfc3b0] disabled:opacity-30 disabled:cursor-not-allowed font-medium"
        >
          Следующая →
        </button>
      </div>
    </div>
  );
};
