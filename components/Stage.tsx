
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Track } from '../App';

interface StageProps {
  activeTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  analyzer: AnalyserNode | null;
  onBack: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onToggleFavorite: () => void;
  onToggleShuffle: () => void;
}

const Stage: React.FC<StageProps> = ({ 
  activeTrack, 
  isPlaying, 
  currentTime,
  duration,
  isShuffle,
  analyzer, 
  onBack, 
  onTogglePlay, 
  onNext, 
  onPrevious,
  onSeek,
  onToggleFavorite,
  onToggleShuffle
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [fps, setFps] = useState(0);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyzer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Get track accent color or fallback
    const trackColor = activeTrack?.accentColor || '#0d33f2';
    
    // Convert hex to HSL for dynamic adjustments
    const hexToHsl = (hex: string) => {
      let r = parseInt(hex.slice(1, 3), 16) / 255;
      let g = parseInt(hex.slice(3, 5), 16) / 255;
      let b = parseInt(hex.slice(5, 7), 16) / 255;
      let max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: h * 360, s: s * 100, l: l * 100 };
    };
    
    const baseHsl = hexToHsl(trackColor);

    let lastTime = performance.now();
    let frameCount = 0;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      analyzer.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // We only use the first half of the frequency data as the high end is usually empty
      const displayBins = bufferLength / 2;
      const barWidth = (canvas.width / displayBins) * 2;
      let barHeight;
      let x = 0;

      for (let i = 0; i < displayBins; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        // High contrast logic: 
        // We shift the hue based on frequency but keep saturation high.
        // We increase lightness for active frequencies to make them glow against the dark background.
        const hueShift = (i / displayBins) * 120 - 60; 
        const currentHue = (baseHsl.h + hueShift + 360) % 360;
        
        // Ensure contrast by making active bars very bright (high lightness)
        const currentLightness = Math.max(50, baseHsl.l + 10) + (dataArray[i] / 255) * 30;
        
        ctx.fillStyle = `hsl(${currentHue}, 90%, ${currentLightness}%)`;
        
        // Rounded bars for better aesthetics
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, [radius, radius, 0, 0]);
        ctx.fill();

        if (dataArray[i] > 180) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = `hsla(${currentHue}, 90%, 60%, 0.8)`;
        } else {
            ctx.shadowBlur = 0;
        }

        x += barWidth;
        if (x > canvas.width) break;
      }
    };

    draw();
  }, [analyzer, activeTrack]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight * 0.55;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    render();
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [render]);

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * duration);
  };

  return (
    <div className="relative h-screen w-full flex flex-col justify-between select-none transition-all duration-1000 overflow-hidden">
      {/* Dynamic Background with Track Cover */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#020412]">
          {/* Main cover background with heavy blur for atmosphere */}
          <img 
            className="w-full h-full object-cover opacity-40 blur-3xl scale-110 transition-opacity duration-1000" 
            src={activeTrack?.coverUrl || 'https://picsum.photos/seed/nebula/1200/800'} 
            alt="" 
          />
          {/* Sharp but dark cover background */}
          <img 
            className="absolute inset-0 w-full h-full object-cover opacity-20 transition-opacity duration-1000 mix-blend-overlay" 
            src={activeTrack?.coverUrl || 'https://picsum.photos/seed/nebula/1200/800'} 
            alt="" 
          />
        </div>
        
        {/* Color Tint Overlay for Contrast */}
        <div 
          className="absolute inset-0 opacity-30 transition-colors duration-1000" 
          style={{ background: `radial-gradient(circle at center, ${activeTrack?.accentColor || '#0d33f2'}66 0%, transparent 80%)` }}
        ></div>
        
        {/* Darkening Gradients to pop the foreground bars and text */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020412] via-transparent to-[#020412]/80"></div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <header className="relative z-10 flex items-center justify-between w-full px-6 pt-12 pb-8">
        <button onClick={onBack} className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-white/60 text-[10px] tracking-[0.4em] uppercase font-bold mb-1">Now Playing</h2>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: activeTrack?.accentColor }}></span>
            <span className="text-white text-xs font-bold tracking-widest uppercase">The Stage</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2 text-[10px] font-bold tracking-wider" style={{color: activeTrack?.accentColor || '#0d33f2'}}>
            <span className="material-symbols-outlined text-[12px] animate-spin-slow">refresh</span>
            <span>{fps} FPS</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center relative z-10 overflow-hidden pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
      </div>

      <footer className="relative z-20 w-full px-4 pb-10">
        <div className="bg-[#0a0b14]/70 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6">
          
          {/* Progress Section */}
          <div className="space-y-3">
            <div 
              className="relative w-full h-2 bg-white/5 rounded-full cursor-pointer group overflow-hidden"
              onClick={handleProgressBarClick}
            >
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%`, backgroundColor: activeTrack?.accentColor || '#0d33f2', boxShadow: `0 0 15px ${activeTrack?.accentColor}` }}
              >
              </div>
              {/* Interaction visual for the progress bar */}
              <div 
                className="absolute top-0 left-0 h-full bg-white/20 transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center gap-6">
            <div className="flex items-center gap-5 flex-1 min-w-0">
               <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
                 <img src={activeTrack?.coverUrl} className="w-full h-full object-cover" alt="" />
                 {isPlaying && (
                   <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="flex gap-0.5 items-end h-4">
                        <div className="w-0.5 bg-white animate-pulse h-full"></div>
                        <div className="w-0.5 bg-white animate-pulse h-2 delay-75"></div>
                        <div className="w-0.5 bg-white animate-pulse h-3 delay-150"></div>
                      </div>
                   </div>
                 )}
               </div>
               <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="text-white text-2xl font-bold leading-tight truncate">{activeTrack?.title || 'No Track Selected'}</h3>
                  <p className="text-xs font-bold tracking-[0.2em] uppercase opacity-80" style={{color: activeTrack?.accentColor || '#0d33f2'}}>{activeTrack?.artist || 'Unknown Artist'}</p>
               </div>
            </div>
            <div className="flex items-center gap-5">
               <button 
                  onClick={onToggleShuffle}
                  className={`transition-all duration-300 ${isShuffle ? 'text-white scale-110 drop-shadow-[0_0_8px_white]' : 'text-white/20 hover:text-white/40'}`}
                >
                  <span className="material-symbols-outlined text-2xl">shuffle</span>
                </button>
              <button 
                onClick={onToggleFavorite}
                className={`transition-all duration-300 active:scale-125 ${activeTrack?.isFavorite ? 'text-red-500 fill' : 'text-white/20 hover:text-white/40'}`}
              >
                <span className={`material-symbols-outlined text-2xl ${activeTrack?.isFavorite ? 'fill' : ''}`}>favorite</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-10 pt-2">
            <button 
              onClick={onPrevious} 
              className="text-white/40 hover:text-white transition-all active:scale-75"
            >
              <span className="material-symbols-outlined text-4xl">skip_previous</span>
            </button>
            
            <button onClick={onTogglePlay} className="relative group active:scale-95 transition-transform">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" style={{backgroundColor: activeTrack?.accentColor || '#0d33f2'}}></div>
              <div className="relative text-white w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/5" style={{backgroundColor: activeTrack?.accentColor || '#0d33f2'}}>
                <span className="material-symbols-outlined text-6xl fill">{isPlaying ? 'pause' : 'play_arrow'}</span>
              </div>
            </button>
            
            <button 
              onClick={onNext} 
              className="text-white/40 hover:text-white transition-all active:scale-75"
            >
              <span className="material-symbols-outlined text-4xl">skip_next</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Stage;
