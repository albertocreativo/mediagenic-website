'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CircularGallery, GalleryItem } from '@/components/ui/circular-gallery';

const workItems: GalleryItem[] = [
  {
    common: '10 Jahre Rewe',
    binomial: 'Mediagenic',
    href: '/work/10-jahre-rewe',
    photo: { url: '/cards/10 Jahre Rewe .png', text: '10 Jahre Rewe', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'Beelvital- Fitness&Health club',
    binomial: 'Mediagenic',
    href: '/work/beelvital-fitness-health-club',
    photo: { url: '/cards/Beelvital- Fitness&Health club .jpg', text: 'Beelvital- Fitness&Health club', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'Fußballgolf Werder',
    binomial: 'Mediagenic',
    href: '/work/fussballgolf-werder',
    photo: { url: '/cards/Fußballgolf Werder.jpg', text: 'Fußballgolf Werder', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'Restaurant& Biergarten Caputh',
    binomial: 'Mediagenic',
    href: '/work/restaurant-biergarten-caputh',
    photo: { url: '/cards/Restaurant& Biergarten Caputh .jpg', text: 'Restaurant& Biergarten Caputh', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'S&K Gartenpflege',
    binomial: 'Mediagenic',
    href: '/work/sk-gartenpflege',
    photo: { url: '/cards/S&K Gartenpflege.jpg', text: 'S&K Gartenpflege', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'Sarah Burde Fitness',
    binomial: 'Mediagenic',
    href: '/work/sarah-burde-fitness',
    photo: { url: '/cards/Sarah Burde Fitness .jpg', text: 'Sarah Burde Fitness', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'Zahnarztpraxis Hüller& Kollengen',
    binomial: 'Mediagenic',
    href: '/work/zahnarztpraxis-huller-kollengen',
    photo: { url: '/cards/Zahnarztpraxis Hüller& Kollengen .jpg', text: 'Zahnarztpraxis Hüller& Kollengen', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'Julia On mind',
    binomial: 'Mediagenic',
    href: '/work/julia-on-mind',
    photo: { url: '/cards/Julia On mind .jpg', text: 'Julia On mind', pos: 'center', by: 'Mediagenic' },
  },
  {
    common: 'AER Kollektiv Berlin',
    binomial: 'Mediagenic',
    href: '/work/aer-kollektiv-berlin',
    photo: { url: '/cards/AER Kollektiv Berlin.jpg', text: 'AER Kollektiv Berlin', pos: 'center', by: 'Mediagenic' },
  },
];

export default function Work() {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(500);
  useEffect(() => {
    const update = () => setRadius(window.innerWidth < 768 ? 280 : 500);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-t-2 border-[#3f4cf6]">
        <div className="pointer-events-auto">
          <Link href="/">
            <Image src="/logo.png" alt="Mediagenic Logo" width={220} height={70} className="object-contain w-[130px] md:w-[220px] h-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-4 md:gap-8 font-mono uppercase font-semibold tracking-widest">
          <Link
            href="/work"
            className="text-white text-xs md:text-sm min-h-[44px] flex items-center relative"
          >
            Work
            <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#3f4cf6]" />
          </Link>
          <Link
            href="/contact"
            className="min-h-[44px] px-3 md:px-5 flex items-center border border-[#3f4cf6] text-white/90 hover:bg-[#3f4cf6] hover:text-white transition-all duration-200 text-xs md:text-sm font-mono uppercase tracking-widest"
          >
            Contact
          </Link>
        </div>
      </nav>

      {/* Circular gallery — sticky scroll */}
      <div className="w-full h-[300vh] md:h-[500vh]">
        <div className="w-full h-dvh sticky top-0 flex flex-col items-center justify-center overflow-hidden">
          <div className="text-center absolute top-16 md:top-24 z-10 pointer-events-none">
            <h1 className="font-serif text-3xl md:text-5xl tracking-tight">
              <span className="italic" style={{ color: '#3f4cf6' }}>Our</span> Work
            </h1>
            <p className="font-mono uppercase text-[11px] tracking-widest text-white/40 mt-2">
              Scroll or swipe to explore
            </p>
          </div>
          <div className="w-full h-full">
            <CircularGallery ref={galleryRef} items={workItems} radius={radius} autoRotateSpeed={0.015} />
          </div>
        </div>
      </div>
    </main>
  );
}
