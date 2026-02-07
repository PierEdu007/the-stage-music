
import React, { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface ProfileProps {
  onBack: () => void;
  session: Session | null;
  onAuth: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack, session, onAuth }) => {
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (session) {
      getProfile();
    }
  }, [session]);

  const getProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session?.user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: session?.user.id,
            username: session?.user.email?.split('@')[0],
            full_name: session?.user.email?.split('@')[0],
            total_plays: 0,
            total_playtime: 0
          }
        ])
        .select()
        .single();

      if (!insertError) {
        setProfile(newProfile);
        setNewName(newProfile.full_name || '');
      }
    } else if (!error) {
      setProfile(data);
      setNewName(data.full_name || '');
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName.trim() })
        .eq('id', session?.user.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: newName.trim() });
      setIsEditingName(false);
    } catch (error: any) {
      alert('Error actualizando nombre: ' + error.message);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session?.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session?.user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      alert('¡Foto de perfil actualizada!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const getTier = (hours: number) => {
    if (hours < 1) return { title: 'Echo Novice', color: 'text-white/60' };
    if (hours < 10) return { title: 'Rhythm Explorer', color: 'text-cyan-400' };
    if (hours < 50) return { title: 'Sound Architect', color: 'text-purple-400' };
    if (hours < 100) return { title: 'Master Visualist', color: 'text-[#0d33f2]' };
    return { title: 'Astral Entity', color: 'text-yellow-400' };
  };

  const totalPlays = profile?.total_plays || 0;
  const totalHours = Math.floor((profile?.total_playtime || 0) / 3600);
  // Calculate badges: 2^n -> 1(2^0), 2(2^1), 4(2^2), 8, 16, 32...
  const badgesCount = totalPlays > 0 ? Math.floor(Math.log2(totalPlays)) + 1 : 0;

  const totalXp = (totalPlays * 10) + (totalHours * 100) + (badgesCount * 50);
  const stageRank = Math.floor(Math.sqrt(totalXp / 2)) + 1;
  const tierInfo = getTier(totalHours);

  return (
    <div className="flex flex-col h-full bg-[#020412] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-20%] w-[80%] h-[60%] rounded-full bg-[#0d33f2]/10 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-[60%] h-[40%] rounded-full bg-purple-900/10 blur-[100px]"></div>

      <header className="relative z-10 flex items-center justify-between w-full px-6 pt-12 pb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white/90 text-sm tracking-[0.3em] uppercase font-bold">Identity Node</h2>
        <button
          onClick={onAuth}
          className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/40 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">{session ? 'logout' : 'login'}</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 no-scrollbar pb-24 relative z-10">
        {!session ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-4xl text-white/20">lock</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Access Denied</h3>
              <p className="text-white/40 text-sm max-w-[240px]">Sign in to unlock your personal library and visualizer history.</p>
            </div>
            <button
              onClick={onAuth}
              className="px-8 py-3 bg-[#0d33f2] rounded-full font-bold uppercase tracking-widest text-xs shadow-2xl hover:bg-[#0d33f2]/80 transition-all"
            >
              Authenticate Now
            </button>
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="relative w-full rounded-[2.5rem] overflow-hidden mb-8 p-1 px-1 bg-gradient-to-br from-white/20 to-transparent">
              <div className="bg-[#0a0b14]/90 backdrop-blur-3xl rounded-[2.4rem] p-8 flex flex-col items-center text-center">
                <div className="relative mb-6 cursor-pointer group" onClick={handleAvatarClick}>
                  <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-[#0d33f2] to-cyan-400 shadow-[0_0_30px_rgba(13,51,242,0.3)] transition-transform group-hover:scale-105">
                    {uploading ? (
                      <div className="w-full h-full rounded-full bg-black/60 flex items-center justify-center border-4 border-[#0a0b14]">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <img
                        src={profile?.avatar_url || `https://picsum.photos/seed/${session.user.id}/400/400`}
                        className="w-full h-full rounded-full object-cover border-4 border-[#0a0b14]"
                        alt="Profile"
                      />
                    )}
                  </div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-[#0d33f2] border-2 border-[#0a0b14] rounded-full flex items-center justify-center shadow-lg group-hover:bg-[#0d33f2]/80 transition-colors">
                    <span className="material-symbols-outlined text-[12px] text-white">edit</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={uploadAvatar}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="w-full">
                  {isEditingName ? (
                    <div className="flex flex-col items-center gap-3 mb-4">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-white/5 border border-[#0d33f2] rounded-xl px-4 py-2 text-center text-xl font-bold outline-none w-full max-w-[240px]"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateName}
                          className="px-4 py-2 bg-[#0d33f2] rounded-lg text-[10px] font-bold uppercase tracking-widest"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingName(false);
                            setNewName(profile?.full_name || '');
                          }}
                          className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mb-1 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                      <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name || 'Visualist'}</h1>
                      <span className="material-symbols-outlined text-white/20 group-hover:text-[#0d33f2] text-sm transition-colors">edit</span>
                    </div>
                  )}

                  <p className={`${tierInfo.color} text-[10px] font-bold tracking-[0.2em] uppercase mb-6`}>{tierInfo.title} • Stage Rank {stageRank}</p>

                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="block text-xl font-bold">{totalPlays}</span>
                      <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-1 block">Vistas</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <span className="block text-xl font-bold">{totalHours}h</span>
                      <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-1 block">Reproducción</span>
                    </div>
                    <div
                      className="bg-white/5 rounded-2xl p-4 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors active:scale-95"
                      onClick={() => setShowBadgeInfo(true)}
                    >
                      <span className="block text-xl font-bold">{badgesCount}</span>
                      <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-1 block">Medallas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Badge Info Modal */}
            {showBadgeInfo && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-[#101322] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-[#0d33f2]/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <span className="material-symbols-outlined text-[#0d33f2] text-3xl">military_tech</span>
                  </div>
                  <h3 className="text-xl font-bold text-center mb-4">Sistema de Medallas</h3>
                  <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
                    ¡Gana medallas por tu actividad musical!
                  </p>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0d33f2] flex items-center justify-center mt-0.5 shrink-0">
                        <span className="text-[10px] font-bold">1</span>
                      </div>
                      <p className="text-xs text-white/80"><span className="font-bold text-white">Primera Medalla:</span> Se consigue con tu primera reproducción.</p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center mt-0.5 shrink-0">
                        <span className="text-[10px] font-bold">2+</span>
                      </div>
                      <p className="text-xs text-white/80"><span className="font-bold text-white">Siguientes:</span> Se consiguen al alcanzar 2, 4, 8, 16, 32... vistas.</p>
                    </li>
                  </ul>
                  <button
                    onClick={() => setShowBadgeInfo(false)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

            {/* Settings Groups */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#0d33f2]"></span> Experience Settings
                </h3>
                <div className="space-y-2">
                  {[
                    { icon: 'vibration', label: 'Haptic Feedback', value: true },
                    { icon: 'high_quality', label: 'Ultra Render Mode', value: true },
                    { icon: 'cloud_done', label: 'Neural Syncing', value: false }
                  ].map((setting, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-white/40">{setting.icon}</span>
                        <span className="text-sm font-medium">{setting.label}</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${setting.value ? 'bg-[#0d33f2]' : 'bg-white/10'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${setting.value ? 'left-6' : 'left-1'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-purple-500"></span> Account Architecture
                </h3>
                <div className="bg-white/5 rounded-[2rem] border border-white/5 overflow-hidden divide-y divide-white/5">
                  {[
                    { label: 'Neural Network ID', detail: profile?.username || 'NV-9844-XJ' },
                    { label: 'Storage Allocation', detail: '84% of 5TB' },
                    { label: 'Privacy Protocols', detail: 'Standard Encryption' }
                  ].map((link, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors group">
                      <div className="text-left">
                        <p className="text-sm font-medium">{link.label}</p>
                        <p className="text-xs text-white/20">{link.detail}</p>
                      </div>
                      <span className="material-symbols-outlined text-white/20 group-hover:text-white transition-transform group-hover:translate-x-1">chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Nav Placeholder (matches Library) */}
      <nav className="fixed bottom-0 z-50 w-full bg-[#101322]/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-2">
        <div className="flex justify-around items-center px-2">
          <button onClick={onBack} className="flex flex-col items-center justify-center p-2 text-white/40">
            <span className="material-symbols-outlined text-2xl mb-1">library_music</span>
            <span className="text-[10px] font-medium tracking-wide">Library</span>
          </button>
          <button onClick={() => onBack()} className="flex flex-col items-center justify-center p-2 text-white/40">
            <span className="material-symbols-outlined text-2xl mb-1">equalizer</span>
            <span className="text-[10px] font-medium tracking-wide">Visualizer</span>
          </button>
          <button className="flex flex-col items-center justify-center p-2 text-[#0d33f2]">
            <span className="material-symbols-outlined text-2xl mb-1">person</span>
            <span className="text-[10px] font-medium tracking-wide">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Profile;
