import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ExamDefinition } from '../types/exam';
import * as pdfjsLib from 'pdfjs-dist';

// Konfiguriere Web-Worker für PDF.js (lokal aus /public bereitgestellt)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

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
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(exam.pageCount || 12);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Resize-Observer für flüssiges und stabiles Anpassen bei jeder Browser-Fenstergröße
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 900,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Beobachte Browser- und Containergröße nur wenn PDF.js Canvas aktiv ist, mit Debounce
  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;
    let resizeTimer: any = null;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          const w = Math.round(entry.contentRect.width);
          const h = Math.round(entry.contentRect.height);

          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            setContainerSize((prev) => {
              if (Math.abs(prev.width - w) < 20 && Math.abs(prev.height - h) < 20) {
                return prev;
              }
              return { width: w, height: h };
            });
          }, 150);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [pdfDoc]);

  // Ist es der vorgerenderte Musterprüfungsbogen?
  const isSampleWithImages =
    exam.id.includes('2025-zerspaner') &&
    Boolean(exam.pageCount && exam.pageCount > 0);

  const effectiveTotalPages = Math.max(1, pdfTotalPages || exam.pageCount || 12);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 60));
  const handleZoomReset = () => setZoomLevel(100);

  // Tastaturnavigation für seitenweises Blättern (← / →)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'ArrowRight' && currentPage < effectiveTotalPages) {
        onPageChange(currentPage + 1);
      } else if (e.key === 'ArrowLeft' && currentPage > 1) {
        onPageChange(currentPage - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, effectiveTotalPages, onPageChange]);

  // Prüfungs-PDF laden (falls nicht über Bild-Dateien gerendert)
  useEffect(() => {
    if (isSampleWithImages) {
      setPdfDoc(null);
      setPdfTotalPages(exam.pageCount || 12);
      setIsPdfLoading(false);
      return;
    }

    if (!exam.pdfUrl) {
      setPdfError('Keine PDF-URL für diesen Prüfungsbogen angegeben.');
      return;
    }

    let isCancelled = false;
    setIsPdfLoading(true);
    setPdfError(null);

    const loadDocument = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: exam.pdfUrl,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setPdfTotalPages(doc.numPages);
        setIsPdfLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('[PdfViewer] PDF.js Laden fehlgeschlagen:', err);
        setPdfError(err?.message || 'PDF konnte nicht geladen werden.');
        setIsPdfLoading(false);
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [exam.id, exam.pdfUrl, isSampleWithImages]);

  // Exakt EINE Seite scharf auf Canvas rendern (vollständig zentriert, kein Verschieben)
  useEffect(() => {
    if (isSampleWithImages || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const validPage = Math.min(Math.max(1, currentPage), pdfDoc.numPages);
        const page = await pdfDoc.getPage(validPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Container-Dimensionen für optimales, großformatiges 1-Seiten-Fitting
        const availableWidth = Math.max(320, containerSize.width - 24);
        const availableHeight = Math.max(400, containerSize.height - 24);

        // Basis-Viewport bei 1.0 Skalierung
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Berechne Skalierungsfaktor: Volle Breite nutzen (Fit-to-Width) für maximale Lesbarkeit
        const scaleW = availableWidth / unscaledViewport.width;
        const scaleH = availableHeight / unscaledViewport.height;
        // Basis-Skalierung: mind. 95% der Breite ausnutzen (bis zu 1.35x von scaleH), damit Schrift groß und klar lesbar ist
        const baseFitScale = Math.max(scaleW * 0.96, Math.min(scaleW, scaleH * 1.35));

        // Benutzerspezifischer Zoom
        const userScale = (zoomLevel / 100) * baseFitScale;

        // Hohe DPI für messerscharfen Text & technische Zeichnungen (Retina / 4K)
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: userScale * pixelRatio });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          // Normal bei schnellem Seitenwechsel
          return;
        }
        console.warn('[PdfViewer] Seiten-Renderfehler:', err);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, zoomLevel, containerSize, isSampleWithImages]);

  // Für Google-Drive Fallback URLs falls nötig
  function formatPdfEmbedUrl(url: string, page: number): string {
    if (!url) return '';
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return `${url}#page=${page}`;
  }

  const pageImagePath = `/sample-exam/pages/page_${currentPage}.png`;

  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl flex flex-col h-full border border-slate-800 overflow-hidden text-slate-200">
      {/* Top Toolbar */}
      <div className="bg-slate-950/90 px-3 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Left: Title & Page navigation */}
        <div className="flex items-center gap-2">
          {/* Seitennavigation mit Vor/Zurück Tasten */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 shadow-xs">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Vorherige Seite (Tastatur: ←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold px-2 text-slate-200 select-none">
              Seite <span className="text-blue-400 font-bold">{currentPage}</span> / {effectiveTotalPages}
            </span>

            <button
              onClick={() => onPageChange(Math.min(effectiveTotalPages, currentPage + 1))}
              disabled={currentPage >= effectiveTotalPages}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Nächste Seite (Tastatur: →)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Page Selector */}
          <select
            value={currentPage}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {Array.from({ length: effectiveTotalPages }, (_, i) => i + 1).map((p) => (
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
            onClick={() => {
              if (jumpToDrawing) jumpToDrawing();
              else onPageChange(10);
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Verkleinern"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-medium px-1.5 text-slate-300 select-none">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Vergrößern"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={handleZoomReset}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="100% Einpassen"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Native PDF / Tab Link */}
          {exam.pdfUrl && (
            <a
              href={exam.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded-xl transition-colors hidden sm:block"
              title="Original-PDF / Google Drive in neuem Browser-Tab öffnen"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Document Viewer Canvas: Immer exakt eine Seite zentriert & stabil eingepasst */}
      <div
        ref={containerRef}
        className="flex-1 bg-slate-950 overflow-auto p-1 sm:p-2 flex items-start justify-center relative select-none w-full"
      >
        {isPdfLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs z-10 space-y-3">
            <Loader2 className="w-8 h-8 text-sbsz-cyan animate-spin" />
            <p className="text-xs text-slate-300 font-medium">Prüfungsheft wird geladen...</p>
          </div>
        )}

        <div className="w-full h-full flex flex-col items-center justify-start min-h-0">
          {isSampleWithImages ? (
            /* Modus 1: Vorgerenderte Buchseiten (Beispielprüfung Sommer 2025) */
            <div
              className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 transition-all duration-150 flex items-center justify-center w-full"
              style={{
                width: zoomLevel === 100 ? '100%' : `${zoomLevel}%`,
                maxWidth: zoomLevel <= 100 ? '1200px' : 'none',
              }}
            >
              <img
                src={pageImagePath}
                alt={`IHK Prüfungsbogen Seite ${currentPage}`}
                className="w-full h-auto object-contain block select-none pointer-events-none"
                loading="eager"
              />
            </div>
          ) : pdfDoc ? (
            /* Modus 2: Echte PDF-Seiten vektorscharf über PDF.js Canvas gerendert (immer exakt 1 Seite) */
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 flex items-center justify-center max-w-full">
              <canvas ref={canvasRef} className="block shadow-md max-w-full h-auto" />
            </div>
          ) : pdfError ? (
            /* Modus 3: Fallback bei PDF-CORS/Drive-Link - Vollflächig, maximal groß und glasklar lesbar */
            <div className="w-full h-full flex flex-col items-stretch justify-start min-h-0 flex-1">
              {/* Schlanke, unaufdringliche Statuszeile ohne Platzverlust */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 mb-2 flex items-center justify-between text-xs text-slate-300 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-medium text-slate-200">Google Drive Vorschau eingebettet</span>
                  <span className="text-slate-500 hidden sm:inline">•</span>
                  <span className="text-slate-400 hidden sm:inline">Vollbild-Darstellung aktiv</span>
                </div>
                {exam.pdfUrl && (
                  <a
                    href={exam.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold underline text-xs"
                  >
                    <span>Im neuen Tab vergrößern</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Iframe nimmt 100% der verfügbaren Höhe und Breite ein */}
              <div className="flex-1 w-full bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-700 min-h-0">
                <iframe
                  src={formatPdfEmbedUrl(exam.pdfUrl, currentPage)}
                  title="IHK Prüfungsheft PDF"
                  className="w-full h-full border-0 block"
                  allow="autoplay"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-slate-950/90 px-3 py-1.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-300">{exam.examCode}</span>
          <span>•</span>
          <span className="truncate">{exam.title}</span>
          <span className="hidden md:inline text-slate-500">•</span>
          <span className="hidden md:inline text-blue-400 font-mono">
            Einzelseite {currentPage} von {effectiveTotalPages}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          Tastatur: Pfeil links (←) / rechts (→) zum Blättern
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
