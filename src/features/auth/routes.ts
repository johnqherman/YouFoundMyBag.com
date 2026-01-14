import { Router, Request, Response } from 'express';
import { logger } from '../../infrastructure/logger/index.js';
import * as authService from './service.js';
import * as conversationService from '../conversations/service.js';
import * as bagRepository from '../bags/repository.js';
import { ConversationThread } from '../../client/types/index.js';
import {
  magicLinkSchema,
  verifyMagicLinkSchema,
  emailSchema,
} from '../../infrastructure/utils/validation.js';
import { extractBearerToken } from './utils.js';
import {
  authMagicLinkRateLimit,
  authVerifyRateLimit,
} from '../security/middleware.js';

const router = Router();

router.post(
  '/auth/magic-link',
  authMagicLinkRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bodyResult = magicLinkSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Please provide a valid email address',
          details: bodyResult.error.issues,
        });
        return;
      }

      const { email, conversation_id, bag_ids } = bodyResult.data;

      await authService.generateMagicLink(email, conversation_id, bag_ids);

      res.json({
        success: true,
        message: 'Magic link sent! Check your email to access your dashboard.',
      });
    } catch (error) {
      logger.error('Error generating magic link:', error);
      res.status(400).json({
        success: false,
        error: 'magic_link_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to generate magic link',
      });
    }
  }
);

router.post(
  '/auth/verify',
  authVerifyRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bodyResult = verifyMagicLinkSchema.safeParse(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid magic link token',
          details: bodyResult.error.issues,
        });
        return;
      }

      const { magic_token } = bodyResult.data;

      const { sessionToken, session } =
        await authService.verifyMagicLink(magic_token);

      res.json({
        success: true,
        data: {
          session_token: sessionToken,
          email: session.email,
          expires_at: session.expires_at,
        },
      });
    } catch (error) {
      logger.debug('DEBUG: Error verifying magic link:', error);
      logger.debug(
        'DEBUG: Error type:',
        error instanceof Error ? error.constructor.name : typeof error
      );
      logger.debug(
        'DEBUG: Error message:',
        error instanceof Error ? error.message : String(error)
      );
      res.status(400).json({
        success: false,
        error: 'verification_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to verify magic link',
      });
    }
  }
);

router.get(
  '/auth/dashboard',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const session = await authService.verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      const [allBags, conversations] = await Promise.all([
        bagRepository.getBagsByOwnerEmail(session.email),
        conversationService.getOwnerConversations(session.email),
      ]);

      const bagMap = new Map<
        string,
        {
          id: string;
          short_id: string;
          owner_name?: string;
          bag_name?: string;
          status: 'active' | 'disabled';
          created_at: string;
          conversations: ConversationThread[];
          conversation_count: number;
          unread_count: number;
          latest_conversation: string | null;
        }
      >(
        allBags.map((bag) => [
          bag.id,
          {
            id: bag.id,
            short_id: bag.short_id,
            owner_name: bag.owner_name,
            bag_name: bag.bag_name,
            status: bag.status,
            created_at: bag.created_at.toISOString(),
            conversations: [],
            conversation_count: 0,
            unread_count: 0,
            latest_conversation: null,
          },
        ])
      );

      conversations.forEach((thread) => {
        const bagId = thread.conversation.bag_id;
        const bag = bagMap.get(bagId);

        if (bag) {
          bag.conversations.push(thread);
          bag.conversation_count++;
          bag.unread_count += thread.unread_count || 0;

          if (
            !bag.latest_conversation ||
            thread.conversation.last_message_at > bag.latest_conversation
          ) {
            bag.latest_conversation = thread.conversation.last_message_at;
          }
        }
      });

      const bags = Array.from(bagMap.values()).map((bag) => ({
        id: bag.id,
        short_id: bag.short_id,
        owner_name: bag.owner_name,
        bag_name: bag.bag_name,
        status: bag.status,
        created_at: bag.created_at,
        conversation_count: bag.conversation_count,
        unread_count: bag.unread_count,
        latest_conversation: bag.latest_conversation,
      }));

      res.json({
        success: true,
        data: {
          owner_email: session.email,
          bags: bags.sort(
            (a, b) =>
              new Date(b.latest_conversation || b.created_at).getTime() -
              new Date(a.latest_conversation || a.created_at).getTime()
          ),
          conversations,
        },
      });
    } catch (error) {
      logger.error('Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'dashboard_error',
        message: 'Failed to load dashboard data',
      });
    }
  }
);

router.post(
  '/auth/logout',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      await authService.logout(token);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Error logging out:', error);
      res.status(500).json({
        success: false,
        error: 'logout_error',
        message: 'Failed to log out',
      });
    }
  }
);

router.post(
  '/auth/request-magic-link',
  authMagicLinkRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bodyResult = emailSchema.safeParse(req.body.email);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Please provide a valid email address',
        });
        return;
      }

      const email = bodyResult.data;
      const conversationId = req.body.conversation_id;

      const result = await authService.requestMagicLinkReissue(
        email,
        conversationId
      );

      res.json({
        success: true,
        message:
          "If your email exists in our system, you'll receive magic links shortly.",
        data: result,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Too many requests')
      ) {
        res.status(429).json({
          success: false,
          error: 'rate_limit_exceeded',
          message: error.message,
        });
        return;
      }

      logger.error('Error requesting magic link reissue:', error);
      res.status(500).json({
        success: false,
        error: 'request_error',
        message: 'Failed to process request. Please try again later.',
      });
    }
  }
);

export { router as authRoutes };
