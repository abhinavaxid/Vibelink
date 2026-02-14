/**
 * API Client Service
 * Handles all communication with the VibeLink backend
 */

const API_URL = '';

interface ApiRequestOptions extends RequestInit {
    token?: string;
}

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: {
        message?: string;
    };
    message?: string;
}

// ==================== TYPE DEFINITIONS ====================
interface User {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    bio?: string;
    gender?: string;
    interests?: string[];
    vibeCharacteristics?: {
        nightOwl: boolean;
        texter: boolean;
    };
    vibeScore?: number;
    createdAt?: string;
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

        const rawText = await response.text();
        let parsedBody: any = {};
        if (rawText) {
            try {
                parsedBody = JSON.parse(rawText);
            } catch {
                parsedBody = {};
            }
        }

        if (!response.ok) {
            const message =
                parsedBody?.error?.message ||
                parsedBody?.message ||
                rawText ||
                `Request failed with status ${response.status}`;
            throw new Error(`API Error (${response.status}): ${message}`);
        }

        const envelope = parsedBody as ApiEnvelope<T>;
        if (
            envelope &&
            typeof envelope === 'object' &&
            'success' in envelope
        ) {
            if (!envelope.success) {
                const message =
                    envelope.error?.message ||
                    envelope.message ||
                    'Request failed';
                throw new Error(message);
            }

            if (envelope.data !== undefined) {
                return envelope.data;
            }
        }

        return parsedBody as T;
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
        const result = await this.request<{ user: User }>('/api/users/me', {
            token,
        });
        return result.user;
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
        const result = await this.request<{ user: User }>('/api/users/me', {
            method: 'PATCH',
            token,
            body: JSON.stringify(payload),
        });
        return result.user;
    }

    async getUser(userId: string, token: string): Promise<User> {
        const result = await this.request<{ user: User }>(`/api/users/${userId}`, {
            token,
        });
        return result.user;
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
        const result = await this.request<{ rooms: Room[] }>('/api/rooms', {
            token,
        });
        return result.rooms || [];
    }

    async getRoom(roomId: string, token: string): Promise<Room> {
        const result = await this.request<{ room: Room }>(`/api/rooms/${roomId}`, {
            token,
        });
        return result.room;
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
        const result = await this.request<{ session: GameSession }>('/api/games/session', {
            method: 'POST',
            token,
            body: JSON.stringify(payload),
        });
        return result.session;
    }

    async getGameSession(sessionId: string, token: string): Promise<GameSession> {
        const result = await this.request<{ session: GameSession }>(`/api/games/session/${sessionId}`, {
            token,
        });
        return result.session;
    }

    async submitRoundResponse(
        token: string,
        payload: {
            sessionId: string;
            roundNumber: number;
            response: string;
        }
    ): Promise<GameResponse> {
        const result = await this.request<{ response: GameResponse }>(`/api/games/session/${payload.sessionId}/response`, {
            method: 'POST',
            token,
            body: JSON.stringify({
                roundNumber: payload.roundNumber,
                roundType: 'text',
                responseText: payload.response,
            }),
        });
        return result.response;
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
        return this.request('/health', {
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
