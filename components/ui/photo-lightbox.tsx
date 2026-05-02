'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';

type Cell = { src: string; widthPct: number; w: number; h: number };

type Props = {
  rows: Cell[][];
  mobileRows?: Cell[][];
};

export function JustifiedPhotoGrid({ rows, mobileRows }: Props) {
  const photos = rows.flat();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const prev = () => setLightboxIndex((i) => (i! + photos.length - 1) % photos.length);
    const next = () => setLightboxIndex((i) => (i! + 1) % photos.length);

    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape')     setLightboxIndex(null);
    };

    window.addEventListener('keydown', handler);
    document.body.style.overflow = lightboxIndex !== null ? 'hidden' : '';

    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, photos.length]);

  // Find canonical index by src so both grids share one lightbox state
  const handleClick = (src: string) => {
    const idx = photos.findIndex((p) => p.src === src);
    setLightboxIndex(idx);
  };

  const renderGrid = (gridRows: Cell[][], sizes: string, wrapperClass: string) => (
    <div className={`flex flex-col gap-1 ${wrapperClass}`}>
      {gridRows.map((row, ri) => (
        <div key={ri} className="flex gap-1 w-full">
          {row.map((cell, ci) => (
            <div
              key={`${ri}-${ci}`}
              onClick={() => handleClick(cell.src)}
              className="relative overflow-hidden bg-black flex-shrink-0 rounded-lg cursor-pointer group"
              style={{ width: `${cell.widthPct}%`, aspectRatio: `${cell.w}/${cell.h}` }}
            >
              <NextImage
                src={cell.src}
                alt=""
                fill
                sizes={sizes}
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile grid — max 3 per row, hidden on md+ */}
      {mobileRows && renderGrid(mobileRows, '33vw', 'md:hidden')}

      {/* Desktop grid — hidden on mobile */}
      {renderGrid(rows, '(max-width: 768px) 25vw, 20vw', mobileRows ? 'hidden md:flex' : '')}

      {/* Lightbox overlay */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Image */}
          <img
            src={photos[lightboxIndex].src}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Prev */}
          <button
            aria-label="Vorheriges Foto"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-3xl transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i! + photos.length - 1) % photos.length);
            }}
          >
            ‹
          </button>

          {/* Next */}
          <button
            aria-label="Nächstes Foto"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-3xl transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i! + 1) % photos.length);
            }}
          >
            ›
          </button>

          {/* Close */}
          <button
            aria-label="Schließen"
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-lg transition-colors"
            onClick={() => setLightboxIndex(null)}
          >
            ✕
          </button>

          {/* Counter */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-widest text-white/40 pointer-events-none">
            {lightboxIndex + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
