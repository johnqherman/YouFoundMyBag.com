import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type {
  ConversationThread,
  ConversationMessage,
  MessageContext,
  MessageContextInfo,
  DashboardData,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import BagManagementModal from '../components/BagManagementModal';
import RequestMagicLinkModal from '../components/RequestMagicLinkModal';
import Twemoji from '../components/Twemoji';
import {
  MessageIcon,
  MailIcon,
  ArchiveIcon,
  BagSettingsIcon,
} from '../components/icons/AppIcons';
import { formatRelativeTimestamp } from '../utils/dateTime';

function formatBagDisplayName(
  ownerName?: string,
  bagName?: string,
  shortId?: string
): string {
  if (bagName && ownerName) {
    return `${ownerName}'s ${bagName}`;
  }
  if (bagName) {
    return bagName;
  }
  if (ownerName) {
    return `${ownerName}'s bag`;
  }
  return `Bag ${shortId}`;
}

function analyzeMessageContext(
  messages: ConversationMessage[],
  currentSenderType: 'finder' | 'owner'
): MessageContextInfo {
  const recipientType = currentSenderType === 'finder' ? 'owner' : 'finder';

  const senderMessages = messages.filter(
    (msg) => msg.sender_type === currentSenderType
  );
  const recipientMessages = messages.filter(
    (msg) => msg.sender_type === recipientType
  );

  const lastMessage = messages[messages.length - 1];
  const lastSenderType = lastMessage ? lastMessage.sender_type : null;

  const isFirstFromFinder =
    currentSenderType === 'finder' && senderMessages.length === 1;

  const hasRecipientReplied = recipientMessages.length > 0;

  let context: MessageContext;

  if (isFirstFromFinder && !hasRecipientReplied) {
    context = 'initial';
  } else if (!hasRecipientReplied) {
    context = 'follow-up';
  } else {
    context = 'response';
  }

  return {
    context,
    isFirstFromSender: isFirstFromFinder,
    hasRecipientReplied,
    lastSenderType,
  };
}

function getMessageContextLabel(
  context: MessageContext,
  senderType: 'finder' | 'owner'
): string {
  if (context === 'initial') {
    return 'First message';
  } else if (context === 'follow-up') {
    return senderType === 'owner' ? 'Your follow-up' : 'Follow-up message';
  } else {
    return senderType === 'owner' ? 'Your reply' : 'Reply';
  }
}

function getMessageContextIcon(
  _context: MessageContext,
  _senderType: 'finder' | 'owner'
): typeof MessageIcon {
  return MessageIcon;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [archivedConversations, setArchivedConversations] = useState<
    ConversationThread[]
  >([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<{
    conversationId: string;
    event: React.MouseEvent;
  } | null>(null);
  const [managementModalBag, setManagementModalBag] = useState<{
    id: string;
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'disabled';
    owner_email?: string;
    conversation_count?: number;
  } | null>(null);
  const [showReissueModal, setShowReissueModal] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('owner_session_token');
      if (!token) {
        setError(
          'Not authenticated. Please check your email for an access link.'
        );
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }

      const result = await response.json();
      setDashboardData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedConversations = useCallback(async () => {
    if (archivedConversations.length > 0) return;

    setLoadingArchived(true);
    try {
      const token = localStorage.getItem('owner_session_token');
      if (!token) return;

      const response = await fetch('/api/conversations/archived', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load archived conversations');
      }

      const result = await response.json();
      setArchivedConversations(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load archived conversations'
      );
    } finally {
      setLoadingArchived(false);
    }
  }, [archivedConversations.length]);

  const handleArchiveClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (archivingId) return;
    setConfirmArchive({ conversationId, event: e });
  };

  const handleArchiveConversation = async () => {
    if (!confirmArchive || archivingId) return;

    const { conversationId } = confirmArchive;
    const token = localStorage.getItem('owner_session_token');
    if (!token) {
      setConfirmArchive(null);
      return;
    }

    setArchivingId(conversationId);
    setConfirmArchive(null);
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/archive`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to archive conversation');
      }

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to archive conversation'
      );
    } finally {
      setArchivingId(null);
    }
  };

  const handleRestoreConversation = async (conversationId: string) => {
    if (restoringId) return;

    const token = localStorage.getItem('owner_session_token');
    if (!token) return;

    setRestoringId(conversationId);
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/restore`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to restore conversation');
      }

      setArchivedConversations((prev) =>
        prev.filter((thread) => thread.conversation.id !== conversationId)
      );

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to restore conversation'
      );
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'archived') {
      loadArchivedConversations();
    }
  }, [activeTab, loadArchivedConversations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboardData) {
    const isAuthError = error?.toLowerCase().includes('not authenticated');

    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
        <Helmet>
          <title>Dashboard Error | YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-cinnabar-600 mb-4">
              Dashboard Error
            </h1>
            <p className="text-regal-navy-600 mb-6">
              {error || 'Unable to load your dashboard.'}
            </p>
            {isAuthError && (
              <button
                onClick={() => setShowReissueModal(true)}
                className="btn-primary"
              >
                Lost your secure chat link?
              </button>
            )}
            {!isAuthError && (
              <a href="/" className="link">
                Return to homepage
              </a>
            )}
          </div>
        </div>

        {showReissueModal && (
          <RequestMagicLinkModal
            isOpen={showReissueModal}
            onClose={() => setShowReissueModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>Your Dashboard | YouFoundMyBag.com</title>
      </Helmet>
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Your Dashboard</h1>
          <p className="text-regal-navy-600">
            Manage your bags and respond to messages from people who find them.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Your Bags</h2>

              {dashboardData.bags.length === 0 ? (
                <div className="text-center text-regal-navy-500 py-8">
                  <p>No bags created yet.</p>
                  <a href="/" className="link mt-2 inline-block">
                    Create your first bag
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.bags.map((bag) => (
                    <div
                      key={bag.id}
                      className="bg-regal-navy-50 rounded-lg p-4 border border-regal-navy-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-regal-navy-900">
                          <Twemoji>
                            {formatBagDisplayName(
                              bag.owner_name,
                              bag.bag_name,
                              bag.short_id
                            )}
                          </Twemoji>
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge ${
                              bag.status === 'active'
                                ? 'badge-success'
                                : 'badge-neutral'
                            }`}
                          >
                            {bag.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManagementModalBag({
                                id: bag.id,
                                short_id: bag.short_id,
                                owner_name: bag.owner_name,
                                bag_name: bag.bag_name,
                                status: bag.status,
                                owner_email: dashboardData?.owner_email,
                                conversation_count: bag.conversation_count,
                              });
                            }}
                            className="text-regal-navy-600 hover:text-regal-navy-900 transition-colors p-1"
                            title="Manage bag"
                          >
                            <BagSettingsIcon color="currentColor" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-regal-navy-600 mb-3">
                        ID: {bag.short_id}
                      </p>

                      <div className="flex justify-between text-xs text-regal-navy-600">
                        <span>
                          {bag.conversation_count}{' '}
                          {bag.conversation_count === 1
                            ? 'conversation'
                            : 'conversations'}
                        </span>
                        {bag.unread_count > 0 && (
                          <span className="badge badge-error">
                            {bag.unread_count} unread
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {activeTab === 'active' ? 'Recent Messages' : 'Archived'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'active'
                        ? 'bg-regal-navy-600 text-white'
                        : 'bg-regal-navy-100 text-regal-navy-700 hover:bg-regal-navy-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setActiveTab('archived')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'archived'
                        ? 'bg-regal-navy-600 text-white'
                        : 'bg-regal-navy-100 text-regal-navy-700 hover:bg-regal-navy-200'
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </div>

              {activeTab === 'active' &&
                dashboardData.conversations.length === 0 && (
                  <div className="text-center text-regal-navy-500 py-12">
                    <div className="mb-4 flex justify-center text-regal-navy-400">
                      <MailIcon color="currentColor" size="large" />
                    </div>
                    <p className="text-lg mb-2 font-medium text-regal-navy-700">
                      No messages yet
                    </p>
                    <p className="text-sm">
                      When someone scans your tag and sends a message, it will
                      appear here.
                    </p>
                  </div>
                )}

              {activeTab === 'active' &&
                dashboardData.conversations.length > 0 && (
                  <div className="space-y-4">
                    {dashboardData.conversations.map((thread) => {
                      const lastMessage =
                        thread.messages[thread.messages.length - 1];
                      const unreadCount = thread.messages.filter(
                        (msg) => msg.sender_type === 'finder' && !msg.read_at
                      ).length;

                      let contextInfo: MessageContextInfo | null = null;
                      let contextLabel = '';
                      let ContextIcon = MessageIcon;

                      if (lastMessage) {
                        contextInfo = analyzeMessageContext(
                          thread.messages,
                          lastMessage.sender_type
                        );
                        contextLabel = getMessageContextLabel(
                          contextInfo.context,
                          lastMessage.sender_type
                        );
                        ContextIcon = getMessageContextIcon(
                          contextInfo.context,
                          lastMessage.sender_type
                        );
                      }

                      return (
                        <div
                          key={thread.conversation.id}
                          className="bg-white rounded-lg p-5 border border-regal-navy-200 hover:border-regal-navy-400 cursor-pointer transition-all duration-150 hover:shadow-soft-md"
                          onClick={() =>
                            navigate(
                              `/dashboard/conversation/${thread.conversation.id}`
                            )
                          }
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-regal-navy-900">
                                <Twemoji>
                                  {formatBagDisplayName(
                                    thread.bag.owner_name,
                                    thread.bag.bag_name,
                                    thread.bag.short_id
                                  )}
                                </Twemoji>
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-regal-navy-600 mt-1">
                                <span>
                                  Conversation started{' '}
                                  {new Date(
                                    thread.conversation.created_at
                                  ).toLocaleDateString()}
                                </span>
                                <span
                                  className={`badge ${
                                    thread.conversation.status === 'resolved'
                                      ? 'bg-regal-navy-100 text-regal-navy-700'
                                      : contextInfo?.context === 'initial'
                                        ? 'bg-regal-navy-100 text-regal-navy-700'
                                        : contextInfo?.context === 'follow-up'
                                          ? 'badge-warning'
                                          : 'badge-success'
                                  }`}
                                >
                                  <span className="inline-flex">
                                    {thread.conversation.status ===
                                    'resolved' ? (
                                      '✓'
                                    ) : (
                                      <ContextIcon color="currentColor" />
                                    )}
                                  </span>
                                  <span className="ml-1">
                                    {thread.conversation.status === 'resolved'
                                      ? 'Resolved'
                                      : contextInfo?.context === 'initial'
                                        ? 'New'
                                        : contextInfo?.context === 'follow-up'
                                          ? 'Follow-up'
                                          : 'Active'}
                                  </span>
                                </span>
                              </div>
                            </div>
                            {unreadCount > 0 && (
                              <span className="badge badge-error">
                                {unreadCount} new
                              </span>
                            )}
                            {thread.conversation.status === 'resolved' && (
                              <button
                                onClick={(e) =>
                                  handleArchiveClick(thread.conversation.id, e)
                                }
                                disabled={
                                  archivingId === thread.conversation.id
                                }
                                className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Archive conversation"
                              >
                                {archivingId === thread.conversation.id
                                  ? 'Archiving...'
                                  : 'Archive'}
                              </button>
                            )}
                          </div>

                          {lastMessage && (
                            <div className="bg-regal-navy-50 rounded-lg p-3 mt-3">
                              <p className="text-sm text-regal-navy-800">
                                <span className="font-medium inline-flex items-center gap-1">
                                  <ContextIcon color="currentColor" />
                                  <span>{contextLabel}:</span>
                                </span>{' '}
                                <Twemoji className="text-wrap-aggressive line-clamp-1 overflow-hidden text-ellipsis">
                                  {lastMessage.message_content}
                                </Twemoji>
                              </p>
                              <p className="text-xs text-regal-navy-500 mt-1.5">
                                {formatRelativeTimestamp(lastMessage.sent_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              {activeTab === 'archived' && loadingArchived && (
                <div className="text-center py-12">
                  <LoadingSpinner />
                  <p className="mt-4 text-regal-navy-600">
                    Loading archived conversations...
                  </p>
                </div>
              )}

              {activeTab === 'archived' &&
                !loadingArchived &&
                archivedConversations.length === 0 && (
                  <div className="text-center text-regal-navy-500 py-12">
                    <div className="mb-4 flex justify-center text-regal-navy-400">
                      <ArchiveIcon color="currentColor" size="large" />
                    </div>
                    <p className="text-lg mb-2 font-medium text-regal-navy-700">
                      No archived conversations
                    </p>
                    <p className="text-sm">
                      Resolved conversations are automatically archived after 30
                      days.
                    </p>
                  </div>
                )}

              {activeTab === 'archived' &&
                !loadingArchived &&
                archivedConversations.length > 0 && (
                  <div className="space-y-4">
                    {archivedConversations.map((thread) => {
                      const lastMessage =
                        thread.messages[thread.messages.length - 1];

                      return (
                        <div
                          key={thread.conversation.id}
                          className="bg-regal-navy-50 rounded-lg p-5 border border-regal-navy-200 hover:border-regal-navy-400 cursor-pointer transition-all duration-150 hover:shadow-soft-md"
                          onClick={() =>
                            navigate(
                              `/dashboard/conversation/${thread.conversation.id}`
                            )
                          }
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-medium text-regal-navy-900">
                                <Twemoji>
                                  {formatBagDisplayName(
                                    thread.bag.owner_name,
                                    thread.bag.bag_name,
                                    thread.bag.short_id
                                  )}
                                </Twemoji>
                              </h3>
                              <p className="text-sm text-regal-navy-600 mt-1">
                                Archived{' '}
                                {thread.conversation.archived_at &&
                                  new Date(
                                    thread.conversation.archived_at
                                  ).toLocaleDateString()}
                              </p>
                              {thread.conversation.permanently_deleted_at && (
                                <p className="text-xs text-cinnabar-600 mt-1">
                                  Will be permanently deleted on{' '}
                                  {new Date(
                                    thread.conversation.permanently_deleted_at
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreConversation(
                                  thread.conversation.id
                                );
                              }}
                              disabled={restoringId === thread.conversation.id}
                              className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {restoringId === thread.conversation.id
                                ? 'Restoring...'
                                : 'Restore'}
                            </button>
                          </div>

                          {lastMessage && (
                            <div className="bg-white rounded-lg p-3 mt-3">
                              <Twemoji
                                tag="p"
                                className="text-sm text-regal-navy-800 line-clamp-2"
                              >
                                {lastMessage.message_content}
                              </Twemoji>
                              <p className="text-xs text-regal-navy-500 mt-1.5">
                                {formatRelativeTimestamp(lastMessage.sent_at)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>

        <footer className="text-center mt-12 text-regal-navy-600 text-sm">
          <a href="/" className="link mr-4">
            Create another bag
          </a>
          <span className="text-regal-navy-300">|</span>
          <button
            onClick={() => {
              localStorage.removeItem('owner_session_token');
              window.location.href = '/';
            }}
            className="link ml-4"
          >
            Log out
          </button>
        </footer>
      </div>

      <ConfirmModal
        isOpen={confirmArchive !== null}
        title="Archive Conversation"
        message="Archive this conversation? It will be automatically deleted after 6 months."
        confirmText="Archive"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleArchiveConversation}
        onCancel={() => setConfirmArchive(null)}
      />

      {managementModalBag && (
        <BagManagementModal
          isOpen={true}
          onClose={() => setManagementModalBag(null)}
          bag={managementModalBag}
          onBagUpdated={() => {
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}
