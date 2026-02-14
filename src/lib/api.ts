/**
 * API Client Service
 * Handles all communication with the VibeLink backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiRequestOptions extends RequestInit {
    token?: string;
}

// ==================== TYPE DEFINITIONS ====================
interface User {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    bio?: string;
}

interface AuthResponse {
    token: string;
    user: User;
}

interface Room {
    id: string;
    name: string;
    description?: string;
    maxParticipants: number;
    currentParticipants?: number;
}

interface GameSession {
    id: string;
    roomId: string;
    participantIds: string[];
    currentRound: number;
    totalRounds: number;
}

interface GameResponse {
    sessionId: string;
    roundNumber: number;
    response: string;
}

interface Match {
    id: string;
    user1Id: string;
    user2Id: string;
    roomId: string;
    gameSessionId: string;
}

interface LeaderboardEntry {
    userId: string;
    username: string;
    score: number;
    wins: number;
}

interface HealthCheckResponse {
    status: string;
    timestamp: string;
    environment?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: ApiRequestOptions = {}
    ): Promise<T> {
        const { token, ...fetchOptions } = options;
        const url = `${this.baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string> || {}),
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error (${response.status}): ${error}`);
        }

        return response.json() as Promise<T>;
    }

    // ==================== AUTHENTICATION ====================
    async register(payload: {
        email: string;
        username: string;
        password: string;
    }): Promise<AuthResponse> {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async login(payload: {
        email: string;
        password: string;
    }): Promise<AuthResponse> {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async refreshToken(token: string): Promise<{ token: string }> {
        return this.request('/api/auth/refresh', {
            method: 'POST',
            token,
        });
    }

    // ==================== USERS ====================
    async getCurrentUser(token: string): Promise<User> {
        return this.request('/api/users/me', {
            token,
        });
    }

    async updateProfile(
        token: string,
        payload: {
            username?: string;
            avatar?: string;
            interests?: string[];
            gender?: string;
            bio?: string;
        }
    ): Promise<User> {
        return this.request('/api/users/profile', {
            method: 'PUT',
            token,
            body: JSON.stringify(payload),
        });
    }

    async getUser(userId: string, token: string): Promise<User> {
        return this.request(`/api/users/${userId}`, {
            token,
        });
    }

    async getUserStats(
        userId: string,
        token: string
    ): Promise<{ wins: number; losses: number; totalMatches: number }> {
        return this.request(`/api/users/${userId}/stats`, {
            token,
        });
    }

    // ==================== ROOMS ====================
    async listRooms(token: string): Promise<Room[]> {
        return this.request('/api/rooms', {
            token,
        });
    }

    async getRoom(roomId: string, token: string): Promise<Room> {
        return this.request(`/api/rooms/${roomId}`, {
            token,
        });
    }

    async createRoom(
        token: string,
        payload: {
            name: string;
            description?: string;
            maxParticipants?: number;
        }
    ): Promise<Room> {
        return this.request('/api/rooms', {
            method: 'POST',
            token,
            body: JSON.stringify(payload),
        });
    }

    async joinRoom(roomId: string, token: string): Promise<Room> {
        return this.request(`/api/rooms/${roomId}/join`, {
            method: 'POST',
            token,
        });
    }

    async leaveRoom(roomId: string, token: string): Promise<{ success: boolean }> {
        return this.request(`/api/rooms/${roomId}/leave`, {
            method: 'POST',
            token,
        });
    }

    // ==================== GAMES ====================
    async createGameSession(
        token: string,
        payload: {
            roomId: string;
            participantIds: string[];
        }
    ): Promise<GameSession> {
        return this.request('/api/games/session', {
            method: 'POST',
            token,
            body: JSON.stringify(payload),
        });
    }

    async getGameSession(sessionId: string, token: string): Promise<GameSession> {
        return this.request(`/api/games/session/${sessionId}`, {
            token,
        });
    }

    async submitRoundResponse(
        token: string,
        payload: {
            sessionId: string;
            roundNumber: number;
            response: string;
        }
    ): Promise<GameResponse> {
        return this.request('/api/games/response', {
            method: 'POST',
            token,
            body: JSON.stringify(payload),
        });
    }

    async getGameResults(
        sessionId: string,
        token: string
    ): Promise<{ sessionId: string; results: Record<string, unknown> }> {
        return this.request(`/api/games/session/${sessionId}/results`, {
            token,
        });
    }

    // ==================== MATCHES ====================
    async createMatch(
        token: string,
        payload: {
            user1Id: string;
            user2Id: string;
            roomId: string;
            gameSessionId: string;
        }
    ): Promise<Match> {
        return this.request('/api/matches', {
            method: 'POST',
            token,
            body: JSON.stringify(payload),
        });
    }

    async getMatches(token: string): Promise<Match[]> {
        return this.request('/api/matches', {
            token,
        });
    }

    async getMatchDetails(matchId: string, token: string): Promise<Match> {
        return this.request(`/api/matches/${matchId}`, {
            token,
        });
    }

    // ==================== LEADERBOARDS ====================
    async getLeaderboard(token: string): Promise<LeaderboardEntry[]> {
        return this.request('/api/leaderboard', {
            token,
        });
    }

    // ==================== HEALTH ====================
    async healthCheck(): Promise<HealthCheckResponse> {
        return this.request('/api/health', {
            method: 'GET',
        });
    }
}

export const apiClient = new ApiClient(API_URL);
export type {
    ApiRequestOptions,
    User,
    AuthResponse,
    Room,
    GameSession,
    GameResponse,
    Match,
    LeaderboardEntry,
    HealthCheckResponse,
};
