
import React from 'react';

interface ProfileProps {
  onBack: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onBack }) => {
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
        <button className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/40 hover:text-white transition-colors">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 no-scrollbar pb-24 relative z-10">
        {/* Profile Card */}
        <div className="relative w-full rounded-[2.5rem] overflow-hidden mb-8 p-1 px-1 bg-gradient-to-br from-white/20 to-transparent">
          <div className="bg-[#0a0b14]/90 backdrop-blur-3xl rounded-[2.4rem] p-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-[#0d33f2] to-cyan-400 shadow-[0_0_30px_rgba(13,51,242,0.3)]">
                <img 
                  src="https://picsum.photos/seed/user123/400/400" 
                  className="w-full h-full rounded-full object-cover border-4 border-[#0a0b14]"
                  alt="Profile"
                />
              </div>
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-[#0d33f2] border-2 border-[#0a0b14] rounded-full flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[12px] text-white">edit</span>
              </div>
            </div>
            
            <div className="w-full">
              <h1 className="text-3xl font-bold mb-1 tracking-tight">Kaelen Vance</h1>
              <p className="text-[#0d33f2] text-[10px] font-bold tracking-[0.2em] uppercase mb-6">Master Visualist • Stage Rank 84</p>
              
              <div className="grid grid-cols-3 gap-2 w-full">
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                   <span className="block text-xl font-bold">1.2k</span>
                   <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-1 block">Visuals</span>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                   <span className="block text-xl font-bold">24h</span>
                   <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-1 block">Uptime</span>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                   <span className="block text-xl font-bold">12</span>
                   <span className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mt-1 block">Awards</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

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
                { label: 'Neural Network ID', detail: 'NV-9844-XJ' },
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
