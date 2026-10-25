import React from 'react';
import { BookSettings, BookLanguage, OcrMode, CleanLevel } from '../types/converter';
import { ArrowLeft, Play, Settings2, AlertTriangle, Book, User, Globe, Eye, Sparkles } from 'lucide-react';

interface SettingsPanelProps {
  settings: BookSettings;
  onSettingsChange: (newSettings: BookSettings) => void;
  fileName: string;
  fileSizeBytes: number;
  onStartConversion: () => void;
  onBack: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  fileName,
  fileSizeBytes,
  onStartConversion,
  onBack,
}) => {
  const update = <K extends keyof BookSettings>(key: K, value: BookSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const formattedSize =
    fileSizeBytes > 1024 * 1024
      ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} МБ`
      : `${Math.round(fileSizeBytes / 1024)} КБ`;

  return (
    <div className="w-full max-w-md mx-auto space-y-4 px-3 py-4">
      {/* File summary bar */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-[#e4ded3] shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-[#7d6f5f] hover:text-[#271f18] transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Другой файл</span>
        </button>
        <div className="text-right">
          <div className="text-xs font-bold text-[#2d241c] truncate max-w-[190px]">
            {fileName}
          </div>
          <div className="text-[10px] text-[#85786a]">{formattedSize}</div>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4ded3] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#f0eae0]">
          <Settings2 className="w-4 h-4 text-[#8a5323]" />
          <h2 className="text-sm font-serif font-bold text-[#261f18]">
            Параметры книги и конвертации
          </h2>
        </div>

        {/* Title & Author Inputs */}
        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54483c] mb-1">
              <Book className="w-3.5 h-3.5 text-[#8a5323]" />
              <span>Название книги</span>
            </label>
            <input
              type="text"
              value={settings.title}
              onChange={e => update('title', e.target.value)}
              placeholder="Название книги"
              className="w-full px-3 py-2.5 bg-[#fcfbf9] border border-[#d8cfc0] rounded-xl text-sm text-[#27211a] focus:outline-hidden focus:border-[#966333] transition-colors"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54483c] mb-1">
              <User className="w-3.5 h-3.5 text-[#8a5323]" />
              <span>Автор</span>
            </label>
            <input
              type="text"
              value={settings.author}
              onChange={e => update('author', e.target.value)}
              placeholder="Имя автора"
              className="w-full px-3 py-2.5 bg-[#fcfbf9] border border-[#d8cfc0] rounded-xl text-sm text-[#27211a] focus:outline-hidden focus:border-[#966333] transition-colors"
            />
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54483c] mb-1.5">
            <Globe className="w-3.5 h-3.5 text-[#8a5323]" />
            <span>Язык документа</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'auto', label: 'Авто (определить)' },
              { id: 'rus', label: 'Русский (rus)' },
              { id: 'ukr', label: 'Українська (ukr)' },
              { id: 'rus+ukr', label: 'Смешанный (ru+uk)' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => update('language', item.id as BookLanguage)}
                className={`py-2 px-2.5 text-xs font-medium rounded-xl border text-center transition-all ${
                  settings.language === item.id
                    ? 'bg-[#413123] text-[#f7f2ea] border-[#413123] shadow-xs'
                    : 'bg-[#faf7f2] hover:bg-[#f3ece0] text-[#4d4134] border-[#dcd2c3]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* OCR Mode */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54483c] mb-1.5">
            <Eye className="w-3.5 h-3.5 text-[#8a5323]" />
            <span>Оптическое распознавание (OCR)</span>
          </label>
          <div className="space-y-1.5">
            {[
              {
                id: 'auto',
                title: 'Автоматически (рекомендуется)',
                desc: 'OCR запускается только для сканов и страниц без текстового слоя',
              },
              {
                id: 'disabled',
                title: 'Отключено (быстро)',
                desc: 'Только извлечение существующего текстового слоя PDF',
              },
              {
                id: 'force',
                title: 'Принудительно для всех страниц',
                desc: 'Распознать каждую страницу с помощью Tesseract.js OCR',
              },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => update('ocrMode', opt.id as OcrMode)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                  settings.ocrMode === opt.id
                    ? 'border-[#966333] bg-[#f9f3ea]'
                    : 'border-[#e4ded3] bg-[#fcfbf9] hover:bg-[#f6f0e4]'
                }`}
              >
                <div className="font-bold text-[#2d231b]">{opt.title}</div>
                <div className="text-[11px] text-[#716457] mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cleanup Level */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#54483c] mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8a5323]" />
            <span>Уровень очистки текста и переносов</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update('cleanLevel', 'conservative' as CleanLevel)}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                settings.cleanLevel === 'conservative'
                  ? 'border-[#966333] bg-[#f9f3ea]'
                  : 'border-[#e4ded3] bg-[#fcfbf9] hover:bg-[#f6f0e4]'
              }`}
            >
              <div className="font-bold text-[#2d231b]">Консервативный</div>
              <div className="text-[10px] text-[#716457] mt-0.5">
                Безопасное восстановление переносов и абзацев
              </div>
            </button>

            <button
              type="button"
              onClick={() => update('cleanLevel', 'extended' as CleanLevel)}
              className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                settings.cleanLevel === 'extended'
                  ? 'border-[#966333] bg-[#f9f3ea]'
                  : 'border-[#e4ded3] bg-[#fcfbf9] hover:bg-[#f6f0e4]'
              }`}
            >
              <div className="font-bold text-[#2d231b]">Расширенный</div>
              <div className="text-[10px] text-[#716457] mt-0.5">
                Удаление артефактов и спецсимволов OCR
              </div>
            </button>
          </div>

          {settings.cleanLevel === 'extended' && (
            <div className="flex items-center gap-2 p-2 mt-2 bg-[#fffbeb] border border-[#fef3c7] rounded-lg text-[11px] text-[#92400e]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Расширенная очистка может отфильтровать редкие авторские знаки препинания.</span>
            </div>
          )}
        </div>

        {/* Cover Extraction Option */}
        <div className="pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#3b3127] select-none">
            <input
              type="checkbox"
              checked={settings.extractCover}
              onChange={e => update('extractCover', e.target.checked)}
              className="w-4 h-4 text-[#8a5323] rounded-md border-[#cfc4b2] focus:ring-[#8a5323]"
            />
            <span>Создать обложку книги из первой страницы PDF</span>
          </label>
        </div>
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={onStartConversion}
        className="w-full py-3.5 px-4 bg-[#3d2f24] hover:bg-[#2e231a] active:scale-[0.99] text-[#f7f2ea] text-sm font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[50px]"
      >
        <Play className="w-4 h-4 fill-current text-[#e7be94]" />
        <span>Начать конвертацию в EPUB 3</span>
      </button>
    </div>
  );
};
