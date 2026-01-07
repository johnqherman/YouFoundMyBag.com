import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ConversationThread,
  ConversationMessage,
  MessageContext,
  MessageContextInfo,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { MessageIcon } from '../components/icons/AppIcons';

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

interface DashboardData {
  bags: Array<{
    id: string;
    short_id: string;
    owner_name?: string;
    bag_name?: string;
    status: 'active' | 'recovered' | 'archived';
    created_at: string;
    conversation_count: number;
    unread_count: number;
    latest_conversation?: string;
  }>;
  conversations: ConversationThread[];
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

  const isFirstFromSender = senderMessages.length === 0;

  const hasRecipientReplied = recipientMessages.length > 0;

  let context: MessageContext;

  if (isFirstFromSender) {
    context = 'initial';
  } else if (!hasRecipientReplied) {
    context = 'follow-up';
  } else {
    context = 'response';
  }

  return {
    context,
    isFirstFromSender,
    hasRecipientReplied,
    lastSenderType,
  };
}

function getMessageContextLabel(
  context: MessageContext,
  senderType: 'finder' | 'owner',
  viewerType: 'finder' | 'owner'
): string {
  const isOwnMessage = senderType === viewerType;

  if (context === 'initial') {
    return isOwnMessage ? 'Your initial message' : 'Initial contact';
  } else if (context === 'follow-up') {
    return isOwnMessage ? 'Your follow-up' : 'Follow-up message';
  } else {
    return isOwnMessage ? 'Your reply' : 'Reply';
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

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('owner_session_token');
      if (!token) {
        setError(
          'Not authenticated. Please check your email for a magic link.'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-cinnabar-600 mb-4">
              Dashboard Error
            </h1>
            <p className="text-regal-navy-600 mb-6">
              {error || 'Unable to load your dashboard.'}
            </p>
            <a href="/" className="link">
              Return to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">
            Your YouFoundMyBag Dashboard
          </h1>
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
                          {formatBagDisplayName(
                            bag.owner_name,
                            bag.bag_name,
                            bag.short_id
                          )}
                        </h3>
                        <span
                          className={`badge ${
                            bag.status === 'active'
                              ? 'badge-success'
                              : 'badge-neutral'
                          }`}
                        >
                          {bag.status}
                        </span>
                      </div>

                      <p className="text-sm text-regal-navy-600 mb-3">
                        ID: {bag.short_id}
                      </p>

                      <div className="flex justify-between text-xs text-regal-navy-600">
                        <span>{bag.conversation_count} conversations</span>
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
              <h2 className="text-xl font-semibold mb-4">Recent Messages</h2>

              {dashboardData.conversations.length === 0 ? (
                <div className="text-center text-regal-navy-500 py-12">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-lg mb-2 font-medium text-regal-navy-700">
                    No messages yet
                  </p>
                  <p className="text-sm">
                    When someone finds your bag and sends a message, it will
                    appear here.
                  </p>
                </div>
              ) : (
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
                        lastMessage.sender_type,
                        'owner'
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
                          <div>
                            <h3 className="font-medium text-regal-navy-900">
                              {formatBagDisplayName(
                                thread.bag.owner_name,
                                thread.bag.bag_name,
                                thread.bag.short_id
                              )}
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
                                    ? 'badge-neutral'
                                    : contextInfo?.context === 'initial'
                                      ? 'bg-regal-navy-100 text-regal-navy-700'
                                      : contextInfo?.context === 'follow-up'
                                        ? 'badge-warning'
                                        : 'badge-success'
                                }`}
                              >
                                <span className="inline-flex">
                                  {thread.conversation.status === 'resolved' ? (
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
                        </div>

                        {lastMessage && (
                          <div className="bg-regal-navy-50 rounded-lg p-3 mt-3">
                            <p className="text-sm text-regal-navy-800">
                              <span className="font-medium inline-flex items-center gap-1">
                                <ContextIcon color="currentColor" />
                                <span>{contextLabel}:</span>
                              </span>{' '}
                              <span className="text-wrap-aggressive line-clamp-1 overflow-hidden text-ellipsis">
                                {lastMessage.message_content}
                              </span>
                            </p>
                            <p className="text-xs text-regal-navy-500 mt-1.5">
                              {new Date(lastMessage.sent_at).toLocaleString()}
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
            Logout
          </button>
        </footer>
      </div>
    </div>
  );
}
