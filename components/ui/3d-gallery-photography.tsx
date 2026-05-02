'use client';

import type React from 'react';
import { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

type ImageItem = string | { src: string; alt?: string; type?: 'image' | 'video' };

function isVideoSrc(src: string): boolean {
	return /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(src);
}

interface FadeSettings {
	/** Fade in range as percentage of depth range (0-1) */
	fadeIn: {
		start: number;
		end: number;
	};
	/** Fade out range as percentage of depth range (0-1) */
	fadeOut: {
		start: number;
		end: number;
	};
}

interface BlurSettings {
	/** Blur in range as percentage of depth range (0-1) */
	blurIn: {
		start: number;
		end: number;
	};
	/** Blur out range as percentage of depth range (0-1) */
	blurOut: {
		start: number;
		end: number;
	};
	/** Maximum blur amount (0-10, higher values = more blur) */
	maxBlur: number;
}

interface InfiniteGalleryProps {
	images: ImageItem[];
	/** Speed multiplier applied to scroll delta (default: 1) */
	speed?: number;
	/** Spacing between images along Z in world units (default: 2.5) */
	zSpacing?: number;
	/** Number of visible planes (default: clamp to images.length, min 8) */
	visibleCount?: number;
	/** Near/far distances for opacity/blur easing (default: { near: 0.5, far: 12 }) */
	falloff?: { near: number; far: number };
	/** Fade in/out settings with ranges based on depth range percentage (default: { fadeIn: { start: 0.05, end: 0.15 }, fadeOut: { start: 0.85, end: 0.95 } }) */
	fadeSettings?: FadeSettings;
	/** Blur in/out settings with ranges based on depth range percentage (default: { blurIn: { start: 0.0, end: 0.1 }, blurOut: { start: 0.9, end: 1.0 }, maxBlur: 3.0 }) */
	blurSettings?: BlurSettings;
	/** Optional className for outer container */
	className?: string;
	/** Optional style for outer container */
	style?: React.CSSProperties;
}

interface PlaneData {
	index: number;
	z: number;
	imageIndex: number;
	x: number;
	y: number;
}

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;

// Custom shader material for blur, opacity, and cloth folding effects
const createClothMaterial = () => {
	return new THREE.ShaderMaterial({
		transparent: true,
		uniforms: {
			map: { value: null },
			opacity: { value: 1.0 },
			blurAmount: { value: 0.0 },
			scrollForce: { value: 0.0 },
			time: { value: 0.0 },
			isHovered: { value: 0.0 },
		},
		vertexShader: `
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vNormal = normal;

        vec3 pos = position;

        // Create smooth curving based on scroll force
        float curveIntensity = scrollForce * 0.3;

        // Base curve across the plane based on distance from center
        float distanceFromCenter = length(pos.xy);
        float curve = distanceFromCenter * distanceFromCenter * curveIntensity;

        // Add gentle cloth-like ripples
        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float clothEffect = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;

        // Flag waving effect when hovered
        float flagWave = 0.0;
        if (isHovered > 0.5) {
          // Create flag-like wave from left to right
          float wavePhase = pos.x * 3.0 + time * 8.0;
          float waveAmplitude = sin(wavePhase) * 0.1;
          // Damping effect - stronger wave on the right side (free edge)
          float dampening = smoothstep(-0.5, 0.5, pos.x);
          flagWave = waveAmplitude * dampening;

          // Add secondary smaller waves for more realistic flag motion
          float secondaryWave = sin(pos.x * 5.0 + time * 12.0) * 0.03 * dampening;
          flagWave += secondaryWave;
        }

        // Apply Z displacement for curving effect (inverted) with cloth ripples and flag wave
        pos.z -= (curve + clothEffect + flagWave);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
		fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vec4 color = texture2D(map, vUv);

        // Simple blur approximation
        if (blurAmount > 0.0) {
          vec2 texelSize = 1.0 / vec2(textureSize(map, 0));
          vec4 blurred = vec4(0.0);
          float total = 0.0;

          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurAmount;
              float weight = 1.0 / (1.0 + length(vec2(x, y)));
              blurred += texture2D(map, vUv + offset) * weight;
              total += weight;
            }
          }
          color = blurred / total;
        }

        // Add subtle lighting effect based on curving
        float curveHighlight = abs(scrollForce) * 0.05;
        color.rgb += vec3(curveHighlight * 0.1);

        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
	});
};

function ImagePlane({
	texture,
	position,
	scale,
	material,
}: {
	texture: THREE.Texture;
	position: [number, number, number];
	scale: [number, number, number];
	material: THREE.ShaderMaterial;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const [isHovered, setIsHovered] = useState(false);

	useEffect(() => {
		if (material && texture) {
			material.uniforms.map.value = texture;
		}
	}, [material, texture]);

	useEffect(() => {
		if (material && material.uniforms) {
			material.uniforms.isHovered.value = isHovered ? 1.0 : 0.0;
		}
	}, [material, isHovered]);

	return (
		<mesh
			ref={meshRef}
			position={position}
			scale={scale}
			material={material}
			onPointerEnter={() => setIsHovered(true)}
			onPointerLeave={() => setIsHovered(false)}
		>
			<planeGeometry args={[1, 1, 32, 32]} />
		</mesh>
	);
}

function GalleryScene({
	images,
	speed = 1,
	visibleCount = 8,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.15 },
		fadeOut: { start: 0.85, end: 0.95 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.9, end: 1.0 },
		maxBlur: 3.0,
	},
}: Omit<InfiniteGalleryProps, 'className' | 'style'>) {
	const [scrollVelocity, setScrollVelocity] = useState(0);
	const [autoPlay, setAutoPlay] = useState(true);
	const lastInteraction = useRef(Date.now());

	// Normalize images to objects
	const normalizedImages = useMemo(
		() =>
			images.map((img) =>
				typeof img === 'string' ? { src: img, alt: '' } : img
			),
		[images]
	);

	// Separate image and video sources
	const imageSrcs = useMemo(
		() => normalizedImages.filter((img) => {
			const t = (img as { type?: string }).type;
			return t === 'image' || (!t && !isVideoSrc(img.src));
		}).map((img) => img.src),
		[normalizedImages]
	);

	const videoItems = useMemo(
		() => normalizedImages.filter((img) => {
			const t = (img as { type?: string }).type;
			return t === 'video' || (!t && isVideoSrc(img.src));
		}),
		[normalizedImages]
	);

	// Load image textures via useTexture
	const imageTextures = useTexture(imageSrcs.length > 0 ? imageSrcs : ['/placeholder.svg']);

	// CanvasTexture approach: draw video frames manually each frame — works on all platforms
	// (bypasses THREE.VideoTexture's requestVideoFrameCallback which mobile browsers don't
	// fire for hidden/off-screen elements)
	const [videoTextures, setVideoTextures] = useState<THREE.CanvasTexture[]>([]);
	const videoElementsRef = useRef<HTMLVideoElement[]>([]);
	const videoCanvasesRef = useRef<HTMLCanvasElement[]>([]);
	const videoAspectRatios = useRef<number[]>([]);

	const videoSrcKey = videoItems.map((v) => v.src).join(',');

	useEffect(() => {
		videoElementsRef.current.forEach((v) => v.pause());
		videoElementsRef.current = [];
		videoCanvasesRef.current = [];
		videoAspectRatios.current = [];

		const newTextures: THREE.CanvasTexture[] = [];

		videoItems.forEach((item, i) => {
			const video = document.createElement('video');
			video.src = item.src;
			video.autoplay = true;
			video.loop = true;
			video.muted = true;
			video.playsInline = true;
			video.crossOrigin = 'anonymous';
			// Keep in DOM so mobile browsers buffer and decode frames
			Object.assign(video.style, {
				position: 'fixed',
				top: '-9999px',
				left: '-9999px',
				width: '1px',
				height: '1px',
				opacity: '0',
				pointerEvents: 'none',
			});
			document.body.appendChild(video);

			const offscreen = document.createElement('canvas');
			offscreen.width = 1280;
			offscreen.height = 720;

			video.addEventListener('loadedmetadata', () => {
				const ratio = video.videoWidth / video.videoHeight || 16 / 9;
				videoAspectRatios.current[i] = ratio;
				offscreen.width = video.videoWidth || 1280;
				offscreen.height = video.videoHeight || 720;
			});

			video.play().catch(() => {
				// Retry on first user interaction (fallback for strict autoplay policies)
				const retry = () => { video.play().catch(() => {}); };
				document.addEventListener('touchstart', retry, { once: true });
				document.addEventListener('click', retry, { once: true });
			});

			const tex = new THREE.CanvasTexture(offscreen);
			tex.minFilter = THREE.LinearFilter;
			tex.magFilter = THREE.LinearFilter;

			videoElementsRef.current[i] = video;
			videoCanvasesRef.current[i] = offscreen;
			videoAspectRatios.current[i] = 16 / 9;
			newTextures.push(tex);
		});

		setVideoTextures(newTextures);

		return () => {
			videoElementsRef.current.forEach((v) => {
				v.pause();
				v.remove();
			});
			newTextures.forEach((t) => t.dispose());
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [videoSrcKey]);

	// Build unified texture array in original item order
	const allTextures = useMemo(() => {
		const result: (THREE.Texture | THREE.CanvasTexture | null)[] = [];
		let imgIdx = 0;
		let vidIdx = 0;
		normalizedImages.forEach((item) => {
			const t = (item as { type?: string }).type;
			if (t === 'video' || (!t && isVideoSrc(item.src))) {
				// null until useEffect fires and videoTextures state is set
				result.push(videoTextures[vidIdx] ?? null);
				vidIdx++;
			} else {
				result.push(imageTextures[imgIdx] ?? null);
				imgIdx++;
			}
		});
		return result;
	}, [imageTextures, normalizedImages, videoTextures]);

	// Create materials pool
	const materials = useMemo(
		() => Array.from({ length: visibleCount }, () => createClothMaterial()),
		[visibleCount]
	);

	const spatialPositions = useMemo(() => {
		const positions: { x: number; y: number }[] = [];
		const maxHorizontalOffset = MAX_HORIZONTAL_OFFSET;
		const maxVerticalOffset = MAX_VERTICAL_OFFSET;

		for (let i = 0; i < visibleCount; i++) {
			const horizontalAngle = (i * 2.618) % (Math.PI * 2);
			const verticalAngle = (i * 1.618 + Math.PI / 3) % (Math.PI * 2);

			const horizontalRadius = (i % 3) * 1.2;
			const verticalRadius = ((i + 1) % 4) * 0.8;

			const x =
				(Math.sin(horizontalAngle) * horizontalRadius * maxHorizontalOffset) /
				3;
			const y =
				(Math.cos(verticalAngle) * verticalRadius * maxVerticalOffset) / 4;

			positions.push({ x, y });
		}

		return positions;
	}, [visibleCount]);

	const totalImages = normalizedImages.length;
	const depthRange = DEFAULT_DEPTH_RANGE;

	const planesData = useRef<PlaneData[]>(
		Array.from({ length: visibleCount }, (_, i) => ({
			index: i,
			z: visibleCount > 0 ? ((depthRange / visibleCount) * i) % depthRange : 0,
			imageIndex: totalImages > 0 ? i % totalImages : 0,
			x: spatialPositions[i]?.x ?? 0,
			y: spatialPositions[i]?.y ?? 0,
		}))
	);

	useEffect(() => {
		planesData.current = Array.from({ length: visibleCount }, (_, i) => ({
			index: i,
			z:
				visibleCount > 0
					? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange
					: 0,
			imageIndex: totalImages > 0 ? i % totalImages : 0,
			x: spatialPositions[i]?.x ?? 0,
			y: spatialPositions[i]?.y ?? 0,
		}));
	}, [depthRange, spatialPositions, totalImages, visibleCount]);

	const touchStartY = useRef<number | null>(null);

	const handleWheel = useCallback(
		(event: WheelEvent) => {
			event.preventDefault();
			setScrollVelocity((prev) => prev + event.deltaY * 0.01 * speed);
			setAutoPlay(false);
			lastInteraction.current = Date.now();
		},
		[speed]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
				setScrollVelocity((prev) => prev - 2 * speed);
				setAutoPlay(false);
				lastInteraction.current = Date.now();
			} else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
				setScrollVelocity((prev) => prev + 2 * speed);
				setAutoPlay(false);
				lastInteraction.current = Date.now();
			}
		},
		[speed]
	);

	const handleTouchStart = useCallback((event: TouchEvent) => {
		touchStartY.current = event.touches[0].clientY;
	}, []);

	const handleTouchMove = useCallback(
		(event: TouchEvent) => {
			event.preventDefault();
			if (touchStartY.current === null) return;
			const deltaY = touchStartY.current - event.touches[0].clientY;
			touchStartY.current = event.touches[0].clientY;
			setScrollVelocity((prev) => prev + deltaY * 0.03 * speed);
			setAutoPlay(false);
			lastInteraction.current = Date.now();
		},
		[speed]
	);

	const handleTouchEnd = useCallback(() => {
		touchStartY.current = null;
	}, []);

	useEffect(() => {
		const canvas = document.querySelector('canvas');
		if (canvas) {
			canvas.addEventListener('wheel', handleWheel, { passive: false });
			canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
			canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
			canvas.addEventListener('touchend', handleTouchEnd);
			document.addEventListener('keydown', handleKeyDown);

			return () => {
				canvas.removeEventListener('wheel', handleWheel);
				canvas.removeEventListener('touchstart', handleTouchStart);
				canvas.removeEventListener('touchmove', handleTouchMove);
				canvas.removeEventListener('touchend', handleTouchEnd);
				document.removeEventListener('keydown', handleKeyDown);
			};
		}
	}, [handleWheel, handleKeyDown, handleTouchStart, handleTouchMove, handleTouchEnd]);

	useEffect(() => {
		const interval = setInterval(() => {
			if (Date.now() - lastInteraction.current > 3000) {
				setAutoPlay(true);
			}
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	useFrame((state, delta) => {
		// Draw current video frame into each offscreen canvas, then mark texture dirty.
		// This works on all platforms — no dependency on requestVideoFrameCallback.
		videoElementsRef.current.forEach((video, i) => {
			if (video.readyState >= video.HAVE_CURRENT_DATA) {
				const canvas = videoCanvasesRef.current[i];
				const ctx = canvas?.getContext('2d');
				if (ctx) {
					ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
					if (videoTextures[i]) videoTextures[i].needsUpdate = true;
				}
			}
		});

		if (autoPlay) {
			setScrollVelocity((prev) => prev + 0.3 * delta);
		}

		setScrollVelocity((prev) => prev * 0.95);

		const time = state.clock.getElapsedTime();
		materials.forEach((material) => {
			if (material && material.uniforms) {
				material.uniforms.time.value = time;
				material.uniforms.scrollForce.value = scrollVelocity;
			}
		});

		const imageAdvance =
			totalImages > 0 ? visibleCount % totalImages || totalImages : 0;
		const totalRange = depthRange;
		const halfRange = totalRange / 2;

		planesData.current.forEach((plane, i) => {
			let newZ = plane.z + scrollVelocity * delta * 10;
			let wrapsForward = 0;
			let wrapsBackward = 0;

			if (newZ >= totalRange) {
				wrapsForward = Math.floor(newZ / totalRange);
				newZ -= totalRange * wrapsForward;
			} else if (newZ < 0) {
				wrapsBackward = Math.ceil(-newZ / totalRange);
				newZ += totalRange * wrapsBackward;
			}

			if (wrapsForward > 0 && imageAdvance > 0 && totalImages > 0) {
				plane.imageIndex =
					(plane.imageIndex + wrapsForward * imageAdvance) % totalImages;
			}

			if (wrapsBackward > 0 && imageAdvance > 0 && totalImages > 0) {
				const step = plane.imageIndex - wrapsBackward * imageAdvance;
				plane.imageIndex = ((step % totalImages) + totalImages) % totalImages;
			}

			plane.z = ((newZ % totalRange) + totalRange) % totalRange;
			plane.x = spatialPositions[i]?.x ?? 0;
			plane.y = spatialPositions[i]?.y ?? 0;

			const normalizedPosition = plane.z / totalRange;
			let opacity = 1;

			if (
				normalizedPosition >= fadeSettings.fadeIn.start &&
				normalizedPosition <= fadeSettings.fadeIn.end
			) {
				const fadeInProgress =
					(normalizedPosition - fadeSettings.fadeIn.start) /
					(fadeSettings.fadeIn.end - fadeSettings.fadeIn.start);
				opacity = fadeInProgress;
			} else if (normalizedPosition < fadeSettings.fadeIn.start) {
				opacity = 0;
			} else if (
				normalizedPosition >= fadeSettings.fadeOut.start &&
				normalizedPosition <= fadeSettings.fadeOut.end
			) {
				const fadeOutProgress =
					(normalizedPosition - fadeSettings.fadeOut.start) /
					(fadeSettings.fadeOut.end - fadeSettings.fadeOut.start);
				opacity = 1 - fadeOutProgress;
			} else if (normalizedPosition > fadeSettings.fadeOut.end) {
				opacity = 0;
			}

			opacity = Math.max(0, Math.min(1, opacity));

			let blur = 0;

			if (
				normalizedPosition >= blurSettings.blurIn.start &&
				normalizedPosition <= blurSettings.blurIn.end
			) {
				const blurInProgress =
					(normalizedPosition - blurSettings.blurIn.start) /
					(blurSettings.blurIn.end - blurSettings.blurIn.start);
				blur = blurSettings.maxBlur * (1 - blurInProgress);
			} else if (normalizedPosition < blurSettings.blurIn.start) {
				blur = blurSettings.maxBlur;
			} else if (
				normalizedPosition >= blurSettings.blurOut.start &&
				normalizedPosition <= blurSettings.blurOut.end
			) {
				const blurOutProgress =
					(normalizedPosition - blurSettings.blurOut.start) /
					(blurSettings.blurOut.end - blurSettings.blurOut.start);
				blur = blurSettings.maxBlur * blurOutProgress;
			} else if (normalizedPosition > blurSettings.blurOut.end) {
				blur = blurSettings.maxBlur;
			}

			blur = Math.max(0, Math.min(blurSettings.maxBlur, blur));

			const material = materials[i];
			if (material && material.uniforms) {
				material.uniforms.opacity.value = opacity;
				material.uniforms.blurAmount.value = blur;
			}
		});
	});

	if (normalizedImages.length === 0) return null;

	return (
		<>
			{planesData.current.map((plane, i) => {
				const texture = allTextures[plane.imageIndex];
				const material = materials[i];

				if (!texture || !material) return null;

				const worldZ = plane.z - depthRange / 2;

				// For video textures use stored aspect ratio; for images use image dimensions
				let aspect = 1;
				if (texture instanceof THREE.CanvasTexture) {
					const item = normalizedImages[plane.imageIndex];
					const vidSrc = typeof item === 'string' ? item : item.src;
					const vidIdx = videoItems.findIndex((v) => v.src === vidSrc);
					aspect = videoAspectRatios.current[vidIdx] ?? 16 / 9;
				} else {
					const img = (texture as THREE.Texture).image as { width?: number; height?: number } | null;
					aspect = img && img.width && img.height ? img.width / img.height : 1;
				}
				const scale: [number, number, number] =
					aspect > 1 ? [2 * aspect, 2, 1] : [2, 2 / aspect, 1];

				return (
					<ImagePlane
						key={plane.index}
						texture={texture}
						position={[plane.x, plane.y, worldZ]}
						scale={scale}
						material={material}
					/>
				);
			})}
		</>
	);
}

function FallbackGallery({ images }: { images: ImageItem[] }) {
	const normalizedImages = useMemo(
		() =>
			images.map((img) =>
				typeof img === 'string' ? { src: img, alt: '' } : img
			),
		[images]
	);

	return (
		<div className="flex flex-col items-center justify-center h-full bg-gray-100 p-4">
			<p className="text-gray-600 mb-4">
				WebGL not supported. Showing image list:
			</p>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
				{normalizedImages.map((img, i) => (
					<img
						key={i}
						src={img.src || '/placeholder.svg'}
						alt={img.alt}
						className="w-full h-32 object-cover rounded"
					/>
				))}
			</div>
		</div>
	);
}

export default function InfiniteGallery({
	images,
	className = 'h-96 w-full',
	style,
	fadeSettings = {
		fadeIn: { start: 0.05, end: 0.25 },
		fadeOut: { start: 0.4, end: 0.43 },
	},
	blurSettings = {
		blurIn: { start: 0.0, end: 0.1 },
		blurOut: { start: 0.4, end: 0.43 },
		maxBlur: 8.0,
	},
}: InfiniteGalleryProps) {
	const [webglSupported, setWebglSupported] = useState(true);

	useEffect(() => {
		try {
			const canvas = document.createElement('canvas');
			const gl =
				canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
			if (!gl) {
				setWebglSupported(false);
			}
		} catch (e) {
			setWebglSupported(false);
		}
	}, []);

	if (!webglSupported) {
		return (
			<div className={className} style={style}>
				<FallbackGallery images={images} />
			</div>
		);
	}

	return (
		<div className={className} style={style}>
			<Canvas
				camera={{ position: [0, 0, 0], fov: 55 }}
				gl={{ antialias: true, alpha: true }}
			>
					<GalleryScene
					images={images}
					fadeSettings={fadeSettings}
					blurSettings={blurSettings}
				/>
			</Canvas>
		</div>
	);
}
