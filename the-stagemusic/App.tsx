
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Library from './components/Library';
import Stage from './components/Stage';
import Profile from './components/Profile';

export enum View {
  LIBRARY = 'library',
  STAGE = 'stage',
  PROFILE = 'profile'
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: string;
  isFavorite: boolean;
  file?: File;
  coverUrl: string;
  accentColor?: string; // Color base for visuals
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LIBRARY);
  const [isShuffle, setIsShuffle] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', title: 'Neon Highway', artist: 'CyberSynth', bpm: '128', isFavorite: false, coverUrl: 'https://picsum.photos/seed/track1/400/400', accentColor: '#0d33f2' },
    { id: '2', title: 'Deep Dive', artist: 'Ocean Sounds', bpm: '90', isFavorite: false, coverUrl: 'https://picsum.photos/seed/track2/400/400', accentColor: '#00ffcc' },
    { id: '3', title: 'System Shock', artist: 'GlitchMob', bpm: '140', isFavorite: false, coverUrl: 'https://picsum.photos/seed/track3/400/400', accentColor: '#ff0055' }
  ]);
  
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const activeTrack = tracks.find(t => t.id === activeTrackId) || null;

  const initAudioEngine = useCallback(() => {
    if (!audioContextRef.current && audioRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 2048;
      analyzer.smoothingTimeConstant = 0.85;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyzer);
      analyzer.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      analyzerRef.current = analyzer;
      sourceRef.current = source;
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const handleTrackSelect = useCallback((trackId: string) => {
    initAudioEngine();
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    if (activeTrackId !== trackId) {
      setActiveTrackId(trackId);
      if (audioRef.current) {
        const url = track.file ? URL.createObjectURL(track.file) : ''; 
        if (url) audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
    setCurrentView(View.STAGE);
  }, [activeTrackId, tracks, initAudioEngine]);

  const handleAddTrack = useCallback((file: File) => {
    const colors = ['#0d33f2', '#ff0055', '#00ffcc', '#ffcc00', '#9d00ff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newTrack: Track = {
      id: Math.random().toString(36).substr(2, 9),
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: 'Local Upload',
      bpm: (Math.floor(Math.random() * 60) + 80).toString(),
      isFavorite: false,
      file: file,
      coverUrl: `https://picsum.photos/seed/${file.name}/400/400`,
      accentColor: randomColor
    };
    setTracks(prev => [newTrack, ...prev]);
    handleTrackSelect(newTrack.id);
  }, [handleTrackSelect]);

  const togglePlay = useCallback(() => {
    initAudioEngine();
    if (!audioRef.current || !activeTrackId) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, activeTrackId, initAudioEngine]);

  const handleNext = useCallback(() => {
    if (!activeTrackId || tracks.length === 0) return;
    
    let nextTrackId: string;
    if (isShuffle) {
      const otherTracks = tracks.filter(t => t.id !== activeTrackId);
      if (otherTracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherTracks.length);
        nextTrackId = otherTracks[randomIndex].id;
      } else {
        nextTrackId = activeTrackId;
      }
    } else {
      const currentIndex = tracks.findIndex(t => t.id === activeTrackId);
      const nextIndex = (currentIndex + 1) % tracks.length;
      nextTrackId = tracks[nextIndex].id;
    }
    
    handleTrackSelect(nextTrackId);
  }, [activeTrackId, tracks, handleTrackSelect, isShuffle]);

  const handlePrevious = useCallback(() => {
    if (!activeTrackId || tracks.length === 0) return;

    // If song is more than 3 seconds in, just restart it
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevTrackId: string;
    if (isShuffle) {
      const otherTracks = tracks.filter(t => t.id !== activeTrackId);
      if (otherTracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherTracks.length);
        prevTrackId = otherTracks[randomIndex].id;
      } else {
        prevTrackId = activeTrackId;
      }
    } else {
      const currentIndex = tracks.findIndex(t => t.id === activeTrackId);
      const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
      prevTrackId = tracks[prevIndex].id;
    }
    
    handleTrackSelect(prevTrackId);
  }, [activeTrackId, tracks, handleTrackSelect, isShuffle]);

  const toggleFavorite = useCallback((id: string) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
  }, []);

  const handleNavigate = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  return (
    <div className="h-screen w-full relative bg-[#020412] text-white overflow-hidden">
      <audio 
        ref={audioRef} 
        onEnded={handleNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {currentView === View.LIBRARY && (
        <Library 
          tracks={tracks}
          activeTrack={activeTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isShuffle={isShuffle}
          onFileSelect={handleAddTrack} 
          onNavigate={handleNavigate}
          onTrackSelect={handleTrackSelect}
          onTogglePlay={togglePlay}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onUpdateTracks={setTracks}
          onToggleShuffle={toggleShuffle}
        />
      )}
      {currentView === View.STAGE && (
        <Stage 
          activeTrack={activeTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isShuffle={isShuffle}
          analyzer={analyzerRef.current}
          onBack={() => handleNavigate(View.LIBRARY)} 
          onTogglePlay={togglePlay}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSeek={handleSeek}
          onToggleFavorite={() => activeTrack && toggleFavorite(activeTrack.id)}
          onToggleShuffle={toggleShuffle}
        />
      )}
      {currentView === View.PROFILE && (
        <Profile 
          onBack={() => handleNavigate(View.LIBRARY)} 
        />
      )}
    </div>
  );
};

export default App;
