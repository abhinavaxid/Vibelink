"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RoundRouter from '@/components/game/RoundRouter';
import { useGame } from '@/context/GameContext';

interface Player {
  id: string;
  name: string;
  score: number;
  avatar?: string;
}

import ParticipantSidebar from '@/components/game/ParticipantSidebar';
import { useUser } from '@/context/UserContext';

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const { gameState, joinRoom, startGame, isGameFinished } = useGame();
  const { user } = useUser();

  // Initialize room on mount
  useEffect(() => {
    if (roomId) {
      joinRoom(roomId);
      // Optional: Auto-start or wait for user? 
      // User context seems to handle "startGame" manually or auto-start in context?
      // Context has auto-start logic?
      // Let's just join for now.
    }
  }, [roomId, joinRoom]);

  // Handle Loading State
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="animate-pulse">Loading Room...</div>
      </div>
    );
  }

  const handlePlayAgain = () => {
    console.log("🔄 Play Again Clicked - Restarting Game");
    startGame();
  };

  const handleBackToMenu = () => {
    window.location.href = '/lobby';
  };

  // Safe Cast for RoundRouter (it expects a specific shape, GameState matches mostly)
  // We map 'username' from User to 'name' for Player interface
  const mappedState = {
    gameState: gameState.gameState,
    players: gameState.users.map(u => ({
      id: u.id,
      name: u.username || 'Unknown',
      score: u.score || 0,
      avatar: u.avatar
    })),
    gameType: 'Vibe Link Challenge'
  };

  return (
    <div className="min-h-screen bg-gray-900 flex overflow-hidden">
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto relative">
          <RoundRouter
            gameState={mappedState}
            isGameFinished={isGameFinished}
            onPlayAgain={handlePlayAgain}
            onBackToMenu={handleBackToMenu}
          />
        </main>
      </div>
      <ParticipantSidebar participants={gameState.users} currentUser={user || undefined} />
    </div>
  );
}
