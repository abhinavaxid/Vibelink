import { GameSessionRepository } from '../repositories/GameSessionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { hashPassword } from '../utils/auth';
import { query } from '../database/connection';

describe('Game Sessions', () => {
  let testUsers: any[] = [];
  let roomId: string;

  beforeAll(async () => {
    // Create test data
    // Create test users
    for (let i = 0; i < 4; i++) {
      const hash = await hashPassword('password123');
      const user = await UserRepository.create(
        `gameuser${i}@example.com`,
        `gameuser${i}`,
        hash
      );
      testUsers.push(user);
    }

    // Create test room
    const roomResult = await query(
      `INSERT INTO rooms (room_type, name, description, max_participants)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['friendship', 'Test Room', 'Test Description', 8]
    );
    roomId = roomResult.rows[0].id;
  });

  describe('Session Creation', () => {
    it('should create new game session', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id];

      const session = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      expect(session).toBeTruthy();
      expect(session.id).toBeTruthy();
      expect(session.room_id).toBe(roomId);
      expect(session.status).toBe('lobby');
      expect(session.participant_ids).toEqual(participantIds);
    });

    it('should find session by ID', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id];
      const created = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      const found = await GameSessionRepository.findById(created.id);

      expect(found).toBeTruthy();
      expect(found?.id).toBe(created.id);
      expect(found?.room_id).toBe(roomId);
    });
  });

  describe('Session Updates', () => {
    it('should update session status', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id];
      const session = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      const updated = await GameSessionRepository.updateStatus(
        session.id,
        'playing',
        'questions'
      );

      expect(updated?.status).toBe('playing');
      expect(updated?.game_state).toBe('questions');
    });

    it('should end session', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id];
      const session = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      const ended = await GameSessionRepository.endSession(session.id);

      expect(ended?.status).toBe('completed');
      expect(ended?.ended_at).toBeTruthy();
    });

    it('should get session with matches', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id];
      const session = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      // Create test match
      await query(
        `INSERT INTO matches 
         (game_session_id, user1_id, user2_id, connection_score, match_strength)
         VALUES ($1, $2, $3, $4, $5)`,
        [session.id, testUsers[0].id, testUsers[1].id, 85, 'excellent']
      );

      const sessionWithMatches =
        await GameSessionRepository.getSessionWithMatches(session.id);

      expect(sessionWithMatches?.matches).toBeTruthy();
      expect(sessionWithMatches?.matches.length).toBeGreaterThan(0);
    });
  });

  describe('Leaderboard', () => {
    it('should get session leaderboard', async () => {
      const participantIds = [
        testUsers[0].id,
        testUsers[1].id,
        testUsers[2].id,
      ];
      const session = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      // Add responses
      for (const userId of participantIds) {
        await query(
          `INSERT INTO round_responses 
           (game_session_id, user_id, round_number, round_type, response_text, raw_score)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [session.id, userId, 1, 'questions', 'Test response', Math.floor(Math.random() * 100)]
        );
      }

      const leaderboard = await GameSessionRepository.getLeaderboard(
        session.id
      );

      expect(leaderboard).toBeTruthy();
      expect(leaderboard.length).toBeGreaterThan(0);
      expect(leaderboard[0].rank).toBe(1);
    });
  });

  describe('User Sessions', () => {
    it('should get user session history', async () => {
      const userId = testUsers[0].id;
      const participantIds = [userId, testUsers[1].id];

      // Create multiple sessions for user
      for (let i = 0; i < 3; i++) {
        await GameSessionRepository.create(roomId, participantIds);
      }

      const sessions = await GameSessionRepository.getUserSessions(userId, 10);

      expect(sessions.length).toBeGreaterThanOrEqual(3);
      expect(sessions[0].participant_ids).toContain(userId);
    });
  });

  describe('Active Sessions', () => {
    it('should list active sessions', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id];
      const session = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      await GameSessionRepository.updateStatus(session.id, 'playing');

      const active = await GameSessionRepository.listActive();

      expect(active.length).toBeGreaterThan(0);
      expect(active.some((s) => s.status === 'playing')).toBe(true);
    });

    it('should list sessions by room', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id];

      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await GameSessionRepository.create(roomId, participantIds);
      }

      const sessions = await GameSessionRepository.listByRoom(roomId);

      expect(sessions.length).toBeGreaterThanOrEqual(3);
      expect(sessions.every((s) => s.room_id === roomId)).toBe(true);
    });
  });

  describe('Participant Count', () => {
    it('should count active participants', async () => {
      const participantIds = [testUsers[0].id, testUsers[1].id, testUsers[2].id];
      const session = await GameSessionRepository.create(
        roomId,
        participantIds
      );

      const count = await GameSessionRepository.countActiveParticipants(
        session.id
      );

      expect(count).toBe(1); // Only one participant list
    });
  });
});
