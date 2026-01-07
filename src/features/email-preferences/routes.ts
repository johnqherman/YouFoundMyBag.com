import express from 'express';
import * as emailPreferencesService from './service.js';

const router = express.Router();

router.get('/:token', async (req, res): Promise<void> => {
  try {
    const { token } = req.params;
    const preferences = await emailPreferencesService.getPreferences(token);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Failed to get email preferences:', error);
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
    console.error('Failed to update email preferences:', error);
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
    console.error('Failed to unsubscribe:', error);
    res.status(400).json({
      error: 'Unsubscribe failed',
      message: error instanceof Error ? error.message : 'Failed to unsubscribe',
    });
  }
});

export default router;
