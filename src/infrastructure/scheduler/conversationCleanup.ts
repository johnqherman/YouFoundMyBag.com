import cron from 'node-cron';
import { logger } from '../logger/index.js';
import {
  autoArchiveResolvedConversations,
  permanentlyDeleteConversations,
} from '../../features/conversations/repository.js';
import { deleteExpiredSessions } from '../../features/auth/repository.js';

export async function runConversationCleanup(): Promise<void> {
  try {
    logger.info('Starting conversation cleanup task');

    const archivedCount = await autoArchiveResolvedConversations();
    logger.info(`Auto-archived ${archivedCount} resolved conversations`);

    const deletedCount = await permanentlyDeleteConversations();
    logger.info(
      `Permanently deleted ${deletedCount} archived conversations past 6 months`
    );

    await deleteExpiredSessions();
    logger.info('Expired sessions purged');

    logger.info('Conversation cleanup task completed');
  } catch (error) {
    logger.error('Error in conversation cleanup task:', error);
  }
}

export function scheduleConversationCleanup(): void {
  cron.schedule('0 2 * * *', () => {
    runConversationCleanup();
  });

  logger.info(
    'Conversation cleanup scheduler initialized (runs daily at 2:00 AM)'
  );
}
