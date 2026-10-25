import React, { useRef } from 'react';
import { Upload, FileText, ShieldCheck, Zap, BookCheck } from 'lucide-react';
import { SAMPLE_BOOKS, generateTestPdf } from '../utils/samplePdfGenerator';

interface UploadScreenProps {
  onFileSelected: (file: File | { name: string; buffer: ArrayBuffer }) => void;
  isLoadingFile?: boolean;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ onFileSelected, isLoadingFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      onFileSelected(file);
    }
  };

  const handleSampleSelect = (presetId: string) => {
    const preset = SAMPLE_BOOKS.find(b => b.id === presetId);
    if (!preset) return;
    const buffer = generateTestPdf(preset);
    onFileSelected({
      name: `${preset.title}.pdf`,
      buffer,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5 px-3 py-4">
      {/* Introduction Card */}
      <div className="bg-[#ffffff] rounded-2xl p-5 border border-[#eae3d5] shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f5ede0] text-[#8a5323] flex items-center justify-center shrink-0">
            <BookCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#29221b]">
              Преобразование PDF в EPUB 3
            </h2>
            <p className="text-xs text-[#6e6357] mt-1 leading-relaxed">
              Создание валидных электронных книг для комфортного чтения на смартфоне с восстановлением переносов и абзацев.
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="mt-5 border-2 border-dashed border-[#d9cebd] hover:border-[#9c6a38] bg-[#fbf9f5] hover:bg-[#f6f1e8] rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 select-none active:scale-[0.99]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-14 h-14 rounded-full bg-[#f0e6d6] text-[#784617] flex items-center justify-center shadow-xs">
            <Upload className="w-7 h-7" />
          </div>
          <div>
            <span className="block font-medium text-sm text-[#271f18]">
              {isLoadingFile ? 'Подготовка файла...' : 'Выберите PDF-книгу'}
            </span>
            <span className="block text-xs text-[#7d7162] mt-0.5">
              или перетащите файл сюда
            </span>
          </div>
          <button
            type="button"
            className="w-full mt-2 py-3 px-4 bg-[#413123] hover:bg-[#32251a] text-[#f7f2ea] text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 min-h-[46px]"
          >
            <FileText className="w-4 h-4" />
            <span>Выбрать файл с устройства</span>
          </button>
        </div>
      </div>

      {/* Instant Demo Presets */}
      <div className="bg-[#f9f7f2] rounded-2xl p-4 border border-[#e8dfcf]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#665747] mb-3">
          <Zap className="w-3.5 h-3.5 text-[#b45309]" />
          <span>Быстрый тест без поиска файла</span>
        </div>
        <div className="space-y-2">
          {SAMPLE_BOOKS.map(book => (
            <button
              key={book.id}
              onClick={() => handleSampleSelect(book.id)}
              className="w-full text-left p-3 bg-white hover:bg-[#fdfaf5] active:bg-[#f5ece0] rounded-xl border border-[#ded5c5] transition-all flex items-center justify-between group min-h-[48px]"
            >
              <div className="pr-2">
                <div className="text-xs font-bold text-[#2c221a] group-hover:text-[#8a4e1b]">
                  {book.title}
                </div>
                <div className="text-[11px] text-[#73675a]">
                  {book.author} • {book.lang === 'uk' ? 'Украинский' : 'Русский'}
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#8a5323] bg-[#f7efe3] px-2 py-1 rounded-md shrink-0">
                Загрузить
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Security & Client-side guarantee */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-[#f2ede4] text-[#5e5346] text-[11px] leading-relaxed border border-[#e4dcce]">
        <ShieldCheck className="w-4 h-4 text-[#2d7a46] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#2f2720]">100% обработка в браузере:</span> Ваши книги не отправляются на сервер, данные остаются конфиденциальными на вашем устройстве.
        </div>
      </div>
    </div>
  );
};
