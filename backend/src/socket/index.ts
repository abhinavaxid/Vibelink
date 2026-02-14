import { Server as SocketIOServer, Socket } from 'socket.io';
import { query } from '../database/connection';
import { GameSessionRepository } from '../repositories/GameSessionRepository';
import { verifyToken } from '../utils/auth';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  sessionId?: string;
}

/**
 * Setup Socket.io event handlers
 */
export function setupSocketHandlers(io: SocketIOServer): void {
  // Middleware: Authenticate socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication failed'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    socket.userId = payload.userId;
    socket.username = payload.username;
    next();
  });

  // Client connected
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User ${socket.username} connected: ${socket.id}`);

    /**
     * JOIN_SESSION - User joins a game session
     */
    socket.on(
      'join-session',
      async (data: { sessionId: string }, callback) => {
        try {
          const { sessionId } = data;

          // Verify session exists
          const session = await GameSessionRepository.findById(sessionId);
          if (!session) {
            return callback({ success: false, error: 'Session not found' });
          }

          // Check if user is participant
          if (!session.participant_ids.includes(socket.userId!)) {
            return callback({
              success: false,
              error: 'Not a participant in this session',
            });
          }

          // Join room
          socket.join(sessionId);
          socket.sessionId = sessionId;

          // Notify others
          socket.broadcast.to(sessionId).emit('user-joined', {
            userId: socket.userId,
            username: socket.username,
          });

          callback({
            success: true,
            data: { session },
          });
        } catch (error) {
          console.error('Error joining session:', error);
          callback({ success: false, error: 'Internal server error' });
        }
      }
    );

    /**
     * START_GAME - Start game session
     */
    socket.on('start-game', async (data: { sessionId: string }, callback) => {
      try {
        const { sessionId } = data;

        // Update session status
        const updated = await GameSessionRepository.updateStatus(
          sessionId,
          'playing',
          'questions'
        );

        // Notify all participants
        io.to(sessionId).emit('game-started', {
          session: updated,
          timestamp: new Date(),
        });

        callback({ success: true });
      } catch (error) {
        console.error('Error starting game:', error);
        callback({ success: false, error: 'Failed to start game' });
      }
    });

    /**
     * SUBMIT_RESPONSE - Submit round response
     */
    socket.on(
      'submit-response',
      async (
        data: {
          sessionId: string;
          roundNumber: number;
          roundType: string;
          responseText: string;
        },
        callback
      ) => {
        try {
          const { sessionId, roundNumber, roundType, responseText } = data;

          // Insert response
          const result = await query(
            `INSERT INTO round_responses 
             (game_session_id, user_id, round_number, round_type, response_text, raw_score)
             VALUES ($1, $2, $3, $4, $5, 10)
             RETURNING *`,
            [sessionId, socket.userId, roundNumber, roundType, responseText]
          );

          // Broadcast response count update
          io.to(sessionId).emit('response-submitted', {
            userId: socket.userId,
            username: socket.username,
            roundNumber,
          });

          callback({ success: true, data: result.rows[0] });
        } catch (error) {
          console.error('Error submitting response:', error);
          callback({ success: false, error: 'Failed to submit response' });
        }
      }
    );

    /**
     * SEND_MESSAGE - Send chat message in session
     */
    socket.on(
      'send-message',
      async (
        data: { sessionId: string; message: string; roundType?: string },
        callback
      ) => {
        try {
          const { sessionId, message, roundType = 'general' } = data;

          // Store message
          const result = await query(
            `INSERT INTO chat_messages 
             (game_session_id, sender_id, message_text, round_type)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [sessionId, socket.userId, message, roundType]
          );

          // Broadcast message
          io.to(sessionId).emit('new-message', {
            id: result.rows[0].id,
            sender: {
              id: socket.userId,
              username: socket.username,
            },
            message,
            roundType,
            timestamp: new Date(),
          });

          callback({ success: true });
        } catch (error) {
          console.error('Error sending message:', error);
          callback({ success: false, error: 'Failed to send message' });
        }
      }
    );

    /**
     * NEXT_ROUND - Advance to next round
     */
    socket.on('next-round', async (data: { sessionId: string }, callback) => {
      try {
        const { sessionId } = data;

        // Get current session
        const session = await GameSessionRepository.findById(sessionId);
        if (!session) {
          return callback({ success: false, error: 'Session not found' });
        }

        // Determine next round
        const roundSequence = [
          'questions',
          'synergy',
          'blindChat',
          'humor',
          'results',
        ];
        const currentIndex = roundSequence.indexOf(session.game_state || 'questions');
        const nextIndex = currentIndex + 1;

        if (nextIndex >= roundSequence.length) {
          // Game finished
          await GameSessionRepository.endSession(sessionId);
          io.to(sessionId).emit('game-finished', {
            timestamp: new Date(),
          });
        } else {
          // Next round
          const nextState = roundSequence[nextIndex];
          await GameSessionRepository.update(sessionId, {
            game_state: nextState,
            current_round: nextIndex,
          });

          io.to(sessionId).emit('round-changed', {
            round: nextIndex,
            gameState: nextState,
            timestamp: new Date(),
          });
        }

        callback({ success: true });
      } catch (error) {
        console.error('Error advancing round:', error);
        callback({ success: false, error: 'Failed to advance round' });
      }
    });

    /**
     * VOTE_MEME - Vote on a meme
     */
    socket.on(
      'vote-meme',
      async (
        data: { sessionId: string; memeId: string; reactionType: string },
        callback
      ) => {
        try {
          const { sessionId, memeId, reactionType } = data;

          // Store reaction
          const result = await query(
            `INSERT INTO meme_reactions (meme_id, user_id, reaction_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (meme_id, user_id) 
             DO UPDATE SET reaction_type = EXCLUDED.reaction_type
             RETURNING *`,
            [memeId, socket.userId, reactionType]
          );

          // Update total reactions count
          await query(
            `UPDATE meme_uploads 
             SET total_reactions = (
               SELECT COUNT(*) FROM meme_reactions WHERE meme_id = $1
             )
             WHERE id = $1`,
            [memeId]
          );

          // Broadcast vote
          io.to(sessionId).emit('meme-voted', {
            memeId,
            userId: socket.userId,
            reactionType,
          });

          callback({ success: true });
        } catch (error) {
          console.error('Error voting on meme:', error);
          callback({ success: false, error: 'Failed to vote' });
        }
      }
    );

    /**
     * AUDIENCE_VOTE - Audience member votes
     */
    socket.on(
      'audience-vote',
      async (
        data: {
          sessionId: string;
          category: string;
          nomineeId: string;
        },
        callback
      ) => {
        try {
          const { sessionId, category, nomineeId } = data;

          // Store vote
          await query(
            `INSERT INTO audience_votes 
             (game_session_id, voter_id, category, nominee_id, vote_weight)
             VALUES ($1, $2, $3, $4, 1)`,
            [sessionId, socket.userId, category, nomineeId]
          );

          // Broadcast vote update
          io.to(sessionId).emit('audience-vote-recorded', {
            category,
            nomineeId,
            totalVotes: await getVoteCount(sessionId, category, nomineeId),
          });

          callback({ success: true });
        } catch (error) {
          console.error('Error recording vote:', error);
          callback({ success: false, error: 'Failed to record vote' });
        }
      }
    );

    /**
     * GET_SESSION_UPDATES - Get current session state
     */
    socket.on(
      'get-session',
      async (data: { sessionId: string }, callback) => {
        try {
          const { sessionId } = data;

          const session =
            await GameSessionRepository.getSessionWithMatches(sessionId);
          if (!session) {
            return callback({ success: false, error: 'Session not found' });
          }

          callback({ success: true, data: session });
        } catch (error) {
          console.error('Error getting session:', error);
          callback({ success: false, error: 'Failed to get session' });
        }
      }
    );

    /**
     * User disconnected
     */
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.username} disconnected: ${socket.id}`);

      if (socket.sessionId) {
        socket.broadcast.to(socket.sessionId).emit('user-left', {
          userId: socket.userId,
          username: socket.username,
        });
      }
    });
  });
}

/**
 * Helper: Get vote count
 */
async function getVoteCount(
  sessionId: string,
  category: string,
  nomineeId: string
): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM audience_votes 
     WHERE game_session_id = $1 AND category = $2 AND nominee_id = $3`,
    [sessionId, category, nomineeId]
  );

  return parseInt(result.rows[0].count);
}

export default setupSocketHandlers;
