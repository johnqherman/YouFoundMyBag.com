import { Router, Request, Response } from 'express';
import { logger } from '../../infrastructure/logger/index.js';
import { extractBearerToken } from '../auth/utils.js';
import * as conversationService from './service.js';
import { verifyOwnerSession } from '../auth/service.js';
import {
  startConversationSchema,
  sendReplySchema,
  shortIdSchema,
} from '../../infrastructure/utils/validation.js';
import {
  StartConversationRequest,
  SendReplyRequest,
} from '../../client/types/index.js';
import { emailValidationMiddleware } from '../../infrastructure/utils/email-validation.js';

const router = Router();

router.post(
  '/bags/:shortId/conversations',
  emailValidationMiddleware({ fields: ['finder_email'] }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shortId } = req.params;

      const shortIdResult = shortIdSchema.safeParse(shortId);
      if (!shortIdResult.success) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Invalid bag ID format',
        });
        return;
      }

      const bodyResult = await startConversationSchema.safeParseAsync(req.body);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Please check your input',
          details: bodyResult.error.issues,
        });
        return;
      }

      const messageData: StartConversationRequest = bodyResult.data;

      const conversation = await conversationService.startConversation(
        shortIdResult.data,
        messageData
      );

      res.json({
        success: true,
        data: {
          conversation_id: conversation.id,
          message:
            'Message sent! The owner will receive an email notification.',
        },
      });
    } catch (error) {
      logger.error('Error starting conversation:', error);
      res.status(400).json({
        success: false,
        error: 'conversation_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      });
    }
  }
);

router.post(
  '/conversations/:conversationId/reply',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Conversation ID is required',
        });
        return;
      }

      const bodyData = {
        conversation_id: conversationId,
        message_content: req.body.message_content,
      };

      const bodyResult = sendReplySchema.safeParse(bodyData);
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Please check your input',
          details: bodyResult.error.issues,
        });
        return;
      }

      const { sender_type } = req.body;

      if (!sender_type || !['finder', 'owner'].includes(sender_type)) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'sender_type is required and must be "finder" or "owner"',
        });
        return;
      }

      if (sender_type === 'owner') {
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
          res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'Authentication required',
          });
          return;
        }

        const session = await verifyOwnerSession(token);
        if (!session) {
          res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'Invalid or expired session',
          });
          return;
        }
      }

      const replyData: SendReplyRequest = {
        conversation_id: conversationId,
        message_content: bodyResult.data.message_content,
      };

      const message = await conversationService.sendReply(
        conversationId,
        replyData,
        sender_type
      );

      res.json({
        success: true,
        data: {
          message_id: message.id,
          message: 'Reply sent successfully',
        },
      });
    } catch (error) {
      logger.error('Error sending reply:', error);
      res.status(400).json({
        success: false,
        error: 'reply_error',
        message:
          error instanceof Error ? error.message : 'Failed to send reply',
      });
    }
  }
);

router.get(
  '/conversations/archived',
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

      const session = await verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      const archivedConversations =
        await conversationService.getArchivedConversations(session.email);

      res.json({
        success: true,
        data: archivedConversations,
      });
    } catch (error) {
      logger.error('Error getting archived conversations:', error);
      res.status(500).json({
        success: false,
        error: 'archived_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get archived conversations',
      });
    }
  }
);

router.get(
  '/conversations/:conversationId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Conversation ID is required',
        });
        return;
      }

      const viewerType = req.query.viewer_type as
        | 'finder'
        | 'owner'
        | undefined;
      const viewerEmail = req.query.viewer_email as string | undefined;

      if (!viewerType || !['finder', 'owner'].includes(viewerType)) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'viewer_type is required and must be "finder" or "owner"',
        });
        return;
      }

      let sessionEmail = viewerEmail;

      if (viewerType === 'owner') {
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
          res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'Authentication required',
          });
          return;
        }

        const session = await verifyOwnerSession(token);
        if (!session) {
          res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'Invalid or expired session',
          });
          return;
        }

        sessionEmail = session.email;
        logger.debug(`DEBUG: Using session email for access: ${sessionEmail}`);
      }

      const thread = await conversationService.getConversationThread(
        conversationId,
        viewerType,
        sessionEmail
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
      logger.error('Error getting conversation:', error);
      const status =
        error instanceof Error && error.message === 'Access denied' ? 403 : 500;
      res.status(status).json({
        success: false,
        error: 'conversation_error',
        message:
          error instanceof Error ? error.message : 'Failed to get conversation',
      });
    }
  }
);

router.post(
  '/conversations/:conversationId/resolve',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Conversation ID is required',
        });
        return;
      }

      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const session = await verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      await conversationService.resolveConversation(
        conversationId,
        session.email
      );

      res.json({
        success: true,
        message: 'Conversation resolved successfully',
      });
    } catch (error) {
      logger.error('Error resolving conversation:', error);
      const status =
        error instanceof Error && error.message === 'Access denied' ? 403 : 500;
      res.status(status).json({
        success: false,
        error: 'resolve_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to resolve conversation',
      });
    }
  }
);

router.post(
  '/conversations/:conversationId/archive',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Conversation ID is required',
        });
        return;
      }

      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const session = await verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      await conversationService.archiveConversation(
        conversationId,
        session.email
      );

      res.json({
        success: true,
        message: 'Conversation archived successfully',
      });
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      const status =
        error instanceof Error && error.message === 'Access denied' ? 403 : 500;
      res.status(status).json({
        success: false,
        error: 'archive_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to archive conversation',
      });
    }
  }
);

router.post(
  '/conversations/:conversationId/restore',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: 'validation_error',
          message: 'Conversation ID is required',
        });
        return;
      }

      const token = extractBearerToken(req.headers.authorization);
      if (!token) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const session = await verifyOwnerSession(token);
      if (!session) {
        res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Invalid or expired session',
        });
        return;
      }

      await conversationService.restoreConversation(
        conversationId,
        session.email
      );

      res.json({
        success: true,
        message: 'Conversation restored successfully',
      });
    } catch (error) {
      logger.error('Error restoring conversation:', error);
      const status =
        error instanceof Error && error.message === 'Access denied' ? 403 : 500;
      res.status(status).json({
        success: false,
        error: 'restore_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to restore conversation',
      });
    }
  }
);

export { router as conversationRoutes };
