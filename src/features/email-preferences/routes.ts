import express from 'express';
import { logger } from '../../infrastructure/logger/index.js';
import * as emailPreferencesService from './service.js';
import { verifyOwnerSession } from '../auth/service.js';

const router = express.Router();

router.get('/token', async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const authToken = authHeader.substring(7);
    const session = await verifyOwnerSession(authToken);
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    const email = req.query.email as string;
    if (!email || email !== session.email) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const token = await emailPreferencesService.getUnsubscribeToken(email);

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    logger.error('Failed to get email preferences token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get email preferences token',
    });
  }
});

router.get('/:token', async (req, res): Promise<void> => {
  try {
    const { token } = req.params;
    const preferences = await emailPreferencesService.getPreferences(token);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to get email preferences:', error);
    res.status(404).json({
      error: 'Not found',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to load email preferences',
    });
  }
});

router.put('/:token', async (req, res): Promise<void> => {
  try {
    const { token } = req.params;
    const {
      all_emails_enabled,
      bag_created_enabled,
      conversation_notifications_enabled,
      reply_notifications_enabled,
    } = req.body;

    const preferences = await emailPreferencesService.updatePreferences(token, {
      all_emails_enabled,
      bag_created_enabled,
      conversation_notifications_enabled,
      reply_notifications_enabled,
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to update email preferences:', error);
    res.status(400).json({
      error: 'Update failed',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to update email preferences',
    });
  }
});

router.post('/:token/unsubscribe', async (req, res): Promise<void> => {
  try {
    const { token } = req.params;
    const preferences = await emailPreferencesService.unsubscribeAll(token);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Failed to unsubscribe:', error);
    res.status(400).json({
      error: 'Unsubscribe failed',
      message: error instanceof Error ? error.message : 'Failed to unsubscribe',
    });
  }
});

export default router;
