import React, { useState, useMemo } from 'react';
import { View, Track } from '../App';

interface SearchProps {
    tracks: Track[];
    activeTrack: Track | null;
    isPlaying: boolean;
    onNavigate: (view: View) => void;
    onTrackSelect: (id: string, queue?: Track[]) => void;
    onTogglePlay: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onToggleShuffle: () => void;
    onToggleFavorite: (id: string) => void;
    isShuffle: boolean;
}

const Search: React.FC<SearchProps> = ({
    tracks,
    activeTrack,
    isPlaying,
    onNavigate,
    onTrackSelect,
    onTogglePlay,
    onNext,
    onPrevious,
    onToggleShuffle,
    onToggleFavorite,
    isShuffle
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const filteredTracks = useMemo(() => {
        if (!searchQuery.trim()) return tracks;
        const query = searchQuery.toLowerCase();
        return tracks.filter(t =>
            t.title.toLowerCase().includes(query) ||
            t.artist.toLowerCase().includes(query)
        );
    }, [tracks, searchQuery]);

    return (
        <div className="h-full overflow-y-auto bg-[#020412] pb-32 font-['Inter'] relative no-scrollbar">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#0d33f2]/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            <header className="sticky top-0 z-40 bg-[#020412]/80 backdrop-blur-xl border-b border-white/5 px-6 pt-12 pb-4">
                <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Explorar</h1>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
                    <input
                        type="text"
                        placeholder="Buscar pistas, artistas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white text-sm outline-none focus:border-[#0d33f2] transition-colors placeholder:text-white/20"
                    />
                </div>
            </header>

            <main className="px-4 pt-6 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                    {filteredTracks.length > 0 ? (
                        filteredTracks.map((track) => (
                            <article
                                key={track.id}
                                onClick={() => onTrackSelect(track.id, filteredTracks)}
                                className={`group relative bg-white/5 rounded-2xl p-3 hover:bg-white/10 transition-all cursor-pointer border ${activeTrack?.id === track.id ? 'border-[#0d33f2]' : 'border-white/5'}`}
                            >
                                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3">
                                    <img src={track.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={track.title} />
                                    <div className="absolute top-2 right-2 flex gap-1 z-20">
                                        <div className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-[#0d33f2] border border-[#0d33f2]/20" style={{ color: track.accentColor }}>
                                            {track.bpm} BPM
                                        </div>
                                    </div>

                                    {activeTrack?.id === track.id && isPlaying && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-3xl text-white animate-pulse">equalizer</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-medium text-sm truncate leading-tight">{track.title}</h4>
                                        <p className="text-white/50 text-[10px] truncate mt-1 uppercase tracking-wider font-semibold">{track.artist}</p>
                                    </div>
                                    <div className="relative">
                                        <button
                                            className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === track.id ? null : track.id); }}
                                        >
                                            <span className="material-symbols-outlined text-lg">more_vert</span>
                                        </button>

                                        {menuOpenId === track.id && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }} />
                                                <div
                                                    className="absolute right-0 bottom-full mb-2 w-48 bg-[#1a1c2e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => { onToggleFavorite(track.id); setMenuOpenId(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-[#0d33f2] hover:text-white transition-colors"
                                                    >
                                                        <span className={`material-symbols-outlined text-base leading-none ${track.isFavorite ? 'text-red-500 fill' : ''}`}>favorite</span>
                                                        <span>{track.isFavorite ? 'Quitar de Library' : 'Añadir a Library'}</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center py-20 text-white/20">
                            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
                            <p className="text-sm font-bold uppercase tracking-widest">No se encontraron resultados</p>
                        </div>
                    )}
                </div>
            </main>

            <nav className="fixed bottom-0 z-50 w-full bg-[#101322]/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-2">
                <div className="flex justify-around items-center px-2">
                    <button onClick={() => onNavigate(View.LIBRARY)} className="flex flex-col items-center justify-center p-2 text-white/40 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-2xl mb-1">library_music</span>
                        <span className="text-[10px] font-medium tracking-wide">Library</span>
                    </button>
                    <button onClick={() => onNavigate(View.SEARCH)} className="flex flex-col items-center justify-center p-2 text-[#0d33f2]">
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
        </div>
    );
};

export default Search;
