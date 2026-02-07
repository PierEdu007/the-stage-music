import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthProps {
    onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) setError(error.message);
            else alert("Registration successful! You can now sign in.");
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) setError(error.message);
            else onSuccess();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020412] p-6 overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#0d33f2]/20 blur-[150px] animate-pulse-slow"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/15 blur-[120px]"></div>

            <div className="relative w-full max-w-md">
                <div className="bg-[#0a0b14]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_32px_80px_rgba(0,0,0,0.8)] flex flex-col items-center">
                    {/* Logo/Icon */}
                    <div className="relative mb-10">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#0d33f2] to-cyan-400 p-0.5 shadow-[0_0_40px_rgba(13,51,242,0.4)]">
                            <div className="w-full h-full bg-[#0a0b14] rounded-[1.4rem] flex items-center justify-center overflow-hidden">
                                <span className="material-symbols-outlined text-4xl text-white animate-pulse">equalizer</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center space-y-3 mb-10">
                        <h1 className="text-4xl font-bold tracking-tight text-white uppercase">The Stage</h1>
                        <p className="text-white/40 text-[10px] font-bold tracking-[0.4em] uppercase">Immersive Audio Architecture</p>
                    </div>

                    <form onSubmit={handleAuth} className="w-full space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">Neural Identity (Email)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center text-white/20 group-focus-within:text-[#0d33f2] transition-colors">
                                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-[#0d33f2] focus:bg-white/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">Access Key (Password)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center text-white/20 group-focus-within:text-[#0d33f2] transition-colors">
                                    <span className="material-symbols-outlined text-xl">lock_open</span>
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-[#0d33f2] focus:bg-white/10 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative group overflow-hidden rounded-2xl p-0.5 mt-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0d33f2] to-cyan-500 transition-opacity group-hover:opacity-100"></div>
                            <div className="relative bg-[#0d33f2] py-4 rounded-[0.9rem] flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[11px] text-white shadow-xl">
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <span>{isSignUp ? 'Create Architecture' : 'Transmit Access'}</span>
                                        <span className="material-symbols-outlined text-base">sensors</span>
                                    </>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-8 flex flex-col items-center gap-4">
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-white/40 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                            type="button"
                        >
                            {isSignUp ? 'Already have an ID? Sign In' : 'New Identity? Create Account'}
                        </button>

                        <div className="flex items-center gap-3 text-[8px] font-bold text-white/10 uppercase tracking-[0.2em]">
                            <span className="w-12 h-px bg-white/5"></span>
                            <span>Secure Protocol V4.2</span>
                            <span className="w-12 h-px bg-white/5"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
