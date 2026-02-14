"use client";

import { useUser } from "@/context/UserContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";

const avatars = ["🦊", "🐼", "🦁", "🐰", "🐸", "🦄", "👽", "🤖", "👻", "🐯"];
const interestsList = ["Gaming", "Music", "Tech", "Art", "Travel", "Food", "Fashion", "Memes", "Fitness", "Movies"];

export function OnboardingForm() {
    const { user, updateProfile } = useUser();
    const router = useRouter();
    const [username, setUsername] = useState(user?.username || "");
    const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || avatars[0]);
    const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
    const [isNightOwl, setIsNightOwl] = useState(user?.vibeCharacteristics?.nightOwl ?? true);
    const [isTexter, setIsTexter] = useState(user?.vibeCharacteristics?.texter ?? true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setLoading(true);
        setError("");

        try {
            await updateProfile({
                username,
                avatar: selectedAvatar,
                interests: selectedInterests,
                vibeCharacteristics: {
                    nightOwl: isNightOwl,
                    texter: isTexter,
                },
            });
            router.push('/lobby');
        } catch (err: any) {
            setError(err.message || "Failed to update profile");
            setLoading(false);
        }
    };

    const toggleInterest = (interest: string) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(prev => prev.filter(i => i !== interest));
        } else {
            if (selectedInterests.length < 3) {
                setSelectedInterests(prev => [...prev, interest]);
            }
        }
    };

    return (
        <GlassCard className="max-w-xl mx-auto w-full p-8" variant="default" glowColor="purple">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-neon-purple mb-2 text-center tracking-tighter">
                    SET YOUR VIBE
                </h2>
                <p className="text-center text-gray-400 mb-8">Join the connection revolution.</p>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm mb-4"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Name & Avatar Section */}
                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="text-6xl bg-white/5 rounded-full p-4 border-2 border-neon-purple shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                    {selectedAvatar}
                                </div>
                            </div>
                            <div className="w-full">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">My Alias</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-black/40 border-b-2 border-white/10 p-3 text-xl font-bold text-center text-white focus:outline-none focus:border-neon-purple transition-all placeholder:text-gray-600"
                                    placeholder="Enter your name..."
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-4 pt-2 justify-center scrollbar-hide">
                            {avatars.map(avatar => (
                                <button
                                    key={avatar}
                                    type="button"
                                    onClick={() => setSelectedAvatar(avatar)}
                                    disabled={loading}
                                    className={`text-2xl p-2 rounded-xl transition-all hover:scale-110 disabled:cursor-not-allowed ${selectedAvatar === avatar ? 'bg-neon-purple/20 scale-110 shadow-lg' : 'opacity-50 hover:opacity-100'}`}
                                >
                                    {avatar}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vibe Quiz Section */}
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 text-center">Vibe Check</label>
                        <div className="flex justify-between gap-4">
                            {/* Time Preference */}
                            <div
                                onClick={() => !loading && setIsNightOwl(!isNightOwl)}
                                className={`flex-1 cursor-pointer bg-white/5 p-3 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <span className={isNightOwl ? "opacity-30" : "font-bold text-yellow-400"}>☀️ Early</span>
                                <div className="w-10 h-5 bg-black rounded-full relative mx-2">
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${isNightOwl ? 'bg-neon-purple right-0.5' : 'bg-yellow-400 left-0.5'}`} />
                                </div>
                                <span className={!isNightOwl ? "opacity-30" : "font-bold text-neon-purple"}>🌙 Late</span>
                            </div>

                            {/* Comm Preference */}
                            <div
                                onClick={() => !loading && setIsTexter(!isTexter)}
                                className={`flex-1 cursor-pointer bg-white/5 p-3 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                <span className={isTexter ? "opacity-30" : "font-bold text-green-400"}>🗣️ Voice</span>
                                <div className="w-10 h-5 bg-black rounded-full relative mx-2">
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${isTexter ? 'bg-neon-blue right-0.5' : 'bg-green-400 left-0.5'}`} />
                                </div>
                                <span className={!isTexter ? "opacity-30" : "font-bold text-neon-blue"}>💬 Text</span>
                            </div>
                        </div>
                    </div>

                    {/* Interests Section */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Top 3 Interests</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {interestsList.map(interest => (
                                <button
                                    key={interest}
                                    type="button"
                                    onClick={() => !loading && toggleInterest(interest)}
                                    disabled={loading}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed ${selectedInterests.includes(interest) ? 'bg-neon-blue text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-center mt-2 text-gray-500">{selectedInterests.length}/3 selected</p>
                    </div>

                    <NeonButton
                        type="submit"
                        className="w-full py-4 text-lg mt-4"
                        variant="primary"
                        glowColor="cyan"
                        disabled={!username || loading}
                    >
                        {loading ? "Saving..." : "CONTINUE TO VIBE"}
                    </NeonButton>
                </form>
            </motion.div>
        </GlassCard>
    );
}
