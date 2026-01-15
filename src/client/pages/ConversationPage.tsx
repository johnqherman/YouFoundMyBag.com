import { useEffect, useState, useCallback, useRef } from 'react';
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
  useLocation,
} from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../components/LoadingSpinner.js';
import CharacterLimitTextArea from '../components/CharacterLimitTextArea.js';
import ConfirmModal from '../components/ConfirmModal.js';
import RequestMagicLinkModal from '../components/RequestMagicLinkModal.js';
import Twemoji from '../components/Twemoji.js';
import type {
  ConversationThread,
  ConversationMessage,
} from '../types/index.js';
import { api } from '../utils/api.js';
import { formatRelativeTimestamp } from '../utils/dateTime.js';
import {
  formatConversationParticipant,
  getContextualReplyPlaceholder,
} from '../../infrastructure/utils/personalization.js';
import {
  ErrorIcon,
  QuestionIcon,
  CheckIcon,
  ArchiveIcon,
} from '../components/icons/AppIcons.js';

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

export default function ConversationPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isFinderView = location.pathname.includes('/finder/');

  const [conversation, setConversation] = useState<ConversationThread | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const tokenKey = isFinderView
    ? 'finder_session_token'
    : 'owner_session_token';

  const loadConversation = useCallback(async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      if (isFinderView) {
        setError('No authentication token found');
        return;
      } else {
        navigate('/auth/verify');
        return;
      }
    }

    try {
      const apiEndpoint = isFinderView
        ? `/api/finder/conversation/${conversationId}`
        : `/api/conversations/${conversationId}?viewer_type=owner`;

      const response = await fetch(apiEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(tokenKey);
          if (isFinderView) {
            setError(
              'Session expired. Please use your original access link to access the conversation.'
            );
            return;
          } else {
            navigate('/auth/verify');
            return;
          }
        }
        throw new Error('Failed to load conversation');
      }

      const result = await response.json();
      setConversation(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load conversation'
      );
    } finally {
      if (!isFinderView) {
        setLoading(false);
      }
    }
  }, [conversationId, navigate, tokenKey, isFinderView]);

  const authenticateWithMagicLink = useCallback(async () => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid access link - no token found');
      setLoading(false);
      return;
    }

    setAuthenticating(true);
    try {
      const response = await fetch('/api/finder/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ magic_token: token }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Authentication failed');
      }

      const result = await response.json();

      localStorage.setItem('finder_session_token', result.data.session_token);

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('token');
      window.history.replaceState({}, '', newUrl.toString());

      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setAuthenticating(false);
      setLoading(false);
    }
  }, [searchParams, loadConversation]);

  const sendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || sending) return;

    const token = localStorage.getItem(tokenKey);
    if (!token) {
      if (isFinderView) {
        setError(
          'Session expired. Please use your original access link to access the conversation.'
        );
        return;
      } else {
        navigate('/auth/verify');
        return;
      }
    }

    setSending(true);
    try {
      const apiEndpoint = isFinderView
        ? `/api/finder/conversation/${conversationId}/reply`
        : `/api/conversations/${conversationId}/reply`;

      const requestBody = isFinderView
        ? { message_content: replyMessage }
        : { message_content: replyMessage, sender_type: 'owner' };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to send reply');
      }

      setReplyMessage('');
      await loadConversation();
      setTimeout(() => replyInputRef.current?.focus(), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const handleResolveConversation = async () => {
    if (!conversationId || resolving) return;

    const token = localStorage.getItem('owner_session_token');
    if (!token) {
      navigate('/auth/verify');
      return;
    }

    setResolving(true);
    try {
      if (replyMessage.trim()) {
        const response = await fetch(
          `/api/conversations/${conversationId}/reply`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              message_content: replyMessage,
              sender_type: 'owner',
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to send reply before resolving');
        }

        setReplyMessage('');
      }

      await api.resolveConversation(conversationId, token);
      await loadConversation();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to resolve conversation'
      );
    } finally {
      setResolving(false);
    }
  };

  const handleArchiveClick = () => {
    if (archiving) return;
    setShowArchiveConfirm(true);
  };

  const handleArchiveConversation = async () => {
    if (!conversationId || archiving) return;

    const token = localStorage.getItem('owner_session_token');
    if (!token) {
      navigate('/auth/verify');
      return;
    }

    setShowArchiveConfirm(false);
    setArchiving(true);
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

      navigate('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to archive conversation'
      );
    } finally {
      setArchiving(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      if (isFinderView) {
        const urlToken = searchParams.get('token');
        const storedToken = localStorage.getItem('finder_session_token');

        if (urlToken) {
          authenticateWithMagicLink();
        } else if (storedToken) {
          loadConversation();
          setLoading(false);
        } else {
          setError('No valid authentication found.');
          setLoading(false);
        }
      } else {
        loadConversation();
      }
    }
  }, [
    conversationId,
    searchParams,
    authenticateWithMagicLink,
    loadConversation,
    isFinderView,
  ]);

  useEffect(() => {
    if (!conversation?.messages.length) return;

    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 0);

    return () => clearTimeout(timeout);
  }, [conversation?.messages.length]);

  if (loading || authenticating) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900 flex items-center justify-center">
        <Helmet>
          <title>
            {authenticating ? 'Authenticating...' : 'Loading Conversation...'} |
            YouFoundMyBag.com
          </title>
        </Helmet>
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-regal-navy-600">
            {authenticating ? 'Authenticating...' : 'Loading conversation...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError =
      error?.toLowerCase().includes('not authenticated') ||
      error?.toLowerCase().includes('authentication required') ||
      error?.toLowerCase().includes('invalid or expired session') ||
      error?.includes('Session expired') ||
      error?.includes('No authentication token found');

    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
        <Helmet>
          <title>
            {isFinderView ? 'Access Error' : 'Error'} | YouFoundMyBag.com
          </title>
        </Helmet>
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center text-cinnabar-600">
              <ErrorIcon color="currentColor" size="large" />
            </div>
            <h1 className="text-2xl font-semibold text-cinnabar-600 mb-4">
              {isFinderView ? 'Access Error' : 'Error Loading Conversation'}
            </h1>
            <p className="text-regal-navy-600 mb-6">{error}</p>
            {(isAuthError ||
              (isFinderView &&
                !error?.includes('deleted') &&
                !error?.includes('no longer exists'))) && (
              <>
                <button
                  onClick={() => setShowReissueModal(true)}
                  className="link mb-4"
                >
                  Lost your secure chat link?
                </button>
                <br />
              </>
            )}
            {!isFinderView && (
              <Link to="/dashboard" className="link">
                Return to Dashboard
              </Link>
            )}
          </div>
        </div>

        {showReissueModal && (
          <RequestMagicLinkModal
            isOpen={showReissueModal}
            onClose={() => setShowReissueModal(false)}
            conversationId={conversationId}
          />
        )}
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
        <Helmet>
          <title>Conversation Not Found | YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center text-saffron-700">
              <QuestionIcon color="currentColor" size="large" />
            </div>
            <h1 className="text-2xl font-semibold text-saffron-700 mb-4">
              Conversation Not Found
            </h1>
            <p className="text-regal-navy-600 mb-6">
              The conversation you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </p>
            {!isFinderView && (
              <Link to="/dashboard" className="link">
                Return to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const conversationTitle = conversation.bag.bag_name
    ? `Conversation about${' '}
            ${formatBagDisplayName(
              conversation.bag.owner_name,
              conversation.bag.bag_name,
              conversation.bag.short_id
            )} | YouFoundMyBag.com`
    : 'Conversation | YouFoundMyBag.com';

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>{conversationTitle}</title>
      </Helmet>
      <div className="max-w-4xl mx-auto p-6">
        <div className="sticky top-0 z-10 bg-regal-navy-50 pb-4 mb-6 -mx-6 px-6 pt-6 shadow-sm">
          {!isFinderView ? (
            <Link to="/dashboard" className="link mb-4 inline-block">
              ← Back to Dashboard
            </Link>
          ) : (
            <div className="mb-4" />
          )}
          <h1 className="text-3xl font-semibold mb-2">
            Conversation about{' '}
            <Twemoji>
              {formatBagDisplayName(
                conversation.bag.owner_name,
                conversation.bag.bag_name,
                conversation.bag.short_id
              )}
            </Twemoji>
          </h1>
          <p className="text-regal-navy-600">
            Status:{' '}
            <span
              className={`badge ${
                conversation.conversation.status === 'active'
                  ? 'badge-success'
                  : conversation.conversation.status === 'resolved'
                    ? 'bg-regal-navy-100 text-regal-navy-700'
                    : 'badge-neutral'
              }`}
            >
              {conversation.conversation.status === 'resolved'
                ? 'Resolved'
                : 'Active'}
            </span>
            {isFinderView && conversation.bag.owner_name && (
              <span className="ml-4">
                • Owner: <Twemoji>{conversation.bag.owner_name}</Twemoji>
              </span>
            )}
            {!isFinderView && conversation.conversation.finder_display_name && (
              <span className="ml-4">
                • Finder:{' '}
                <Twemoji>
                  {conversation.conversation.finder_display_name}
                </Twemoji>
              </span>
            )}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {conversation.messages.map((message: ConversationMessage) => {
            const isCurrentUserMessage = isFinderView
              ? message.sender_type === 'finder'
              : message.sender_type === 'owner';

            return (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  isCurrentUserMessage
                    ? 'bg-regal-navy-600 text-white ml-12 shadow-soft'
                    : 'bg-white border border-regal-navy-200 text-regal-navy-900 mr-12 shadow-soft'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Twemoji className="font-medium text-sm">
                    {formatConversationParticipant(
                      message.sender_type,
                      {
                        ownerName: conversation.bag.owner_name,
                        bagName: conversation.bag.bag_name,
                        finderName:
                          conversation.conversation.finder_display_name,
                      },
                      isCurrentUserMessage
                    )}
                  </Twemoji>
                  <span
                    className={`text-xs ${
                      isCurrentUserMessage
                        ? 'text-regal-navy-200'
                        : 'text-regal-navy-500'
                    }`}
                  >
                    {formatRelativeTimestamp(message.sent_at)}
                  </span>
                </div>
                <Twemoji
                  tag="p"
                  className="text-wrap-aggressive leading-relaxed"
                >
                  {message.message_content}
                </Twemoji>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {conversation.conversation.status === 'active' && (
          <form onSubmit={sendReply} className="card">
            <h3 className="text-lg font-semibold mb-4 text-regal-navy-900">
              Send a Reply
            </h3>
            <div onKeyDown={handleKeyDown}>
              <CharacterLimitTextArea
                ref={replyInputRef}
                value={replyMessage}
                onChange={setReplyMessage}
                maxLength={300}
                placeholder={getContextualReplyPlaceholder(
                  isFinderView ? 'owner' : 'finder',
                  {
                    ownerName: conversation.bag.owner_name,
                    bagName: conversation.bag.bag_name,
                    finderName: conversation.conversation.finder_display_name,
                  },
                  'response'
                )}
                rows={4}
                disabled={sending}
              />
            </div>
            <div className="mt-4 flex justify-between gap-3">
              {!isFinderView ? (
                <button
                  type="button"
                  onClick={handleResolveConversation}
                  className="bg-regal-navy-100 hover:bg-regal-navy-200 text-regal-navy-800 border border-regal-navy-300 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={sending || resolving}
                >
                  {resolving ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              ) : (
                <div />
              )}
              <button
                type="submit"
                disabled={!replyMessage.trim() || sending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        )}

        {conversation.conversation.status === 'resolved' && (
          <div className="card">
            <div className="alert-success text-center mb-4">
              <div className="mb-2 flex justify-center">
                <CheckIcon color="currentColor" />
              </div>
              <p className="font-medium mb-1">
                This conversation has been resolved.
              </p>
              <p className="text-sm">No further replies can be sent.</p>
            </div>
            {!isFinderView && (
              <>
                <button
                  onClick={handleArchiveClick}
                  disabled={archiving}
                  className="bg-saffron-100 hover:bg-saffron-200 text-saffron-800 border border-saffron-300 w-full py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ArchiveIcon color="currentColor" />
                  {archiving ? 'Archiving...' : 'Archive Conversation'}
                </button>
                <p className="text-xs text-regal-navy-600 text-center mt-2">
                  Resolved conversations are automatically archived after 30
                  days. Archived conversations are permanently deleted after 6
                  months.
                </p>
              </>
            )}
          </div>
        )}

        {conversation.conversation.status === 'archived' && (
          <div className="alert-info text-center">
            <p>This conversation has been archived.</p>
          </div>
        )}
      </div>

      {!isFinderView && (
        <ConfirmModal
          isOpen={showArchiveConfirm}
          title="Archive Conversation"
          message="Archive this conversation? It will be automatically deleted after 6 months."
          confirmText="Archive"
          cancelText="Cancel"
          variant="warning"
          onConfirm={handleArchiveConversation}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}
    </div>
  );
}
