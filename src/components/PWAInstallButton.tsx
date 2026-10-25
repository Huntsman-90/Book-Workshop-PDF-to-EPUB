import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running in standalone PWA mode, hide the button completely
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs min-h-[36px] ${
          isInstallable
            ? 'bg-[#8a5323] hover:bg-[#70421a] text-[#fdfcf9] active:scale-95'
            : 'bg-[#f0e7d8] hover:bg-[#e6d8c4] text-[#4d3d2e] border border-[#d8cbb7]'
        }`}
        title={isInstallable ? 'Установить приложение на устройство' : 'Инструкция по установке'}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[11px] font-sans">Установить</span>
      </button>

      {/* Guide Modal when beforeinstallprompt is not directly available */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-[#e4ded3] space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#f5ede0] text-[#8a5323] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-serif font-bold text-[#2a2118]">
                  Установка на Android
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-[#786b5e] hover:text-[#2a2118] rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#524639] space-y-2.5 leading-relaxed bg-[#fbf9f5] p-3 rounded-xl border border-[#ede5d8]">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#8a5323] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">
                  1
                </span>
                <span>
                  В браузере <strong>Chrome</strong> на Android нажмите меню <strong>⋮</strong> (три точки) в правом верхнем углу.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#8a5323] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">
                  2
                </span>
                <span>
                  Выберите <strong>«Установить приложение»</strong> или <strong>«Добавить на главный экран»</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#2e7d32] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">
                  3
                </span>
                <span>
                  Приложение появится на домашнем экране и будет открываться в отдельном окне без панели браузера.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#2e7d32] bg-[#edf7ed] px-2.5 py-1.5 rounded-lg border border-[#c8e6c9]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Все функции конвертера и ридера работают автономно</span>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 px-4 bg-[#3d2f24] hover:bg-[#2e231a] text-white text-xs font-semibold rounded-xl transition-colors min-h-[42px]"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
};
