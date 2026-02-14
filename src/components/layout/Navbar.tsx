"use client";

import Link from 'next/link';
import { useUser } from "@/context/UserContext";

export function Navbar() {
    const { user, logout } = useUser();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/10 border-b border-white/5">
            <Link href="/" className="group flex items-center gap-2 text-2xl font-bold tracking-tighter text-white">
                <span className="text-white">Vibe</span>
                <span className="animate-glow-pulse text-neon-blue">Link</span>
            </Link>
            <div className="flex items-center gap-4">
                {user ? (
                    <>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <span className="text-xl">{user?.avatar}</span>
                            <span className="font-bold text-sm hidden sm:block">{user?.username}</span>
                        </div>
                        <button onClick={logout} className="text-xs hover:bg-red-500/20 hover:text-red-400 px-3 py-2 rounded transition-colors">
                            Logout
                        </button>
                    </>
                ) : (
                    <Link href="/login">
                        <button className="text-xs px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors">Login</button>
                    </Link>
                )}
            </div>
        </nav>
    );
}