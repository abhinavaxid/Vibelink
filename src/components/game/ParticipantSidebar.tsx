import React from 'react';
import { User } from '@/context/UserContext';

interface ParticipantSidebarProps {
    participants: (User & { score: number; isSimulated?: boolean; online?: boolean })[];
    currentUser?: User;
}

const ParticipantSidebar: React.FC<ParticipantSidebarProps> = ({ participants, currentUser }) => {
    return (
        <div className="w-80 h-screen bg-black/80 border-l border-white/10 flex flex-col backdrop-blur-md hidden lg:flex">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                    PARTICIPANTS
                    <span className="text-xs bg-white/10 px-2 py-1 rounded ml-auto text-gray-400">
                        {participants.length}
                    </span>
                </h2>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {participants.map((p, i) => (
                    <div
                        key={p.id || i}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${p.id === currentUser?.id
                                ? 'bg-neon-blue/10 border-neon-blue/50'
                                : 'bg-white/5 border-transparent hover:border-white/20'
                            }`}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-lg border border-white/10">
                                {p.avatar || '👤'}
                            </div>
                            {p.online && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <div className={`font-medium truncate ${p.id === currentUser?.id ? 'text-neon-cyan' : 'text-gray-200'}`}>
                                    {p.username || 'Unknown'} {p.id === currentUser?.id && '(You)'}
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>Score: {p.score || 0}</span>
                                {p.isSimulated && <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] uppercase">BOT</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 text-center text-xs text-gray-500">
                Waiting for next round...
            </div>
        </div>
    );
};

export default ParticipantSidebar;
