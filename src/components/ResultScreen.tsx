import React, { useState } from 'react';
import { ConversionResult } from '../types/converter';
import { Download, CheckCircle, BookOpen, Clock, HardDrive, RotateCcw, ShieldCheck } from 'lucide-react';
import { QualityReportView } from './QualityReportView';
import { BookReaderModal } from './BookReaderModal';

interface ResultScreenProps {
  result: ConversionResult;
  onReset: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ result, onReset }) => {
  const [showReader, setShowReader] = useState(false);

  const handleDownload = () => {
    const url = URL.createObjectURL(result.epubBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.epubFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 px-3 py-4">
      {/* Success Card */}
      <div className="bg-white rounded-2xl p-5 border border-[#e4ded3] shadow-md text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#edf7ed] text-[#2e7d32] flex items-center justify-center mx-auto border border-[#c8e6c9]">
          <CheckCircle className="w-6 h-6" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2e7d32] bg-[#edf7ed] px-2.5 py-0.5 rounded-full border border-[#c8e6c9]">
            EPUB 3 успешно создан
          </span>
          <h2 className="text-lg font-serif font-bold text-[#271f18] mt-2">
            {result.settings.title || 'Книга готова'}
          </h2>
          <p className="text-xs text-[#716557]">
            {result.settings.author || 'Неизвестный автор'}
          </p>
        </div>

        {/* Cover Preview if present */}
        {result.coverDataUrl && (
          <div className="pt-1">
            <img
              src={result.coverDataUrl}
              alt="Обложка"
              className="max-h-48 mx-auto rounded-lg shadow-sm border border-[#e4ded3] object-contain"
            />
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f0eae0] text-xs">
          <div className="p-2 bg-[#faf7f2] rounded-xl border border-[#ece4d8]">
            <HardDrive className="w-3.5 h-3.5 mx-auto text-[#8a5323] mb-1" />
            <div className="font-bold text-[#2d241c]">{result.fileSizeFormatted}</div>
            <div className="text-[10px] text-[#8e8275]">Размер файла</div>
          </div>

          <div className="p-2 bg-[#faf7f2] rounded-xl border border-[#ece4d8]">
            <BookOpen className="w-3.5 h-3.5 mx-auto text-[#8a5323] mb-1" />
            <div className="font-bold text-[#2d241c]">{result.chapters.length}</div>
            <div className="text-[10px] text-[#8e8275]">Глав в книге</div>
          </div>

          <div className="p-2 bg-[#faf7f2] rounded-xl border border-[#ece4d8]">
            <Clock className="w-3.5 h-3.5 mx-auto text-[#8a5323] mb-1" />
            <div className="font-bold text-[#2d241c]">{result.executionTimeSec} сек</div>
            <div className="text-[10px] text-[#8e8275]">Время работы</div>
          </div>
        </div>

        {/* Primary Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          className="w-full py-3.5 px-4 bg-[#2e7d32] hover:bg-[#256829] active:scale-[0.99] text-white text-sm font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 min-h-[50px]"
        >
          <Download className="w-5 h-5 text-white" />
          <span>Скачать EPUB 3 ({result.fileSizeFormatted})</span>
        </button>

        {/* Secondary In-App Reader Button */}
        <button
          type="button"
          onClick={() => setShowReader(true)}
          className="w-full py-2.5 px-4 bg-[#faf7f2] hover:bg-[#f3ece0] text-[#3d2f24] border border-[#dcd2c3] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <BookOpen className="w-4 h-4 text-[#8a5323]" />
          <span>Предпросмотр и чтение в приложении</span>
        </button>
      </div>

      {/* Automated Structural Validation Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4ded3] shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#f0eae0]">
          <ShieldCheck className="w-4 h-4 text-[#2e7d32]" />
          <h3 className="text-xs font-serif font-bold text-[#261f18]">
            Автоматическая валидация стандарта EPUB 3
          </h3>
        </div>

        <div className="space-y-1.5 text-xs">
          {result.validation.checks.map(check => (
            <div
              key={check.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-[#faf7f2] border border-[#f0eae0]"
            >
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 mt-0.5 ${
                  check.passed ? 'bg-[#2e7d32] text-white' : 'bg-[#c62828] text-white'
                }`}
              >
                {check.passed ? '✓' : '✕'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-[#2f2720]">{check.name}</div>
                <div className="text-[11px] text-[#716557]">{check.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Assessment Report */}
      <QualityReportView report={result.qualityReport} />

      {/* Convert Another File Button */}
      <button
        type="button"
        onClick={onReset}
        className="w-full py-3 px-4 bg-white hover:bg-[#f8f5ee] text-[#5c4f42] border border-[#dcd2c3] text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[46px]"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Конвертировать еще одну книгу</span>
      </button>

      {/* Modal Reader */}
      {showReader && (
        <BookReaderModal
          chapters={result.chapters}
          settings={result.settings}
          coverDataUrl={result.coverDataUrl}
          onClose={() => setShowReader(false)}
        />
      )}
    </div>
  );
};
