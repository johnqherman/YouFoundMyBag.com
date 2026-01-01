import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import type {
  ConversationThread,
  ConversationMessage,
  MessageContext,
  MessageContextInfo,
} from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

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
  context: MessageContext,
  senderType: 'finder' | 'owner'
): string {
  if (context === 'initial') {
    return senderType === 'finder' ? '🔍' : '👋';
  } else if (context === 'follow-up') {
    return senderType === 'finder' ? '📢' : '🔄';
  } else {
    return '💬';
  }
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
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              Dashboard Error
            </h1>
            <p className="text-neutral-400 mb-6">
              {error || 'Unable to load your dashboard.'}
            </p>
            <a href="/" className="text-blue-400 hover:text-blue-300 underline">
              Return to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Your YouFoundMyBag Dashboard
          </h1>
          <p className="text-neutral-400">
            Manage your bags and respond to messages from people who find them.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-neutral-900 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Your Bags</h2>

              {dashboardData.bags.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  <p>No bags created yet.</p>
                  <a
                    href="/"
                    className="text-blue-400 hover:text-blue-300 underline mt-2 inline-block"
                  >
                    Create your first bag
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.bags.map((bag) => (
                    <div
                      key={bag.id}
                      className="bg-neutral-800 rounded-lg p-4 border border-neutral-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">
                          {formatBagDisplayName(
                            bag.owner_name,
                            bag.bag_name,
                            bag.short_id
                          )}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            bag.status === 'active'
                              ? 'bg-green-900 text-green-200'
                              : 'bg-neutral-700 text-neutral-300'
                          }`}
                        >
                          {bag.status}
                        </span>
                      </div>

                      <p className="text-sm text-neutral-400 mb-3">
                        ID: {bag.short_id}
                      </p>

                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>{bag.conversation_count} conversations</span>
                        {bag.unread_count > 0 && (
                          <span className="bg-red-600 text-white px-2 py-1 rounded-full">
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
            <div className="bg-neutral-900 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Recent Messages</h2>

              {dashboardData.conversations.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-lg mb-2">No messages yet</p>
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
                    let contextIcon = '';

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
                      contextIcon = getMessageContextIcon(
                        contextInfo.context,
                        lastMessage.sender_type
                      );
                    }

                    return (
                      <div
                        key={thread.conversation.id}
                        className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 hover:border-neutral-600 cursor-pointer transition-colors"
                        onClick={() =>
                          navigate(
                            `/dashboard/conversation/${thread.conversation.id}`
                          )
                        }
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">
                              {formatBagDisplayName(
                                thread.bag.owner_name,
                                thread.bag.bag_name,
                                thread.bag.short_id
                              )}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-neutral-400">
                              <span>
                                Conversation started{' '}
                                {new Date(
                                  thread.conversation.created_at
                                ).toLocaleDateString()}
                              </span>
                              {contextInfo && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    contextInfo.context === 'initial'
                                      ? 'bg-blue-900 text-blue-200'
                                      : contextInfo.context === 'follow-up'
                                        ? 'bg-yellow-900 text-yellow-200'
                                        : 'bg-green-900 text-green-200'
                                  }`}
                                >
                                  <span>{contextIcon}</span>
                                  <span>
                                    {contextInfo.context === 'initial'
                                      ? 'New'
                                      : contextInfo.context === 'follow-up'
                                        ? 'Follow-up'
                                        : 'Active'}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                          {unreadCount > 0 && (
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                              {unreadCount} new
                            </span>
                          )}
                        </div>

                        {lastMessage && (
                          <div className="bg-neutral-700 rounded p-3 mt-3">
                            <p className="text-sm text-neutral-300">
                              <span className="font-medium inline-flex items-center gap-1">
                                <span>{contextIcon}</span>
                                <span>{contextLabel}:</span>
                              </span>{' '}
                              {lastMessage.message_content.length > 100
                                ? `${lastMessage.message_content.substring(0, 100)}...`
                                : lastMessage.message_content}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">
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

        <footer className="text-center mt-12 text-neutral-500 text-sm">
          <a
            href="/"
            className="text-blue-400 hover:text-blue-300 underline mr-4"
          >
            Create another bag
          </a>
          |
          <button
            onClick={() => {
              localStorage.removeItem('owner_session_token');
              window.location.href = '/';
            }}
            className="text-neutral-400 hover:text-neutral-300 underline ml-4"
          >
            Logout
          </button>
        </footer>
      </div>
    </div>
  );
}
