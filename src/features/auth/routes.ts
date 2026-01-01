import { Router } from 'express';
import type { Request, Response } from 'express';
import * as authService from './service.js';
import * as conversationService from '../conversations/service.js';
import {
  magicLinkSchema,
  verifyMagicLinkSchema,
} from '../../infrastructure/utils/validation.js';

const router = Router();

router.post(
  '/auth/magic-link',
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
      console.error('Error generating magic link:', error);
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('DEBUG: Auth verify request received');
      console.log('DEBUG: Request body keys:', Object.keys(req.body));

      const bodyResult = verifyMagicLinkSchema.safeParse(req.body);
      if (!bodyResult.success) {
        console.log('DEBUG: Validation failed for magic link token');
        console.log('DEBUG: Validation errors:', bodyResult.error.issues);
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid magic link token',
          details: bodyResult.error.issues,
        });
        return;
      }

      const { magic_token } = bodyResult.data;
      console.log(
        `DEBUG: Processing magic token: ${magic_token.substring(0, 8)}...`
      );

      const { sessionToken, session } =
        await authService.verifyMagicLink(magic_token);

      console.log(
        `DEBUG: Magic link verification successful for email: ${session.email}`
      );
      res.json({
        success: true,
        data: {
          session_token: sessionToken,
          email: session.email,
          expires_at: session.expires_at,
        },
      });
    } catch (error) {
      console.error('DEBUG: Error verifying magic link:', error);
      console.error(
        'DEBUG: Error type:',
        error instanceof Error ? error.constructor.name : typeof error
      );
      console.error(
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
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const token = authHeader.substring(7);
      const session = await authService.verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      const conversations = await conversationService.getOwnerConversations(
        session.email
      );

      const bagMap = new Map();

      conversations.forEach((thread) => {
        const bagId = thread.conversation.bag_id;
        const shortId = thread.bag.short_id;

        if (!bagMap.has(bagId)) {
          bagMap.set(bagId, {
            id: bagId,
            short_id: shortId,
            display_name: thread.bag.display_name,
            status: thread.bag.status,
            created_at: thread.conversation.created_at,
            conversations: [],
            conversation_count: 0,
            unread_count: 0,
            latest_conversation: null,
          });
        }

        const bag = bagMap.get(bagId);
        bag.conversations.push(thread);
        bag.conversation_count++;

        const unreadMessages = thread.messages.filter(
          (msg) => msg.sender_type === 'finder' && !msg.read_at
        );
        bag.unread_count += unreadMessages.length;

        if (
          !bag.latest_conversation ||
          thread.conversation.last_message_at > bag.latest_conversation
        ) {
          bag.latest_conversation = thread.conversation.last_message_at;
        }
      });

      const bags = Array.from(bagMap.values()).map((bag) => ({
        id: bag.id,
        short_id: bag.short_id,
        display_name: bag.display_name,
        status: bag.status,
        created_at: bag.created_at,
        conversation_count: bag.conversation_count,
        unread_count: bag.unread_count,
        latest_conversation: bag.latest_conversation,
      }));

      res.json({
        success: true,
        data: {
          bags: bags.sort(
            (a, b) =>
              new Date(b.latest_conversation || b.created_at).getTime() -
              new Date(a.latest_conversation || a.created_at).getTime()
          ),
          conversations,
        },
      });
    } catch (error) {
      console.error('Error getting dashboard:', error);
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
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const token = authHeader.substring(7);
      await authService.logout(token);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({
        success: false,
        error: 'logout_error',
        message: 'Failed to logout',
      });
    }
  }
);

export { router as authRoutes };
