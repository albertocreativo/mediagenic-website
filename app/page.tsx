import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";
import InfiniteGallery from "@/components/ui/3d-gallery-photography";

export const dynamic = "force-dynamic";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".ogg"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function loadGalleryItems() {
  const agDir = path.join(process.cwd(), "public", "ag");
  let files: string[];
  try {
    files = fs.readdirSync(agDir);
  } catch {
    return [];
  }

  const items = files
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return VIDEO_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext);
    })
    .sort(() => Math.random() - 0.5)
    .map((file) => {
      const ext = path.extname(file).toLowerCase();
      const src = `/ag/${file}`;
      const alt = path.basename(file, ext);
      if (VIDEO_EXTENSIONS.has(ext)) {
        return { src, alt, type: "video" as const };
      }
      return { src, alt };
    });

  // Place a video at index 4 — this aligns with the first fully-visible plane
  // (plane 4 has z≈16.7 which is closest to the camera and at full opacity on load)
  const LEAD_INDEX = 4;
  const firstVideoIdx = items.findIndex((item) => "type" in item && item.type === "video");
  if (firstVideoIdx >= 0 && firstVideoIdx !== LEAD_INDEX) {
    const [video] = items.splice(firstVideoIdx, 1);
    items.splice(Math.min(LEAD_INDEX, items.length), 0, video);
  }

  return items;
}

export default function Home() {
  const galleryItems = loadGalleryItems();

  return (
    <main className="min-h-screen w-full bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-4 md:py-5 border-t-2 border-[#3f4cf6]">
        <div className="pointer-events-auto">
          <Image src="/logo.png" alt="Mediagenic Logo" width={220} height={70} className="object-contain w-[130px] md:w-[220px] h-auto" />
        </div>
        <div className="flex items-center gap-4 md:gap-10 font-mono uppercase font-semibold tracking-widest">
          <Link
            href="/work"
            className="text-white/70 hover:text-white transition-colors duration-200 relative group text-xs md:text-sm min-h-[44px] flex items-center"
          >
            Work
            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#3f4cf6] group-hover:w-full transition-all duration-300" />
          </Link>
          <Link
            href="/contact"
            className="min-h-[44px] px-3 md:px-5 flex items-center border border-[#3f4cf6] text-white/90 hover:bg-[#3f4cf6] hover:text-white transition-all duration-200 text-xs md:text-sm font-mono uppercase tracking-widest"
          >
            Contact
          </Link>
        </div>
      </nav>

      {/* Gallery */}
      <InfiniteGallery
        images={galleryItems}
        speed={2.0}
        zSpacing={3}
        visibleCount={12}
        falloff={{ near: 0.8, far: 14 }}
        className="h-screen w-full rounded-lg overflow-hidden"
      />

      {/* Hero text */}
      <div className="h-screen inset-0 pointer-events-none fixed flex items-center justify-center text-center px-3 mix-blend-exclusion text-white">
        <h1 className="font-serif text-[clamp(1.6rem,8vw,4.5rem)] tracking-tight">
          <span className="italic">I create;</span> therefore I am
        </h1>
      </div>

      {/* Scroll indicator */}
      <div className="text-center fixed bottom-10 left-0 right-0 pointer-events-none flex flex-col items-center gap-2">
        <div className="w-[2px] h-12 bg-gradient-to-b from-[#3f4cf6] to-transparent" />
        <p className="font-mono uppercase text-[11px] font-semibold text-[#f2eeff]">
          Scroll to explore
        </p>
      </div>
    </main>
  );
}
