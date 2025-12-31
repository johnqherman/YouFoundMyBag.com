import express from 'express';
import {
  sendMessageSchema,
  shortIdSchema,
} from '../../infrastructure/utils/validation.js';
import * as messagingService from './service.js';

const router = express.Router();

router.post('/:shortId/message', async (req, res): Promise<void> => {
  try {
    const parseResult = shortIdSchema.safeParse(req.params.shortId);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid bag ID',
        message: 'The bag ID format is incorrect',
      });
      return;
    }

    const validatedData = sendMessageSchema.parse(req.body);
    const ipHash = messagingService.getClientIpHash(req);

    await messagingService.sendMessageToBagOwner(
      parseResult.data,
      validatedData,
      ipHash
    );

    res.json({
      success: true,
      message: 'Your message has been sent to the bag owner',
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'issues' in error) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid message data',
        details: (error as { issues: unknown }).issues,
      });
      return;
    }

    console.error('Failed to send message:', error);

    const errorMessage = error instanceof Error ? error.message : '';
    const statusCode = errorMessage.includes('verification')
      ? 400
      : errorMessage.includes('not found')
        ? 404
        : 500;

    res.status(statusCode).json({
      error: 'Message failed',
      message: errorMessage || 'Failed to send message',
    });
  }
});

export default router;
