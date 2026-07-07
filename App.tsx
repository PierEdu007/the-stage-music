
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Library from './components/Library';
import Stage from './components/Stage';
import Profile from './components/Profile';
import Auth from './components/Auth';
import Search from './components/Search';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export enum View {
  LIBRARY = 'library',
  STAGE = 'stage',
  PROFILE = 'profile',
  SEARCH = 'search'
}

export interface Track {
  id: string;
  user_id?: string;
  title: string;
  artist: string;
  bpm: string;
  isFavorite: boolean;
  coverUrl: string;
  audioUrl?: string;
  storagePath?: string;
  accentColor?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LIBRARY);
  const [isShuffle, setIsShuffle] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isVisualizerEnabled, setIsVisualizerEnabled] = useState(true);

  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentQueue, setCurrentQueue] = useState<Track[]>([]);

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
      if (session) {
        fetchTracks();
        fetchPlaylists();
      }
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchTracks(session.user.id);
        fetchPlaylists();
      }
      else {
        setTracks([]);
        setPlaylists([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTracks = async (currentUserId?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tracks:', error);
      } else if (data) {

        let favoriteIds = new Set<string>();
        const uid = currentUserId || session?.user?.id;
        if (uid) {
          const { data: favs } = await supabase
            .from('user_favorites')
            .select('track_id')
            .eq('user_id', uid);
          if (favs) {
            favs.forEach((f: any) => favoriteIds.add(f.track_id));
          }
        }

        const mappedTracks: Track[] = data.map(t => ({
          id: t.id,
          user_id: t.user_id,
          title: t.title,
          artist: t.artist,
          bpm: t.bpm,
          isFavorite: favoriteIds.has(t.id),
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

  const fetchPlaylists = async () => {
    try {
      const { data: playlistsData, error: plError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          playlist_tracks (
            track_id
          )
        `)
        .order('created_at', { ascending: false });

      if (plError) throw plError;

      if (playlistsData) {
        const mappedPlaylists: Playlist[] = playlistsData.map(pl => {
          const playlistTrackIds = pl.playlist_tracks.map((pt: any) => pt.track_id);
          // Find the actual track objects from our tracks state or we might need to fetch them
          // BUT wait, fetchTracks might not have finished yet. 
          // It's better to fetch tracks first or combine.
          // For now, let's just use the current tracks state.
          const playlistTracks = tracks.filter(t => playlistTrackIds.includes(t.id));

          return {
            id: pl.id,
            name: pl.name,
            tracks: playlistTracks
          };
        });
        setPlaylists(mappedPlaylists);
      }
    } catch (e) {
      console.error('Fetch playlists error:', e);
    }
  };

  // Ensure playlists are updated when tracks are loaded
  useEffect(() => {
    if (session && tracks.length > 0) {
      fetchPlaylists();
    }
  }, [tracks.length, session]); // Using tracks.length to trigger when tracks are initially loaded

  // Re-sync playlists whenever tracks change
  useEffect(() => {
    if (tracks.length > 0) {
      fetchPlaylists();
    }
  }, [tracks]);

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

  const handleTrackSelect = useCallback(async (trackId: string, queue?: Track[]) => {
    initAudioEngine();

    // Set the queue if provided, otherwise default to all tracks if no queue exists
    if (queue) {
      setCurrentQueue(queue);
    } else if (currentQueue.length === 0) {
      setCurrentQueue(tracks);
    }

    const targetQueue = queue || (currentQueue.length > 0 ? currentQueue : tracks);
    const track = targetQueue.find(t => t.id === trackId);
    if (!track) return;

    if (activeTrackId !== trackId) {
      setActiveTrackId(trackId);
      if (audioRef.current) {
        if (track.audioUrl) {
          audioRef.current.src = track.audioUrl;
          audioRef.current.play().catch(e => console.error("Playback failed:", e));
          setIsPlaying(true);

          if (session?.user.id) {
            try {
              const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('total_plays')
                .eq('id', session.user.id)
                .maybeSingle(); // Use maybeSingle to avoid 406/400 if not found

              if (!fetchError && profile) {
                await supabase
                  .from('profiles')
                  .update({ total_plays: (profile.total_plays || 0) + 1 })
                  .eq('id', session.user.id);
              }
            } catch (err) {
              console.warn('Failed to update play stats:', err);
            }
          }
        }
      }
    }
    setCurrentView(View.STAGE);
  }, [activeTrackId, tracks, currentQueue, initAudioEngine, session]);

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

  const handleCreatePlaylist = useCallback(async (name: string) => {
    if (!session) return;
    const { data, error } = await supabase
      .from('playlists')
      .insert([{ user_id: session.user.id, name }])
      .select();
    if (!error && data) fetchPlaylists();
  }, [session]);

  const handleRenamePlaylist = useCallback(async (id: string, newName: string) => {
    const { error } = await supabase
      .from('playlists')
      .update({ name: newName })
      .eq('id', id);
    if (!error) fetchPlaylists();
  }, []);

  const handleDeletePlaylist = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id);
    if (!error) fetchPlaylists();
  }, []);

  /* Playlist Operations with Optimistic Updates */
  const handleAddTrackToPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    // Optimistic update
    const trackToAdd = tracks.find(t => t.id === trackId);
    if (trackToAdd) {
      setPlaylists(prev => prev.map(pl => {
        if (pl.id === playlistId) {
          // Prevent duplicates in UI
          if (pl.tracks.some(t => t.id === trackId)) return pl;
          return { ...pl, tracks: [...pl.tracks, trackToAdd] };
        }
        return pl;
      }));
    }

    const { error } = await supabase
      .from('playlist_tracks')
      .upsert(
        { playlist_id: playlistId, track_id: trackId },
        { onConflict: 'playlist_id, track_id', ignoreDuplicates: true }
      );

    if (error) {
      console.error('Error adding track to playlist:', error);
      fetchPlaylists(); // Revert/Refresh on error
    }
  }, [tracks]); // Added tracks dependency for optimistic update

  const handleRemoveTrackFromPlaylist = useCallback(async (playlistId: string, trackId: string) => {
    // Optimistic update
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    }));

    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId);

    if (error) {
      console.error('Error removing track from playlist:', error);
      fetchPlaylists();
    }
  }, []);

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
    if (!activeTrackId || currentQueue.length === 0) return;

    // Increment playtime in profile when a track finishes
    if (session?.user.id && duration > 0) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('total_playtime')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!error && profile) {
          await supabase
            .from('profiles')
            .update({ total_playtime: (profile.total_playtime || 0) + duration })
            .eq('id', session.user.id);
        }
      } catch (e) {
        console.warn('Failed to update playtime:', e);
      }
    }

    let nextTrackId: string;
    if (isShuffle) {
      const otherTracks = currentQueue.filter(t => t.id !== activeTrackId);
      if (otherTracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherTracks.length);
        nextTrackId = otherTracks[randomIndex].id;
      } else {
        nextTrackId = activeTrackId;
      }
    } else {
      const currentIndex = currentQueue.findIndex(t => t.id === activeTrackId);
      const nextIndex = (currentIndex + 1) % currentQueue.length;
      nextTrackId = currentQueue[nextIndex].id;
    }

    handleTrackSelect(nextTrackId);
  }, [activeTrackId, currentQueue, handleTrackSelect, isShuffle, session, duration]);

  const handlePrevious = useCallback(() => {
    if (!activeTrackId || currentQueue.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevTrackId: string;
    if (isShuffle) {
      const otherTracks = currentQueue.filter(t => t.id !== activeTrackId);
      if (otherTracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherTracks.length);
        prevTrackId = otherTracks[randomIndex].id;
      } else {
        prevTrackId = activeTrackId;
      }
    } else {
      const currentIndex = currentQueue.findIndex(t => t.id === activeTrackId);
      const prevIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
      prevTrackId = currentQueue[prevIndex].id;
    }

    handleTrackSelect(prevTrackId);
  }, [activeTrackId, currentQueue, handleTrackSelect, isShuffle]);


  const toggleFavorite = useCallback(async (id: string) => {
    if (!session?.user?.id) return;
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    // Optimistic Update
    setTracks(prev => prev.map(t =>
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    ));

    if (track.isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('track_id', id);
      if (error) fetchTracks(); // Revert on error
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: session.user.id, track_id: id });
      if (error) fetchTracks(); // Revert on error
    }
  }, [tracks, session]); // Removed fetchTracks to avoid circular dependency loop if needed, but keeping logic simple

  const handleRenameTrack = useCallback(async (id: string, newTitle: string) => {
    const { error } = await supabase
      .from('tracks')
      .update({ title: newTitle })
      .eq('id', id);

    if (!error) fetchTracks();
  }, [fetchTracks]);

  const handleDeleteTrack = useCallback(async (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track || !session?.user?.id) return;

    // If the user is the owner, delete the track completely
    if (track.user_id === session.user.id) {
      const isConfirmed = window.confirm(
        "¿Estás seguro de que deseas eliminar esta pista permanentemente?\n\nEsta acción borrará la canción de la base de datos y no se puede deshacer."
      );

      if (!isConfirmed) return;

      if (track.storagePath) {
        await supabase.storage.from('audio-tracks').remove([track.storagePath]);
      }

      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', id);

      if (!error) fetchTracks();
    }
    // If the user is not the owner (it's a favorite), just remove from favorites
    else {
      toggleFavorite(id);
    }
  }, [tracks, session, fetchTracks, toggleFavorite]);

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

  const libraryTracks = React.useMemo(() => {
    if (!session?.user?.id) return [];
    return tracks.filter(t => t.isFavorite || t.user_id === session.user.id);
  }, [tracks, session]);

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
          tracks={libraryTracks}
          playlists={playlists}
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
          onCreatePlaylist={handleCreatePlaylist}
          onRenamePlaylist={handleRenamePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onAddTrackToPlaylist={handleAddTrackToPlaylist}
          onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
        />
      )}
      {currentView === View.SEARCH && (
        <Search
          tracks={tracks}
          activeTrack={activeTrack}
          isPlaying={isPlaying}
          onNavigate={handleNavigate}
          onTrackSelect={handleTrackSelect}
          onTogglePlay={togglePlay}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onToggleShuffle={toggleShuffle}
          onToggleFavorite={(id) => toggleFavorite(id)}
          isShuffle={isShuffle}
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
          onNavigate={handleNavigate}
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
