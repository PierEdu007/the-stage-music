
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Library from './components/Library';
import Stage from './components/Stage';
import Profile from './components/Profile';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

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
  coverUrl: string;
  audioUrl?: string;
  storagePath?: string;
  accentColor?: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LIBRARY);
  const [isShuffle, setIsShuffle] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isVisualizerEnabled, setIsVisualizerEnabled] = useState(true);

  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const activeTrack = tracks.find(t => t.id === activeTrackId) || null;

  useEffect(() => {
    // Check if variables are missing
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setConfigError('Supabase environment variables are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment.');
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchTracks();
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchTracks();
      else {
        setTracks([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTracks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracks:', error);
      } else if (data) {
        const mappedTracks: Track[] = data.map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          bpm: t.bpm,
          isFavorite: t.is_favorite,
          coverUrl: t.cover_url,
          audioUrl: t.audio_url,
          storagePath: t.storage_path,
          accentColor: t.accent_color
        }));
        setTracks(mappedTracks);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
    setIsLoading(false);
  };

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

  const handleTrackSelect = useCallback(async (trackId: string) => {
    initAudioEngine();
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    if (activeTrackId !== trackId) {
      setActiveTrackId(trackId);
      if (audioRef.current) {
        if (track.audioUrl) {
          audioRef.current.src = track.audioUrl;
          audioRef.current.play().catch(e => console.error("Playback failed:", e));
          setIsPlaying(true);

          // Increment plays in profile
          if (session?.user.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('total_plays')
              .eq('id', session.user.id)
              .single();

            await supabase
              .from('profiles')
              .update({ total_plays: (profile?.total_plays || 0) + 1 })
              .eq('id', session.user.id);
          }
        }
      }
    }
    setCurrentView(View.STAGE);
  }, [activeTrackId, tracks, initAudioEngine, session]);

  const handleAddTrack = useCallback(async (file: File) => {
    if (!session) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-tracks')
      .getPublicUrl(filePath);

    // 3. Save metadata to Database
    const colors = ['#0d33f2', '#ff0055', '#00ffcc', '#ffcc00', '#9d00ff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { data, error: dbError } = await supabase
      .from('tracks')
      .insert([
        {
          user_id: session.user.id,
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Local Upload',
          bpm: (Math.floor(Math.random() * 60) + 80).toString(),
          cover_url: `https://picsum.photos/seed/${file.name}/400/400`,
          accent_color: randomColor,
          audio_url: publicUrl,
          storage_path: filePath
        }
      ])
      .select();

    if (dbError) {
      console.error('DB error:', dbError);
    } else if (data) {
      fetchTracks();
      handleTrackSelect(data[0].id);
    }
  }, [session, handleTrackSelect]);

  const togglePlay = useCallback(() => {
    initAudioEngine();
    if (!audioRef.current || !activeTrackId) return;

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, activeTrackId, initAudioEngine]);

  const handleNext = useCallback(async () => {
    if (!activeTrackId || tracks.length === 0) return;

    // Increment playtime in profile when a track finishes
    if (session?.user.id && duration > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_playtime')
        .eq('id', session.user.id)
        .single();

      await supabase
        .from('profiles')
        .update({ total_playtime: (profile?.total_playtime || 0) + duration })
        .eq('id', session.user.id);
    }

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
  }, [activeTrackId, tracks, handleTrackSelect, isShuffle, session, duration]);

  const handlePrevious = useCallback(() => {
    if (!activeTrackId || tracks.length === 0) return;

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


  const toggleFavorite = useCallback(async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    const { error } = await supabase
      .from('tracks')
      .update({ is_favorite: !track.isFavorite })
      .eq('id', id);

    if (!error) fetchTracks();
  }, [tracks, fetchTracks]);

  const handleRenameTrack = useCallback(async (id: string, newTitle: string) => {
    const { error } = await supabase
      .from('tracks')
      .update({ title: newTitle })
      .eq('id', id);

    if (!error) fetchTracks();
  }, [fetchTracks]);

  const handleDeleteTrack = useCallback(async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    if (track.storagePath) {
      await supabase.storage.from('audio-tracks').remove([track.storagePath]);
    }

    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', id);

    if (!error) fetchTracks();
  }, [tracks, fetchTracks]);

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Force clear everything to be sure
      localStorage.clear();
      setSession(null);
      setTracks([]);
      setCurrentView(View.LIBRARY);
      window.location.reload(); // Hard reload to clear any lingering states
    } catch (e) {
      console.error('Sign out error:', e);
      // Fallback manual clear
      localStorage.clear();
      window.location.reload();
    }
  };

  if (configError) {
    return (
      <div className="h-screen w-full bg-[#020412] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-white">Error de Configuración</h1>
          <p className="text-white/60 leading-relaxed">
            {configError}
          </p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left space-y-2">
            <p className="text-[10px] font-bold text-[#0d33f2] uppercase tracking-[0.2em]">Paso a paso para solucionar:</p>
            <ol className="text-xs text-white/40 list-decimal pl-4 space-y-1">
              <li>Ve a tu panel de Netlify.</li>
              <li>Entra en <b>Site configuration &gt; Environment variables</b>.</li>
              <li>Agrega <code>VITE_SUPABASE_URL</code>.</li>
              <li>Agrega <code>VITE_SUPABASE_ANON_KEY</code>.</li>
              <li>Vuelve a desplegar el sitio.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!session && !isLoading) {
    return <Auth onSuccess={() => { }} />;
  }

  return (
    <div className="h-screen w-full relative bg-[#020412] text-white overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-[110] bg-[#020412] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/5 border-t-[#0d33f2] rounded-full animate-spin"></div>
        </div>
      )}

      <audio
        ref={audioRef}
        crossOrigin="anonymous"
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
          onDeleteTrack={handleDeleteTrack}
          onRenameTrack={handleRenameTrack}
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
          isVisualizerEnabled={isVisualizerEnabled}
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
          session={session}
          onAuth={handleSignOut}
          isVisualizerEnabled={isVisualizerEnabled}
          onToggleVisualizer={() => setIsVisualizerEnabled(!isVisualizerEnabled)}
        />
      )}
    </div>
  );
};

export default App;
