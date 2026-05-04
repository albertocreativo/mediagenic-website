'use client';

import { useState, useEffect, useCallback } from 'react';

export default function PhotoGallery({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(() => setIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)), [photos.length]);
  const next = useCallback(() => setIndex((i) => (i === null ? null : (i + 1) % photos.length)), [photos.length]);

  useEffect(() => {
    if (index === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, prev, next, close]);

  return (
    <>
      <div className="columns-2 md:columns-3 gap-2 md:gap-3">
        {photos.map((src, i) => (
          <div key={src} className="break-inside-avoid mb-2 md:mb-3 cursor-zoom-in" onClick={() => setIndex(i)}>
            <img src={src} alt="" className="w-full block rounded-lg" loading="lazy" />
          </div>
        ))}
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={close}
        >
          {/* Image */}
          <img
            src={photos[index]}
            alt=""
            className="max-h-screen max-w-[90vw] object-contain rounded-lg select-none"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Close */}
          <button
            onClick={close}
            className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors text-3xl leading-none font-light"
          >
            ×
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-3"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-3"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Counter */}
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-widest text-white/30">
            {index + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
