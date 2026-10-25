import React, { useState } from 'react';
import { QualityReportData } from '../types/converter';
import { CheckCircle2, AlertTriangle, AlertOctagon, ChevronDown, ChevronUp, FileText, Sparkles, Layers } from 'lucide-react';

interface QualityReportViewProps {
  report: QualityReportData;
}

export const QualityReportView: React.FC<QualityReportViewProps> = ({ report }) => {
  const [showIssues, setShowIssues] = useState(false);

  const getBadgeStyle = () => {
    switch (report.category) {
      case 'good':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-[#2e7d32]" />,
          bg: 'bg-[#edf7ed] border-[#c8e6c9] text-[#1b5e20]',
          title: 'Хорошее качество',
          desc: 'Автоматическая обработка завершена без существенных обнаруженных проблем.',
        };
      case 'doubts':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-[#b45309]" />,
          bg: 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]',
          title: 'Есть сомнения',
          desc: 'Обнаружены нетипичные фрагменты или разрывы, которые желательно бегло проверить.',
        };
      case 'attention':
      default:
        return {
          icon: <AlertOctagon className="w-5 h-5 text-[#c62828]" />,
          bg: 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]',
          title: 'Требуется вмешательство',
          desc: 'Часть страниц не содержит текста или качество распознавания требует ручной проверки.',
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4ded3] shadow-xs space-y-4">
      {/* Category Banner */}
      <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${badge.bg}`}>
        <div className="shrink-0 mt-0.5">{badge.icon}</div>
        <div>
          <div className="text-sm font-bold">{badge.title}</div>
          <div className="text-xs opacity-90 mt-0.5 leading-snug">{badge.desc}</div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#faf7f2] p-2.5 rounded-xl border border-[#ece4d8]">
          <div className="text-[11px] text-[#7d7164]">Всего страниц</div>
          <div className="text-base font-bold text-[#2d241c] mt-0.5">
            {report.summary.totalPages}
          </div>
          <div className="text-[10px] text-[#8e8275]">
            {report.summary.textLayerPages} текст / {report.summary.ocrPages} OCR
          </div>
        </div>

        <div className="bg-[#faf7f2] p-2.5 rounded-xl border border-[#ece4d8]">
          <div className="text-[11px] text-[#7d7164]">Восстановлено переносов</div>
          <div className="text-base font-bold text-[#8a5323] mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{report.summary.hyphensRepaired}</span>
          </div>
          <div className="text-[10px] text-[#8e8275]">
            Слов воссоединено
          </div>
        </div>

        <div className="bg-[#faf7f2] p-2.5 rounded-xl border border-[#ece4d8]">
          <div className="text-[11px] text-[#7d7164]">Колонтитулы и номера</div>
          <div className="text-base font-bold text-[#2d241c] mt-0.5">
            {report.summary.headersRemoved}
          </div>
          <div className="text-[10px] text-[#8e8275]">
            Очищено со страниц
          </div>
        </div>

        <div className="bg-[#faf7f2] p-2.5 rounded-xl border border-[#ece4d8]">
          <div className="text-[11px] text-[#7d7164]">Структура книги</div>
          <div className="text-base font-bold text-[#2d241c] mt-0.5 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#58483a]" />
            <span>{report.summary.detectedChapters} глав</span>
          </div>
          <div className="text-[10px] text-[#8e8275]">
            ~{report.summary.wordCount} слов
          </div>
        </div>
      </div>

      {/* Issues Dropdown (Selective review of doubtful fragments) */}
      {report.issues.length > 0 && (
        <div className="border border-[#e8dfcf] rounded-xl overflow-hidden bg-[#fdfbf9]">
          <button
            type="button"
            onClick={() => setShowIssues(!showIssues)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-[#44382c] hover:bg-[#f6efe4] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#8a5323]" />
              <span>Сомнительные фрагменты ({report.issues.length})</span>
            </div>
            {showIssues ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showIssues && (
            <div className="p-3 border-t border-[#e8dfcf] space-y-2 max-h-60 overflow-y-auto">
              {report.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg text-xs border ${
                    issue.severity === 'error'
                      ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                      : 'bg-[#fffbeb] border-[#fef3c7] text-[#92400e]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Страница {issue.pageNumber}</span>
                    <span className="text-[10px] uppercase tracking-wider">
                      {issue.severity === 'error' ? 'Ошибка' : 'Замечание'}
                    </span>
                  </div>
                  <div className="mt-0.5">{issue.message}</div>
                  {issue.snippet && (
                    <div className="mt-1.5 p-1.5 bg-white/70 rounded-md font-mono text-[10px] text-[#332a22] break-words">
                      «{issue.snippet}»
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
