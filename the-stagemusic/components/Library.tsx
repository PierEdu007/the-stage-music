
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Track } from '../App';

interface LibraryProps {
  tracks: Track[];
  activeTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  onFileSelect: (file: File) => void;
  onNavigate: (view: View) => void;
  onTrackSelect: (id: string) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateTracks: (tracks: Track[]) => void;
  onToggleShuffle: () => void;
}

type SortField = 'title' | 'artist' | 'bpm';
type SortOrder = 'asc' | 'desc';
type FilterType = 'All' | 'Favorites' | 'High BPM' | 'Chill' | 'Intense';

const Library: React.FC<LibraryProps> = ({ 
  tracks, 
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
  onUpdateTracks,
  onToggleShuffle
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    onUpdateTracks(tracks.filter(t => t.id !== id));
    setMenuOpenId(null);
  };

  const startRename = (track: Track) => {
    setEditingId(track.id);
    setEditValue(track.title);
    setMenuOpenId(null);
  };

  const submitRename = () => {
    if (editingId && editValue.trim() !== '') {
      onUpdateTracks(tracks.map(t => t.id === editingId ? { ...t, title: editValue.trim() } : t));
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

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;
  const filters: FilterType[] = ['All', 'Favorites', 'High BPM', 'Chill', 'Intense'];

  return (
    <div className="flex flex-col h-full bg-[#101322] relative">
      <header className="sticky top-0 z-40 w-full bg-[#101322]/70 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight uppercase">The Library</h1>
          <button 
            onClick={() => onNavigate(View.PROFILE)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-6 space-y-8 no-scrollbar relative">
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
                  className={`snap-start shrink-0 px-5 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                    activeFilter === filter 
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${
                    sortBy === sort.field 
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

        <div className="grid grid-cols-2 gap-4 pb-52">
           {processedTracks.length > 0 ? (
             processedTracks.map((track) => (
               <article 
                  key={track.id} 
                  onClick={() => editingId !== track.id && onTrackSelect(track.id)}
                  className={`group relative bg-white/5 rounded-2xl p-3 hover:bg-white/10 transition-all cursor-pointer border ${activeTrack?.id === track.id ? 'border-[#0d33f2]' : 'border-white/5'}`}
               >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3">
                    <img src={track.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={track.title} />
                    <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md p-1 rounded-full text-white/80">
                      <span className={`material-symbols-outlined text-sm leading-none ${track.isFavorite ? 'text-red-500 fill' : ''}`}>favorite</span>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-[#0d33f2] border border-[#0d33f2]/20" style={{color: track.accentColor}}>
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
                          className="absolute right-0 bottom-full mb-2 w-40 bg-[#1a1c2e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            onClick={() => startRename(track)} 
                            className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-[#0d33f2] hover:text-white transition-colors"
                          >
                            <span className="material-symbols-outlined text-base leading-none">edit</span>
                            <span>Renombrar</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(track.id)} 
                            className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
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
               <p className="text-sm font-bold uppercase tracking-widest">No tracks found</p>
             </div>
           )}
        </div>
      </main>

      {activeTrack && (
        <div 
          onClick={() => onNavigate(View.STAGE)}
          className="fixed bottom-[88px] left-4 right-4 z-40 bg-[#0d33f2] rounded-2xl pt-1 flex flex-col shadow-[0_8px_32px_rgba(13,51,242,0.4)] animate-in slide-in-from-bottom-4 duration-500 cursor-pointer overflow-hidden"
          style={{backgroundColor: activeTrack.accentColor}}
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
      )}

      <nav className="fixed bottom-0 z-50 w-full bg-[#101322]/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-2">
        <div className="flex justify-around items-center px-2">
          <button onClick={() => onNavigate(View.LIBRARY)} className="flex flex-col items-center justify-center p-2 text-[#0d33f2]">
            <span className="material-symbols-outlined text-2xl mb-1">library_music</span>
            <span className="text-[10px] font-medium tracking-wide">Library</span>
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
    </div>
  );
};

export default Library;
