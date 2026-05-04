import React, { useState, useEffect, useRef, HTMLAttributes } from 'react';
import Link from 'next/link';

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
}

export interface GalleryItem {
  common: string;
  binomial: string;
  href?: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by: string;
  };
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  radius?: number;
  autoRotateSpeed?: number;
}

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 600, autoRotateSpeed = 0.02, ...props }, ref) => {
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const touchStartXRef = useRef<number | null>(null);
    const isTouchingRef = useRef(false);
    const isDraggingRef = useRef(false);
    const mousePrevXRef = useRef<number | null>(null);

    // Detect mobile viewport
    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    }, []);

    // Scroll-based rotation (desktop)
    useEffect(() => {
      const handleScroll = () => {
        if (isTouchingRef.current) return;
        setIsScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        setRotation(scrollProgress * 360);
        scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }, []);

    // Touch swipe rotation (mobile)
    useEffect(() => {
      const el = (ref as React.RefObject<HTMLDivElement>)?.current;
      if (!el) return;

      const onTouchStart = (e: TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX;
        isTouchingRef.current = true;
        setIsScrolling(true);
      };

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (touchStartXRef.current === null) return;
        const deltaX = e.touches[0].clientX - touchStartXRef.current;
        touchStartXRef.current = e.touches[0].clientX;
        setRotation(prev => prev + deltaX * 0.4);
      };

      const onTouchEnd = () => {
        isTouchingRef.current = false;
        touchStartXRef.current = null;
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 300);
      };

      el.addEventListener('touchstart', onTouchStart, { passive: false });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd);
      return () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
      };
    }, [ref]);

    // Auto-rotation when idle
    useEffect(() => {
      const autoRotate = () => {
        if (!isScrolling) {
          setRotation(prev => prev + autoRotateSpeed);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };
      animationFrameRef.current = requestAnimationFrame(autoRotate);
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }, [isScrolling, autoRotateSpeed]);

    const anglePerItem = 360 / items.length;
    const n = items.length;
    const cardW = isMobile ? 180 : 360;
    const cardH = isMobile ? 240 : 480;
    // Radius must fit all cards around the circle without overlap
    const cardGap = isMobile ? 2 : 8;
    const minRadius = (n * (cardW + cardGap)) / (2 * Math.PI);
    const effectiveRadius = Math.max(Math.ceil(minRadius), radius);

    return (
      <div
        ref={ref}
        role="region"
        aria-label="Circular 3D Gallery"
        className={cn("relative w-full h-full flex items-center justify-center select-none", className)}
        style={{ perspective: '1400px', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
        onMouseDown={(e) => {
          isDraggingRef.current = true;
          mousePrevXRef.current = e.clientX;
          setIsScrolling(true);
        }}
        onMouseMove={(e) => {
          if (!isDraggingRef.current || mousePrevXRef.current === null) return;
          const deltaX = e.clientX - mousePrevXRef.current;
          mousePrevXRef.current = e.clientX;
          setRotation(prev => prev + deltaX * 0.3);
        }}
        onMouseUp={() => {
          isDraggingRef.current = false;
          mousePrevXRef.current = null;
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 300);
        }}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          mousePrevXRef.current = null;
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 300);
        }}
        {...props}
      >
        {/* Room atmosphere — radial light from center */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0, background: 'radial-gradient(ellipse 90% 55% at 50% 48%, rgba(63,76,246,0.10) 0%, rgba(20,20,40,0.18) 55%, transparent 100%)' }} />

        {/* Reflective floor */}
        <div className="absolute pointer-events-none" style={{ zIndex: 0, bottom: 0, left: 0, right: 0, height: '42%', background: 'linear-gradient(to bottom, rgba(63,76,246,0.06) 0%, rgba(0,0,10,0.55) 100%)' }} />

        {/* Floor reflection line */}
        <div className="absolute pointer-events-none" style={{ zIndex: 1, top: '58%', left: '5%', right: '5%', height: '1px', background: 'linear-gradient(to right, transparent, rgba(63,76,246,0.5), rgba(180,185,255,0.25), rgba(63,76,246,0.5), transparent)', boxShadow: '0 0 14px 3px rgba(63,76,246,0.22)' }} />

        <div
          className="relative w-full h-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
            zIndex: 2,
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = rotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle);
            const opacity = Math.max(0.3, 1 - (normalizedAngle / 180));
            const glowIntensity = Math.max(0.15, 1 - normalizedAngle / 180);
            const isHovered = hoveredIndex === i;
            const blueGlow = `0 0 ${16 * glowIntensity}px ${3 * glowIntensity}px rgba(63,76,246,${0.35 * glowIntensity})`;
            const whiteGlow = isHovered ? ', 0 0 22px 6px rgba(255,255,255,0.18)' : '';

            const cardInner = (
              <div
                className={cn(
                  'relative w-full h-full rounded-lg shadow-2xl overflow-hidden border border-[#3f4cf6]/30',
                  item.href && 'cursor-pointer'
                )}
                style={{ boxShadow: blueGlow + whiteGlow, transition: 'box-shadow 0.3s ease' }}
              >
                <img
                  src={item.photo.url}
                  alt={item.photo.text}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: item.photo.pos || 'center' }}
                />
                <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/80 to-transparent text-white">
                  <h2 className={isMobile ? 'text-sm font-bold' : 'text-xl font-bold'}>{item.common}</h2>
                  <em className={isMobile ? 'text-[10px] italic opacity-80' : 'text-sm italic opacity-80'}>{item.binomial}</em>
                  {!isMobile && (
                    <p className="text-xs mt-2 opacity-60 font-mono uppercase tracking-widest">{item.photo.by}</p>
                  )}
                </div>
              </div>
            );

            return (
              <div
                key={item.photo.url}
                role="group"
                aria-label={item.common}
                className="absolute"
                style={{
                  width: cardW,
                  height: cardH,
                  transform: `rotateY(${itemAngle}deg) translateZ(${effectiveRadius}px)`,
                  left: '50%',
                  top: '50%',
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  opacity,
                  transition: 'opacity 0.3s linear',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {item.href ? (
                  <Link href={item.href} className="block w-full h-full">{cardInner}</Link>
                ) : cardInner}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

CircularGallery.displayName = 'CircularGallery';

export { CircularGallery };
