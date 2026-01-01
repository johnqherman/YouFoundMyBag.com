import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyFinderMagicLink, verifyFinderSession } from '../auth/service.js';
import * as conversationService from './service.js';
import { verifyMagicLinkSchema } from '../../infrastructure/utils/validation.js';

const router = Router();

router.post(
  '/finder/auth/verify',
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('DEBUG: Finder auth verify request received');
      console.log('DEBUG: Request body keys:', Object.keys(req.body));

      const bodyResult = verifyMagicLinkSchema.safeParse(req.body);
      if (!bodyResult.success) {
        console.log('DEBUG: Finder validation failed for magic link token');
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
        `DEBUG: Processing finder magic token: ${magic_token.substring(0, 8)}...`
      );

      const { sessionToken, finderEmail, conversationId } =
        await verifyFinderMagicLink(magic_token);

      console.log(
        `DEBUG: Finder magic link verification successful for email: ${finderEmail}, conversation: ${conversationId}`
      );
      res.json({
        success: true,
        data: {
          session_token: sessionToken,
          finder_email: finderEmail,
          conversation_id: conversationId,
        },
      });
    } catch (error) {
      console.error('DEBUG: Error verifying finder magic link:', error);
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
  '/finder/conversation/:conversationId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;

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
      const session = await verifyFinderSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      if (session.conversationId !== conversationId) {
        res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'Access denied - session not valid for this conversation',
        });
        return;
      }

      const thread = await conversationService.getConversationThread(
        conversationId!,
        'finder',
        session.finderEmail
      );

      if (!thread) {
        res.status(404).json({
          success: false,
          error: 'not_found',
          message: 'Conversation not found',
        });
        return;
      }

      res.json({
        success: true,
        data: thread,
      });
    } catch (error) {
      console.error('Error getting finder conversation:', error);
      res.status(500).json({
        success: false,
        error: 'conversation_error',
        message: 'Failed to load conversation',
      });
    }
  }
);

router.post(
  '/finder/conversation/:conversationId/reply',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const { message_content } = req.body;

      if (!message_content?.trim()) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Message content is required',
        });
        return;
      }

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
      const session = await verifyFinderSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      if (session.conversationId !== conversationId) {
        res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'Access denied - session not valid for this conversation',
        });
        return;
      }

      const reply = await conversationService.sendReply(
        conversationId!,
        { conversation_id: conversationId!, message_content },
        'finder'
      );

      res.json({
        success: true,
        data: reply,
      });
    } catch (error) {
      console.error('Error sending finder reply:', error);
      res.status(500).json({
        success: false,
        error: 'reply_error',
        message: 'Failed to send reply',
      });
    }
  }
);

export { router as finderRoutes };
