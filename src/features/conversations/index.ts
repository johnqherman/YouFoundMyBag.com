export {
  createConversation,
  addMessage,
  getConversationsByBagId,
  getConversationsByOwnerEmail,
  getConversationById,
  markMessagesAsRead,
  updateConversationStatus,
  getUnreadMessageCount,
  getNotificationCounters,
  incrementNotificationCounter,
  resetNotificationCounter,
  autoArchiveResolvedConversations,
  permanentlyDeleteConversations,
  getArchivedConversationsByOwnerEmail,
} from './repository.js';

export {
  analyzeMessageContext,
  getMessageContextLabel,
  getNotificationSubject,
  startConversation,
  sendReply,
  getOwnerConversations,
  getConversationThread,
  resolveConversation,
  getClientIpHash,
  archiveConversation,
  restoreConversation,
  getArchivedConversations,
} from './service.js';

export { conversationRoutes } from './routes.js';
