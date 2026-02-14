"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login, register, isAuthenticated } = useUser();
    const router = useRouter();

    // Redirect if already authenticated
    if (isAuthenticated) {
        router.push('/onboarding');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isLogin) {
                if (!email || !password) {
                    setError("Please fill in all fields");
                    setLoading(false);
                    return;
                }
                await login(email, password);
            } else {
                if (!email || !username || !password) {
                    setError("Please fill in all fields");
                    setLoading(false);
                    return;
                }
                await register(email, username, password);
            }
            router.push('/onboarding');
        } catch (err: any) {
            setError(err.message || "Authentication failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full bg-black -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-blue/20 rounded-full blur-[100px] animate-pulse delay-1000" />
            </div>

            <GlassCard className="w-full max-w-md p-8" variant="default" glowColor="purple">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-black mb-2 tracking-tighter text-white">
                            VIBE<span className="text-neon-purple">LINK</span>
                        </h1>
                        <p className="text-gray-400">Where connections come alive.</p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-lg mb-6">
                        <button
                            onClick={() => {
                                setIsLogin(true);
                                setError("");
                            }}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                                isLogin
                                    ? "bg-white/10 text-white shadow-lg"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            ENTER VIBE
                        </button>
                        <button
                            onClick={() => {
                                setIsLogin(false);
                                setError("");
                            }}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                                !isLogin
                                    ? "bg-white/10 text-white shadow-lg"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            JOIN VIBE
                        </button>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm mb-4"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-purple outline-none transition-all"
                                placeholder="you@vibe.link"
                                disabled={loading}
                            />
                        </div>

                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-purple outline-none transition-all"
                                    placeholder="UniqueAlias"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-neon-purple outline-none transition-all"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>

                        <NeonButton
                            type="submit"
                            className="w-full py-3 mt-6"
                            variant="primary"
                            glowColor="purple"
                            disabled={loading}
                        >
                            {loading
                                ? "Processing..."
                                : isLogin
                                  ? "ENTER VIBE"
                                  : "JOIN VIBE"}
                        </NeonButton>
                    </form>

                    <p className="text-center text-xs text-gray-500 mt-4">
                        {isLogin
                            ? "Don't have an account? "
                            : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-neon-blue hover:text-neon-purple transition-colors font-bold"
                        >
                            {isLogin ? "Sign up" : "Log in"}
                        </button>
                    </p>
                </motion.div>
            </GlassCard>
        </div>
    );
}
