/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { UploadScreen } from './components/UploadScreen';
import { SettingsPanel } from './components/SettingsPanel';
import { ConversionProgress } from './components/ConversionProgress';
import { ResultScreen } from './components/ResultScreen';
import {
  BookSettings,
  ConversionProgressState,
  ConversionResult,
} from './types/converter';
import { ConversionEngine } from './modules/conversionEngine';
import { PdfProcessor } from './modules/pdfProcessor';
import { AlertCircle, RotateCcw } from 'lucide-react';

type AppStep = 'upload' | 'settings' | 'converting' | 'result' | 'error';

export default function App() {
  const [step, setStep] = useState<AppStep>('upload');
  const [fileData, setFileData] = useState<{
    name: string;
    buffer: ArrayBuffer;
    size: number;
  } | null>(null);

  const [settings, setSettings] = useState<BookSettings>({
    title: '',
    author: '',
    language: 'auto',
    outputLang: 'ru',
    ocrMode: 'auto',
    cleanLevel: 'conservative',
    extractCover: true,
  });

  const [progress, setProgress] = useState<ConversionProgressState>({
    stageId: 'idle',
    stageNumber: 1,
    totalStages: 7,
    stageTitle: 'Подготовка к конвертации',
    percent: 0,
    processedPages: 0,
    totalPages: 0,
    currentOperation: 'Инициализация...',
    warnings: [],
    canCancel: true,
  });

  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  const engineRef = useRef<ConversionEngine | null>(null);

  const handleFileSelected = async (fileInput: File | { name: string; buffer: ArrayBuffer }) => {
    try {
      setIsLoadingFile(true);
      setErrorMessage('');

      let buffer: ArrayBuffer;
      const name = fileInput.name;
      let size = 0;

      if (fileInput instanceof File) {
        buffer = await fileInput.arrayBuffer();
        size = fileInput.size;
      } else {
        buffer = fileInput.buffer;
        size = fileInput.buffer.byteLength;
      }

      // Quick read of metadata using PdfProcessor
      const tempProcessor = new PdfProcessor();
      let extractedTitle = '';
      let extractedAuthor = '';

      try {
        const info = await tempProcessor.loadDocument(buffer);
        extractedTitle = info.title || '';
        extractedAuthor = info.author || '';
      } catch {
        // Proceed even if metadata read fails
      } finally {
        tempProcessor.destroy();
      }

      // Fallback title from filename
      const cleanName = name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      const defaultTitle = extractedTitle || cleanName;

      setFileData({
        name,
        buffer,
        size,
      });

      setSettings(prev => ({
        ...prev,
        title: defaultTitle,
        author: extractedAuthor || prev.author || '',
      }));

      setStep('settings');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? `Не удалось прочитать PDF файл: ${err.message}`
          : 'Не удалось прочитать выбранный PDF файл. Убедитесь, что файл не повреждён.'
      );
      setStep('error');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleStartConversion = async () => {
    if (!fileData) return;

    setStep('converting');
    setProgress({
      stageId: 'loading',
      stageNumber: 1,
      totalStages: 7,
      stageTitle: 'Загрузка и подготовка документа',
      percent: 2,
      processedPages: 0,
      totalPages: 0,
      currentOperation: 'Загрузка структуры PDF...',
      warnings: [],
      canCancel: true,
    });

    const engine = new ConversionEngine();
    engineRef.current = engine;

    try {
      const conversionResult = await engine.run(
        fileData.buffer,
        settings,
        fileData.name,
        state => {
          setProgress(state);
        }
      );

      setResult(conversionResult);
      setStep('result');
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('отменена')) {
        // Handled user cancellation
        setStep('settings');
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Произошла непредвиденная ошибка в процессе конвертации.'
        );
        setStep('error');
      }
    } finally {
      engineRef.current = null;
    }
  };

  const handleCancelConversion = () => {
    if (engineRef.current) {
      engineRef.current.cancel();
      engineRef.current = null;
    }
    setStep('settings');
  };

  const handleReset = () => {
    if (engineRef.current) {
      engineRef.current.cancel();
      engineRef.current = null;
    }
    setFileData(null);
    setResult(null);
    setErrorMessage('');
    setStep('upload');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfbf9] text-[#24211e]">
      <Header onReset={handleReset} />

      <main className="flex-1 pb-10">
        {step === 'upload' && (
          <UploadScreen
            onFileSelected={handleFileSelected}
            isLoadingFile={isLoadingFile}
          />
        )}

        {step === 'settings' && fileData && (
          <SettingsPanel
            settings={settings}
            onSettingsChange={setSettings}
            fileName={fileData.name}
            fileSizeBytes={fileData.size}
            onStartConversion={handleStartConversion}
            onBack={handleReset}
          />
        )}

        {step === 'converting' && (
          <ConversionProgress
            progress={progress}
            onCancel={handleCancelConversion}
          />
        )}

        {step === 'result' && result && (
          <ResultScreen
            result={result}
            onReset={handleReset}
          />
        )}

        {step === 'error' && (
          <div className="w-full max-w-md mx-auto space-y-4 px-3 py-6">
            <div className="bg-white rounded-2xl p-5 border border-[#fecaca] shadow-xs text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#fef2f2] text-[#dc2626] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2d221a]">
                  Ошибка обработки
                </h3>
                <p className="text-xs text-[#7f1d1d] mt-2 leading-relaxed bg-[#fef2f2] p-3 rounded-xl border border-[#fee2e2] text-left">
                  {errorMessage}
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 px-4 bg-[#413123] hover:bg-[#32251a] text-[#f7f2ea] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[46px]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Вернуться к выбору файла</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
