import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Layers,
  FileQuestion,
  ExternalLink,
} from 'lucide-react';
import { ExamDefinition } from '../types/exam';

interface PdfViewerProps {
  exam: ExamDefinition;
  currentPage: number;
  onPageChange: (page: number) => void;
  jumpToDrawing?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  exam,
  currentPage,
  onPageChange,
  jumpToDrawing,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const totalPages = exam.pageCount || 12;

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 60));
  const handleZoomReset = () => setZoomLevel(100);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' && currentPage < totalPages) {
        onPageChange(currentPage + 1);
      } else if (e.key === 'ArrowLeft' && currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onPageChange]);

  // Is this the sample exam with pre-rendered pages?
  const isSampleExam = exam.id.includes('2025-zerspaner');
  const pageImagePath = `/sample-exam/pages/page_${currentPage}.png`;

function formatPdfEmbedUrl(url: string, page: number): string {
  if (!url) return '';
  // Erkennung von Google Drive Freigabelinks (z. B. drive.google.com/file/d/.../view)
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return `${url}#page=${page}`;
}

  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl flex flex-col h-full border border-slate-800 overflow-hidden text-slate-200">
      {/* Top Toolbar */}
      <div className="bg-slate-950/90 px-3 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Title & Page navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              title="Vorherige Seite (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold px-2 text-slate-200 select-none">
              Seite <span className="text-blue-400 font-bold">{currentPage}</span> / {totalPages}
            </span>

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              title="Nächste Seite (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Page Selector */}
          <select
            value={currentPage}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                Seite {p} {p === 1 ? '(Deckblatt)' : p === 2 ? '(Hinweise)' : p === 10 ? '(Zeichnung Bild a)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Center / Right: Quick Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Jump to Drawing Sheet (Page 10) */}
          <button
            onClick={() => onPageChange(10)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentPage === 10
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30'
            }`}
            title="Zeichnung Bild a (Krone/Grundkörper) auf Seite 10 ansehen"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zeichnung (Bild a)</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title="Verkleinern"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-medium px-1.5 text-slate-300 select-none">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title="Vergrößern"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={handleZoomReset}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                title="100% Reset"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Native PDF / Tab Link */}
          <a
            href={exam.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded-xl transition-colors hidden sm:block"
            title="Original-PDF / Google Drive in neuem Fenster öffnen"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Document Viewer Canvas */}
      <div className="flex-1 bg-slate-950 overflow-auto p-2 sm:p-4 flex items-start justify-center">
        <div
          className="transition-all duration-150 origin-top flex flex-col items-center"
          style={{ width: `${zoomLevel}%`, maxWidth: zoomLevel === 100 ? '100%' : 'none' }}
        >
          {isSampleExam ? (
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-700 max-w-full">
              <img
                src={pageImagePath}
                alt={`IHK Prüfungsbogen Seite ${currentPage}`}
                className="w-full h-auto object-contain block select-none pointer-events-none"
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-full bg-white rounded-lg shadow-2xl overflow-hidden min-h-[700px] border border-slate-700">
              <iframe
                src={formatPdfEmbedUrl(exam.pdfUrl, currentPage)}
                title="IHK Prüfungsheft PDF"
                className="w-full h-[750px] border-0"
                allow="autoplay"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="bg-slate-950/80 px-3 py-1.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-300">{exam.examCode}</span>
          <span>•</span>
          <span className="truncate">{exam.title}</span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          Tastatur: Pfeil links (←) / rechts (→) zum Blättern
        </div>
      </div>
    </div>
  );
};
