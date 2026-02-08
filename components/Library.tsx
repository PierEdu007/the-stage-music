
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Track, Playlist } from '../App';


interface LibraryProps {
  tracks: Track[];
  playlists: Playlist[];
  activeTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  onFileSelect: (file: File) => void;
  onNavigate: (view: View) => void;
  onTrackSelect: (id: string, queue?: Track[]) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onDeleteTrack: (id: string) => void;
  onRenameTrack: (id: string, newTitle: string) => void;
  onToggleShuffle: () => void;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (id: string, name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
}

type SortField = 'title' | 'artist' | 'bpm';
type SortOrder = 'asc' | 'desc';
type FilterType = 'All' | 'Favorites' | 'High BPM' | 'Chill' | 'Intense';
type LibraryTab = 'tracks' | 'playlists';

const PlaylistCover = ({ playlistTracks }: { playlistTracks: Track[] }) => {
  const randomCover = useMemo(() => {
    if (playlistTracks.length === 0) return null;
    // For stability during re-renders, but still "random" per playlist contents change
    const index = playlistTracks.length > 0 ? Math.floor((playlistTracks[0].id.charCodeAt(0) || 0) % playlistTracks.length) : 0;
    return playlistTracks[index].coverUrl;
  }, [playlistTracks]);

  if (playlistTracks.length >= 4) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
        {playlistTracks.slice(0, 4).map((t, i) => (
          <img key={`${t.id}-${i}`} src={t.coverUrl} className="w-full h-full object-cover" />
        ))}
      </div>
    );
  }
  if (playlistTracks.length > 0) {
    return <img src={randomCover || ''} className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full bg-white/5 flex items-center justify-center">
      <span className="material-symbols-outlined text-4xl text-white/20">queue_music</span>
    </div>
  );
};

const Library: React.FC<LibraryProps> = ({
  tracks,
  playlists,
  activeTrack,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  onFileSelect,
  onNavigate,
  onTrackSelect,
  onTogglePlay,
  onNext,
  onPrevious,
  onDeleteTrack,
  onRenameTrack,
  onToggleShuffle,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('tracks');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [playlistTrackMenuId, setPlaylistTrackMenuId] = useState<string | null>(null);
  const [plMenuOpenId, setPlMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPlId, setEditingPlId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const handleDelete = (id: string) => {
    onDeleteTrack(id);
    setMenuOpenId(null);
  };

  const startRename = (track: Track) => {
    setEditingId(track.id);
    setEditValue(track.title);
    setMenuOpenId(null);
  };

  const submitRename = () => {
    if (editingId && editValue.trim() !== '') {
      onRenameTrack(editingId, editValue.trim());
    }
    setEditingId(null);
  };


  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitRename();
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const processedTracks = useMemo(() => {
    let result = [...tracks];
    if (activeFilter === 'Favorites') {
      result = result.filter(t => t.isFavorite);
    } else if (activeFilter === 'High BPM') {
      result = result.filter(t => parseInt(t.bpm) >= 120);
    } else if (activeFilter === 'Chill') {
      result = result.filter(t => parseInt(t.bpm) < 100);
    } else if (activeFilter === 'Intense') {
      result = result.filter(t => parseInt(t.bpm) > 130);
    }

    return result.sort((a, b) => {
      const rawA = a[sortBy];
      const rawB = b[sortBy];
      if (sortBy === 'bpm') {
        const valA = parseInt(rawA, 10);
        const valB = parseInt(rawB, 10);
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      } else {
        const valA = rawA.toLowerCase();
        const valB = rawB.toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [tracks, sortBy, sortOrder, activeFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const activePlaylist = useMemo(() =>
    playlists.find(p => p.id === activePlaylistId) || null
    , [playlists, activePlaylistId]);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const startRenamePlaylist = (pl: Playlist) => {
    setEditingPlId(pl.id);
    setEditValue(pl.name);
    setPlMenuOpenId(null);
  };

  const submitRenamePlaylist = () => {
    if (editingPlId && editValue.trim() !== '') {
      onRenamePlaylist(editingPlId, editValue.trim());
    }
    setEditingPlId(null);
  };

  const playPlaylist = (pl: Playlist) => {
    if (pl.tracks.length > 0) {
      onTrackSelect(pl.tracks[0].id, pl.tracks);
    }
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;
  const filters: FilterType[] = ['All', 'Favorites', 'High BPM', 'Chill', 'Intense'];

  return (
    <div className="flex flex-col h-full bg-[#101322] relative">
      <header className="sticky top-0 z-40 w-full bg-[#101322]/70 backdrop-blur-xl border-b border-white/5 pt-12 pb-2 px-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold tracking-tight uppercase">The Library</h1>
          <button
            onClick={() => onNavigate(View.PROFILE)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
        </div>
        <div className="flex gap-6">
          <button
            onClick={() => { setActiveTab('tracks'); setActivePlaylistId(null); }}
            className={`text-xs font-bold uppercase tracking-[0.2em] pb-2 border-b-2 transition-all ${activeTab === 'tracks' ? 'text-[#0d33f2] border-[#0d33f2]' : 'text-white/40 border-transparent'}`}
          >
            Tracks
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`text-xs font-bold uppercase tracking-[0.2em] pb-2 border-b-2 transition-all ${activeTab === 'playlists' ? 'text-[#0d33f2] border-[#0d33f2]' : 'text-white/40 border-transparent'}`}
          >
            Playlists
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-6 space-y-8 no-scrollbar relative mb-32">
        {activeTab === 'tracks' ? (
          <>
            <label className="relative group w-full block aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">
              <input
                id="audio-uploader"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url("https://picsum.photos/seed/audio/800/600")` }}>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#101322]/80 via-[#101322]/40 to-[#0d33f2]/30 mix-blend-multiply"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/20 rounded-xl m-2 bg-black/20 backdrop-blur-[2px] group-hover:border-[#0d33f2]/60 group-hover:bg-black/30 transition-all duration-300">
                <div className="w-16 h-16 rounded-full bg-[#0d33f2]/20 flex items-center justify-center mb-4 ring-4 ring-[#0d33f2]/10 group-hover:ring-[#0d33f2]/30 transition-all">
                  <span className="material-symbols-outlined text-[#0d33f2] text-3xl">upload_file</span>
                </div>
                <h2 className="text-2xl font-bold uppercase tracking-tight mb-2">Drop Zone</h2>
                <p className="text-sm text-white/70 max-w-[200px] leading-relaxed">Select .mp3, .wav, or .flac to visualize</p>
                <div className="mt-6 px-6 py-2.5 bg-[#0d33f2] text-white text-sm font-semibold rounded-lg shadow-[0_0_20px_rgba(13,51,242,0.3)]">
                  Browse Files
                </div>
              </div>
            </label>

            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Mood & Filters</h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`snap-start shrink-0 px-5 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${activeFilter === filter
                        ? 'bg-[#0d33f2] text-white shadow-[0_4px_12px_rgba(13,51,242,0.25)]'
                        : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                    >
                      {filter === 'Favorites' && <span className="material-symbols-outlined text-sm leading-none">favorite</span>}
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Sort By</h3>
                <div className="flex gap-2">
                  {[
                    { label: 'Title', field: 'title' as SortField },
                    { label: 'Artist', field: 'artist' as SortField },
                    { label: 'BPM', field: 'bpm' as SortField }
                  ].map((sort) => (
                    <button
                      key={sort.field}
                      onClick={() => handleSort(sort.field)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${sortBy === sort.field
                        ? 'bg-[#0d33f2]/20 border-[#0d33f2] text-white'
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                        }`}
                    >
                      {sort.label}
                      {sortBy === sort.field && (
                        <span className="material-symbols-outlined text-sm leading-none">
                          {sortOrder === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {processedTracks.length > 0 ? (
                processedTracks.map((track) => (
                  <article
                    key={track.id}
                    onClick={() => editingId !== track.id && onTrackSelect(track.id, processedTracks)}
                    className={`group relative bg-white/5 rounded-2xl p-3 hover:bg-white/10 transition-all cursor-pointer border ${activeTrack?.id === track.id ? 'border-[#0d33f2]' : 'border-white/5'}`}
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3">
                      <img src={track.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={track.title} />
                      <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md p-1 rounded-full text-white/80">
                        <span className={`material-symbols-outlined text-sm leading-none ${track.isFavorite ? 'text-red-500 fill' : ''}`}>favorite</span>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-[#0d33f2] border border-[#0d33f2]/20" style={{ color: track.accentColor }}>
                        {track.bpm} BPM
                      </div>
                    </div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {editingId === track.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={submitRename}
                            onKeyDown={handleEditKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-white/10 border border-[#0d33f2] rounded px-1 py-0.5 text-white text-sm outline-none font-medium"
                          />
                        ) : (
                          <>
                            <h4 className="text-white font-medium text-sm truncate leading-tight">{track.title}</h4>
                            <p className="text-white/50 text-[10px] truncate mt-1 uppercase tracking-wider font-semibold">{track.artist}</p>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                          onClick={(e) => toggleMenu(e, track.id)}
                        >
                          <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>

                        {menuOpenId === track.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 bottom-full mb-2 w-48 bg-[#1a1c2e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { setIsAddingToPlaylist(track.id); setMenuOpenId(null); }}
                              className="w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-[#0d33f2] hover:text-white transition-colors"
                            >
                              <span className="material-symbols-outlined text-base leading-none">playlist_add</span>
                              <span>Agregar a Playlist</span>
                            </button>
                            <button
                              onClick={() => startRename(track)}
                              className="w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-[#0d33f2] hover:text-white transition-colors border-t border-white/5"
                            >
                              <span className="material-symbols-outlined text-base leading-none">edit</span>
                              <span>Renombrar</span>
                            </button>
                            <button
                              onClick={() => handleDelete(track.id)}
                              className="w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
                            >
                              <span className="material-symbols-outlined text-base leading-none">delete</span>
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-20 text-white/20">
                  <span className="material-symbols-outlined text-6xl mb-4">music_note</span>
                  <p className="text-sm font-bold uppercase tracking-widest">No hay pistas</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Playlists Tab Content */
          <>
            {!activePlaylistId ? (
              /* Playlists Grid */
              <div className="space-y-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full flex items-center justify-center gap-3 p-6 bg-[#0d33f2]/10 border-2 border-dashed border-[#0d33f2]/30 rounded-[2rem] text-[#0d33f2] font-bold uppercase tracking-widest hover:bg-[#0d33f2]/20 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Nueva Playlist
                </button>

                <div className="grid grid-cols-2 gap-4 pb-20">
                  {playlists.map((pl) => (
                    <article
                      key={pl.id}
                      onClick={() => setActivePlaylistId(pl.id)}
                      className="group relative bg-white/5 rounded-3xl p-4 hover:bg-white/10 transition-all cursor-pointer border border-white/10 shadow-xl"
                    >
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 shadow-2xl">
                        <PlaylistCover playlistTracks={pl.tracks} />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-white">play_circle</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <div className="overflow-hidden mr-2">
                          <h4 className="text-white font-bold text-sm truncate leading-tight uppercase tracking-tight">{pl.name}</h4>
                          <p className="text-white/40 text-[9px] uppercase tracking-widest font-bold mt-1">{pl.tracks.length} Pistas</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPlMenuOpenId(pl.id === plMenuOpenId ? null : pl.id); }}
                          className="text-white/20 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </div>

                      {plMenuOpenId === pl.id && (
                        <div className="absolute right-4 bottom-12 w-40 bg-[#1a1c2e] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                          <button
                            onClick={(e) => { e.stopPropagation(); startRenamePlaylist(pl); }}
                            className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-[#0d33f2] transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">edit</span> Renombrar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePlaylist(pl.id); setPlMenuOpenId(null); }}
                            className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
                          >
                            <span className="material-symbols-outlined text-base">delete</span> Eliminar
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                  {playlists.length === 0 && (
                    <div className="col-span-2 flex flex-col items-center justify-center py-20 text-white/10">
                      <span className="material-symbols-outlined text-6xl mb-4">auto_stories</span>
                      <p className="text-sm font-bold uppercase tracking-widest text-center">Crea tu primera colección musical</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Playlist detail */
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActivePlaylistId(null)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <div className="flex-1 overflow-hidden">
                    {editingPlId === activePlaylistId ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={submitRenamePlaylist}
                        onKeyDown={(e) => e.key === 'Enter' && submitRenamePlaylist()}
                        className="bg-transparent text-2xl font-black uppercase tracking-tight outline-none border-b-2 border-[#0d33f2] w-full"
                      />
                    ) : (
                      <h2
                        onClick={() => startRenamePlaylist(activePlaylist!)}
                        className="text-2xl font-black uppercase tracking-tight truncate cursor-pointer hover:text-[#0d33f2] transition-colors"
                      >
                        {activePlaylist?.name}
                      </h2>
                    )}
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-1">{activePlaylist?.tracks.length} Tracks in alignment</p>
                  </div>
                </div>

                <div className="relative w-full aspect-[16/9] rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/5">
                  <PlaylistCover playlistTracks={activePlaylist?.tracks || []} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8">
                    <div className="flex gap-4">
                      <button
                        onClick={() => activePlaylist && playPlaylist(activePlaylist)}
                        className="flex-1 py-4 bg-[#0d33f2] text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-xs shadow-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
                      >
                        <span className="material-symbols-outlined text-xl">play_circle</span> Iniciar Frecuencia
                      </button>
                      <button
                        onClick={onToggleShuffle}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border border-white/10 transition-all ${isShuffle ? 'bg-white text-black' : 'bg-white/5 text-white'}`}
                      >
                        <span className="material-symbols-outlined">shuffle</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] px-2">Data Stream</h3>
                  <div className="space-y-2">
                    {activePlaylist?.tracks.map((track) => (
                      <div key={track.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group">
                        <img
                          src={track.coverUrl}
                          className="w-12 h-12 rounded-xl object-cover cursor-pointer shadow-lg"
                          onClick={() => onTrackSelect(track.id, activePlaylist.tracks)}
                        />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTrackSelect(track.id, activePlaylist.tracks)}>
                          <h4 className="text-xs font-bold truncate leading-tight">{track.title}</h4>
                          <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">{track.artist}</p>
                        </div>
                        <div className="relative">
                          <button
                            className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setPlaylistTrackMenuId(playlistTrackMenuId === track.id ? null : track.id); }}
                          >
                            <span className="material-symbols-outlined text-lg">more_vert</span>
                          </button>

                          {playlistTrackMenuId === track.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setPlaylistTrackMenuId(null); }} />
                              <div
                                className="absolute right-0 bottom-full mb-2 w-48 bg-[#1a1c2e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => { onRemoveTrackFromPlaylist(activePlaylist.id, track.id); setPlaylistTrackMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base leading-none">playlist_remove</span>
                                  <span>Sacar de playlist</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {activePlaylist?.tracks.length === 0 && (
                      <div className="py-12 flex flex-col items-center justify-center text-white/10 border-2 border-dashed border-white/5 rounded-[2rem]">
                        <span className="material-symbols-outlined text-4xl mb-2">sensor_occupied</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-center">Playlist vacía.<br />Agrega pistas desde la librería.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add track to playlist Modal */}
      {isAddingToPlaylist && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsAddingToPlaylist(null)}>
          <div className="w-full max-w-sm bg-[#101322] border border-white/10 rounded-[2.5rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-8 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold uppercase tracking-tight">Seleccionar Playlist</h3>
              <button onClick={() => setIsAddingToPlaylist(null)} className="text-white/40"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
              {playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => { onAddTrackToPlaylist(pl.id, isAddingToPlaylist); setIsAddingToPlaylist(null); }}
                  className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-[#0d33f2] rounded-3xl transition-all group border border-white/5 hover:border-[#0d33f2]"
                >
                  <span className="font-bold text-sm uppercase tracking-wider">{pl.name}</span>
                  <span className="material-symbols-outlined text-white/20 group-hover:text-white">chevron_right</span>
                </button>
              ))}
              {playlists.length === 0 && <p className="text-center py-6 text-white/20 text-xs font-bold uppercase tracking-widest">No tienes playlists creadas</p>}
            </div>
            <button
              onClick={() => { setShowCreateModal(true); setIsAddingToPlaylist(null); }}
              className="w-full mt-6 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-colors"
            >
              + Crear Nueva
            </button>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-[#101322] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold uppercase text-center mb-6 tracking-tighter">Nueva Entidad</h3>
            <input
              type="text"
              placeholder="Nombre de la Playlist"
              autoFocus
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[#0d33f2] transition-colors mb-6 text-center"
            />
            <div className="flex gap-4">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest">Cancelar</button>
              <button onClick={handleCreatePlaylist} className="flex-1 py-4 bg-[#0d33f2] rounded-2xl text-[10px] font-bold uppercase tracking-widest">Crear</button>
            </div>
          </div>
        </div>
      )}

      {activeTrack && (
        <div
          onClick={() => onNavigate(View.STAGE)}
          className="fixed bottom-[88px] left-4 right-4 z-40 bg-[#0d33f2] rounded-2xl pt-1 flex flex-col shadow-[0_8px_32px_rgba(13,51,242,0.4)] animate-in slide-in-from-bottom-4 duration-500 cursor-pointer overflow-hidden"
          style={{ backgroundColor: activeTrack.accentColor }}
        >
          <div className="w-full h-1 bg-white/20 px-2.5">
            <div className="h-full bg-white transition-all duration-300 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
          </div>

          <div className="p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={activeTrack.coverUrl} className="w-10 h-10 rounded-lg object-cover shadow-lg" alt="" />
              <div className="overflow-hidden">
                <h4 className="text-white text-xs font-bold truncate leading-none mb-1">{activeTrack.title}</h4>
                <p className="text-white/70 text-[9px] uppercase tracking-wider font-bold truncate">{activeTrack.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <button onClick={onToggleShuffle} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isShuffle ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                <span className="material-symbols-outlined text-lg">shuffle</span>
              </button>
              <button onClick={onPrevious} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                <span className="material-symbols-outlined text-lg">skip_previous</span>
              </button>
              <button onClick={onTogglePlay} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                <span className="material-symbols-outlined text-2xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
              </button>
              <button onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                <span className="material-symbols-outlined text-lg">skip_next</span>
              </button>
            </div>
          </div>
        </div>
      )
      }

      <nav className="fixed bottom-0 z-50 w-full bg-[#101322]/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-2">
        <div className="flex justify-around items-center px-2">
          <button onClick={() => onNavigate(View.LIBRARY)} className="flex flex-col items-center justify-center p-2 text-[#0d33f2]">
            <span className="material-symbols-outlined text-2xl mb-1">library_music</span>
            <span className="text-[10px] font-medium tracking-wide">Library</span>
          </button>
          <button onClick={() => onNavigate(View.SEARCH)} className="flex flex-col items-center justify-center p-2 text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl mb-1">search</span>
            <span className="text-[10px] font-medium tracking-wide">Search</span>
          </button>
          <button onClick={() => onNavigate(View.STAGE)} className="flex flex-col items-center justify-center p-2 text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl mb-1">equalizer</span>
            <span className="text-[10px] font-medium tracking-wide">Visualizer</span>
          </button>
          <button onClick={() => onNavigate(View.PROFILE)} className="flex flex-col items-center justify-center p-2 text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl mb-1">person</span>
            <span className="text-[10px] font-medium tracking-wide">Profile</span>
          </button>
        </div>
      </nav>
    </div >
  );
};

export default Library;
