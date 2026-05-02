import fs from 'fs';
import path from 'path';
import { imageSize } from 'image-size';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { JustifiedPhotoGrid } from '@/components/ui/photo-lightbox';

// Justified layout: pack photos into rows so each row fills the full width.
// targetHeight = desired row height in px (at full container width).
// Returns rows where each cell has { src, widthPct, w, h } for correct aspect-ratio.
type JustifiedCell = { src: string; widthPct: number; w: number; h: number };

function justifyPhotos(
  photos: { src: string; w: number; h: number }[],
  targetHeight: number,
  gap: number,
  containerWidth: number,
  maxPerRow = Infinity,
): JustifiedCell[][] {
  const rows: JustifiedCell[][] = [];
  let row: { src: string; ar: number; w: number; h: number }[] = [];

  for (const p of photos) {
    const ar = p.w / p.h;
    row.push({ src: p.src, ar, w: p.w, h: p.h });

    const totalWidth =
      row.reduce((sum, r) => sum + r.ar * targetHeight, 0) + gap * (row.length - 1);

    if (totalWidth >= containerWidth || row.length >= maxPerRow) {
      const totalAr = row.reduce((sum, r) => sum + r.ar, 0);
      rows.push(
        row.map((r) => ({ src: r.src, widthPct: (r.ar / totalAr) * 100, w: r.w, h: r.h })),
      );
      row = [];
    }
  }

  // Last partial row — don't stretch, just show at natural proportions
  if (row.length > 0) {
    const totalAr = row.reduce((sum, r) => sum + r.ar, 0);
    rows.push(
      row.map((r) => ({ src: r.src, widthPct: (r.ar / totalAr) * 100, w: r.w, h: r.h })),
    );
  }

  return rows;
}

type VideoEntry = { platform: 'youtube'; id: string; vertical?: boolean } | { platform: 'vimeo'; id: string; vertical?: boolean };

function videoEmbedUrl(v: VideoEntry): string {
  if (v.platform === 'youtube') return `https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1`;
  return `https://player.vimeo.com/video/${v.id}?color=3f4cf6&title=0&byline=0&portrait=0&autopause=1`;
}

const workItems = [
  { slug: '10-jahre-rewe',                   common: '10 Jahre Rewe',                    photo: { url: '/cards/10 Jahre Rewe .png',                        pos: 'center' }, videos: [{ platform: 'youtube', id: 'xsm3GvDvg0U' }] as VideoEntry[], hideGrid: true },
  { slug: 'beelvital-fitness-health-club',   common: 'Beelvital- Fitness&Health club',   photo: { url: '/cards/Beelvital- Fitness&Health club .jpg',        pos: 'center' }, videos: [{ platform: 'youtube', id: 'D0qyz-c8MW8'    }] as VideoEntry[] },
  { slug: 'fussballgolf-werder',             common: 'Fußballgolf Werder',               photo: { url: '/cards/Fußballgolf Werder.jpg',                     pos: 'center' }, videos: [{ platform: 'youtube', id: 'NYkGM6-SZmA' }, { platform: 'youtube', id: 'DwMAN9NFox4' }] as VideoEntry[] },
  { slug: 'restaurant-biergarten-caputh',    common: 'Restaurant& Biergarten Caputh',    photo: { url: '/cards/Restaurant& Biergarten Caputh .jpg',         pos: 'center' }, videos: [{ platform: 'vimeo', id: '1184328774', vertical: true }, { platform: 'vimeo', id: '1183362918', vertical: true }] as VideoEntry[] },
  { slug: 'sk-gartenpflege',                 common: 'S&K Gartenpflege',                 photo: { url: '/cards/S&K Gartenpflege.jpg',                       pos: 'center' }, videos: [{ platform: 'youtube', id: 'f14rYeCyeaQ'    }] as VideoEntry[] },
  { slug: 'sarah-burde-fitness',             common: 'Sarah Burde Fitness',              photo: { url: '/cards/Sarah Burde Fitness .jpg',                   pos: 'center' }, videos: [{ platform: 'vimeo', id: '1184328839', vertical: true }, { platform: 'youtube', id: 'GNDwi7T2bqc' }] as VideoEntry[] },
  { slug: 'zahnarztpraxis-huller-kollengen', common: 'Zahnarztpraxis Hüller& Kollengen', photo: { url: '/cards/Zahnarztpraxis Hüller& Kollengen .jpg',      pos: 'center' }, videos: [{ platform: 'youtube', id: 'QG5ADj-7hUs', vertical: true }, { platform: 'youtube', id: 'tXznJbWHZMQ', vertical: true }] as VideoEntry[] },
  { slug: 'julia-on-mind',                   common: 'Julia On mind',                    photo: { url: '/cards/Julia On mind .jpg',                         pos: 'center' }, videos: [{ platform: 'youtube', id: 'GoO5iJnPNQk', vertical: true }, { platform: 'youtube', id: 'f8G62kT3xtI', vertical: true }, { platform: 'youtube', id: 'Vv_7cMyEjAo', vertical: true }, { platform: 'youtube', id: 'THo5X2enxwk' }, { platform: 'youtube', id: 'J8l74dsfPJ8' }, { platform: 'youtube', id: 'OTOU1iw7wQI' }, { platform: 'youtube', id: 'LbrdYhn4FdI' }, { platform: 'youtube', id: '2LWBWicWiBk' }, { platform: 'youtube', id: 'JLdjzjt07XY' }, { platform: 'youtube', id: 'N7LvqS11RK4' }] as VideoEntry[], hideGrid: true },
  { slug: 'aer-kollektiv-berlin',            common: 'AER Kollektiv Berlin',             photo: { url: '/cards/AER Kollektiv Berlin.jpg',                   pos: 'center' }, videos: [{ platform: 'youtube', id: 'UtPpVeWkAl8', vertical: true }] as VideoEntry[], hideGrid: true },
];

// Static placeholder grid for projects without real photos yet
const placeholderCells = [
  { type: 'video', label: '16:9', aspect: '16/9', span: 2 },
  { type: 'photo', label: '4:3',  aspect: '4/3',  span: 1 },
  { type: 'photo', label: '3:4',  aspect: '3/4',  span: 1 },
  { type: 'photo', label: '16:9', aspect: '16/9', span: 2 },
  { type: 'photo', label: '3:4',  aspect: '3/4',  span: 1 },
  { type: 'video', label: '4:3',  aspect: '4/3',  span: 1 },
  { type: 'video', label: '16:9', aspect: '16/9', span: 2 },
  { type: 'photo', label: '1:1',  aspect: '1/1',  span: 1 },
  { type: 'photo', label: '1:1',  aspect: '1/1',  span: 1 },
];


export function generateStaticParams() {
  return workItems.map((item) => ({ slug: item.slug }));
}

export default async function WorkItem({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = workItems.find((w) => w.slug === slug);
  if (!item) notFound();

  // Load real photos from public/work/{slug}/ if folder exists
  const photoDir = path.join(process.cwd(), 'public', 'work', slug);
  let projectPhotos: string[] = [];
  let justifiedRows: JustifiedCell[][] = [];
  let mobilJustifiedRows: JustifiedCell[][] = [];

  try {
    const files = fs
      .readdirSync(photoDir)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort();

    projectPhotos = files.map((f) => `/work/${slug}/${f}`);

    // Read dimensions for justified layout
    const photosWithDims = files.map((f) => {
      try {
        const buf = fs.readFileSync(path.join(photoDir, f));
        const dims = imageSize(buf);
        return { src: `/work/${slug}/${f}`, w: dims.width ?? 4, h: dims.height ?? 3 };
      } catch {
        return { src: `/work/${slug}/${f}`, w: 4, h: 3 };
      }
    });

    // Desktop: 1200px container, 320px target row height
    justifiedRows = justifyPhotos(photosWithDims, 320, 4, 1200);
    // Mobile: 375px container, 120px target row height, max 3 per row
    mobilJustifiedRows = justifyPhotos(photosWithDims, 120, 4, 375, 3);
  } catch {
    // No folder — fall back to placeholders
  }

  const hasRealPhotos = projectPhotos.length > 0;
const related = workItems.filter((w) => w.slug !== slug);

  // Placeholder grid: track video index

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-t-2 border-[#3f4cf6]">
        <div className="pointer-events-auto">
          <Link href="/">
            <Image src="/logo.png" alt="Mediagenic Logo" width={220} height={70} className="object-contain w-[130px] md:w-[220px] h-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-4 md:gap-8 font-mono uppercase font-semibold tracking-widest">
          <Link href="/work" className="text-white text-xs md:text-sm min-h-[44px] flex items-center relative group">
            Work
            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#3f4cf6] group-hover:w-full transition-all duration-300" />
          </Link>
          <Link href="/contact" className="min-h-[44px] px-3 md:px-5 flex items-center border border-[#3f4cf6] text-white/90 hover:bg-[#3f4cf6] hover:text-white transition-all duration-200 text-xs md:text-sm font-mono uppercase tracking-widest">
            Contact
          </Link>
        </div>
      </nav>

      {/* Hero image */}
      <div className="relative w-full h-screen overflow-hidden">
        <Image
          src={item.photo.url}
          alt={item.common}
          fill
          className="object-cover"
          style={{ objectPosition: item.photo.pos }}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
        <div className="absolute bottom-0 left-0 w-full px-6 md:px-16 pb-16 md:pb-24">
          <p className="font-mono uppercase text-[11px] tracking-widest text-[#3f4cf6] mb-3">Mediagenic</p>
          <h1 className="font-serif text-[clamp(2.5rem,8vw,6rem)] tracking-tight leading-none">
            {item.common}
          </h1>
        </div>
      </div>

      {/* Media grid */}
      <section className="px-4 md:px-12 pt-16 pb-8">
        <p className="font-mono uppercase text-[11px] tracking-widest text-white/30 mb-8">Projektmedien</p>

        {/* Videos — always shown at top; vertical videos side by side */}
        {item.videos.length > 0 && (
          <div className="flex flex-col gap-2 md:gap-3 mb-2 md:mb-3">
            {(() => {
              const groups: VideoEntry[][] = [];
              let vertBuf: VideoEntry[] = [];
              for (const v of item.videos) {
                if (v.vertical) {
                  vertBuf.push(v);
                } else {
                  if (vertBuf.length) { groups.push([...vertBuf]); vertBuf = []; }
                  groups.push([v]);
                }
              }
              if (vertBuf.length) groups.push(vertBuf);
              return groups.map((grp, gi) =>
                grp[0].vertical ? (
                  <div key={gi} className="flex gap-2 md:gap-3 justify-center">
                    {grp.map((v, vi) => (
                      <div key={vi} className="relative overflow-hidden border border-white/10 bg-black rounded-lg flex-1 max-w-[340px]" style={{ aspectRatio: '9/16' }}>
                        <iframe
                          src={videoEmbedUrl(v)}
                          className="absolute inset-0 w-full h-full"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div key={gi} className="relative w-full overflow-hidden border border-white/10 bg-black rounded-lg" style={{ aspectRatio: '16/9' }}>
                    <iframe
                      src={videoEmbedUrl(grp[0])}
                      className="absolute inset-0 w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )
              );
            })()}
          </div>
        )}

        {hasRealPhotos ? (
          <JustifiedPhotoGrid rows={justifiedRows} mobileRows={mobilJustifiedRows} />
        ) : !item.hideGrid ? (
          /* Placeholder grid for projects without photos yet */
          <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {placeholderCells.filter((cell) => cell.type !== 'video').map((cell, i) => (
                <div
                  key={i}
                  style={{ gridColumn: `span ${cell.span}`, aspectRatio: cell.aspect }}
                  className="relative overflow-hidden border border-white/10 bg-white/[0.06] hover:bg-white/[0.09] flex flex-col items-center justify-center gap-2 group transition-colors duration-300"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-white/20 group-hover:text-white/35 transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="8.5" cy="10.5" r="1.5" />
                    <path d="M3 16l5-5 4 4 3-3 6 5" />
                  </svg>
                  <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-white/20 group-hover:text-white/35 transition-colors duration-300">
                    Foto · {cell.label}
                  </span>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/[0.04]" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/[0.04]" />
                  </div>
                  <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-white/15" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-white/15" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-white/15" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-white/15" />
                </div>
              ))}
          </div>
        ) : null}
      </section>

      {/* Weitere Projekte */}
      <section className="px-4 md:px-12 pt-12 pb-8">
        <p className="font-mono uppercase text-[11px] tracking-widest text-white/30 mb-6">Weitere Projekte</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {related.map((r) => (
            <Link key={r.slug} href={`/work/${r.slug}`} className="group block">
              <div className="relative overflow-hidden aspect-[4/3] bg-white/[0.04]">
                <img
                  src={r.photo.url}
                  alt={r.common}
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <p className="mt-2 font-mono text-[10px] md:text-xs uppercase tracking-widest text-white/50 group-hover:text-white/80 transition-colors duration-200 leading-tight">
                {r.common}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Back link */}
      <div className="px-6 md:px-16 py-16">
        <Link
          href="/work"
          className="inline-flex items-center gap-3 font-mono uppercase text-xs tracking-widest text-white/50 hover:text-white transition-colors duration-200 group"
        >
          <span className="w-8 h-[1px] bg-white/30 group-hover:bg-white group-hover:w-12 transition-all duration-300" />
          Back to Work
        </Link>
      </div>
    </main>
  );
}
