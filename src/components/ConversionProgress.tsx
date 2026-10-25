import React from 'react';
import { ConversionProgressState } from '../types/converter';
import { XCircle, Loader2, AlertCircle, ScanText } from 'lucide-react';

interface ConversionProgressProps {
  progress: ConversionProgressState;
  onCancel: () => void;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({ progress, onCancel }) => {
  return (
    <div className="w-full max-w-md mx-auto space-y-4 px-3 py-4">
      {/* Main Progress Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#e4ded3] shadow-md space-y-5">
        {/* Top Header & Large Percentage */}
        <div className="text-center space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8a5323]">
            Формирование книги EPUB 3
          </div>
          <div className="text-5xl font-serif font-black text-[#292018] tracking-tight">
            {progress.percent}%
          </div>
          <div className="text-xs text-[#716457]">
            Этап {progress.stageNumber} из {progress.totalStages} — {progress.stageTitle}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-[#f0eae0] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#dfd6c8]">
          <div
            className="h-full bg-gradient-to-r from-[#966333] to-[#433224] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(4, Math.min(100, progress.percent))}%` }}
          />
        </div>

        {/* Detailed Status Breakdown */}
        <div className="bg-[#faf7f2] rounded-xl p-3.5 border border-[#e8dfcf] space-y-2 text-xs">
          {progress.totalPages > 0 && (
            <div className="flex items-center justify-between text-[#44382d]">
              <span className="text-[#786b5e]">Обработано страниц:</span>
              <span className="font-bold">
                {progress.processedPages} из {progress.totalPages}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2 pt-1 border-t border-[#ede5d8]">
            <Loader2 className="w-3.5 h-3.5 text-[#966333] animate-spin shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[#786b5e] block text-[11px]">Текущая операция:</span>
              <span className="font-medium text-[#2d241c] break-words">
                {progress.currentOperation || 'Выполнение этапа...'}
              </span>
            </div>
          </div>

          {progress.ocrStatus && (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#8a5323] bg-[#f5ede2] px-2.5 py-1.5 rounded-lg border border-[#ebdccb]">
              <ScanText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{progress.ocrStatus}</span>
            </div>
          )}
        </div>

        {/* Stage List Indicator */}
        <div className="space-y-1.5 pt-1">
          {[
            { num: 1, name: 'Загрузка и подготовка' },
            { num: 2, name: 'Анализ страниц' },
            { num: 3, name: 'Извлечение текста и OCR' },
            { num: 4, name: 'Очистка текста и перенос' },
            { num: 5, name: 'Структура и главы' },
            { num: 6, name: 'Формирование EPUB 3' },
            { num: 7, name: 'Проверка результата' },
          ].map(stage => {
            const isDone = progress.stageNumber > stage.num;
            const isCurrent = progress.stageNumber === stage.num;
            return (
              <div
                key={stage.num}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  isCurrent
                    ? 'bg-[#f4ebe0] text-[#34271c] font-bold border border-[#dfd2c0]'
                    : isDone
                    ? 'text-[#584e43]'
                    : 'text-[#9c9183]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDone
                      ? 'bg-[#3b7a47] text-white'
                      : isCurrent
                      ? 'bg-[#966333] text-white'
                      : 'bg-[#e7dfd3] text-[#8a7f72]'
                  }`}
                >
                  {isDone ? '✓' : stage.num}
                </div>
                <span>{stage.name}</span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] bg-[#966333]/15 text-[#854b1f] px-1.5 py-0.5 rounded-sm">
                    В процессе
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Warnings if any during progress */}
        {progress.warnings.length > 0 && (
          <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-3 space-y-1 text-xs text-[#92400e]">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Замечания в ходе обработки ({progress.warnings.length}):</span>
            </div>
            <div className="max-h-24 overflow-y-auto text-[11px] space-y-1 pr-1">
              {progress.warnings.slice(-3).map((w, idx) => (
                <div key={idx} className="leading-tight">
                  • {w}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Button */}
        {progress.canCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-4 bg-white hover:bg-[#fff5f5] text-[#b91c1c] border border-[#fecaca] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
          >
            <XCircle className="w-4 h-4" />
            <span>Прервать конвертацию</span>
          </button>
        )}
      </div>
    </div>
  );
};
