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
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollAfterLoad = useRef(false);

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
      scrollAfterLoad.current = true;
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
      scrollAfterLoad.current = true;
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
    if (!scrollAfterLoad.current) return;
    scrollAfterLoad.current = false;

    const timeout = setTimeout(() => {
      const el = messagesEndRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [conversation?.messages.length]);

  useEffect(() => {
    if (!conversation || conversation.conversation.status !== 'active') return;
    const interval = setInterval(() => {
      loadConversation();
    }, 12_000);
    return () => clearInterval(interval);
  }, [conversation?.conversation.status, loadConversation]);

  if (loading || authenticating) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900 flex items-center justify-center">
        <Helmet>
          <title>
            {authenticating ? 'Authenticating...' : 'Loading Conversation...'} -
            YouFoundMyBag.com
          </title>
        </Helmet>
        <div className="text-center animate-fadeIn">
          <LoadingSpinner />
          <p className="mt-4 font-display text-xl text-regal-navy-700">
            {authenticating ? 'Authenticating...' : 'Loading conversation...'}
          </p>
          <p className="mt-1 text-sm text-regal-navy-500">
            {authenticating ? 'Verifying your access link' : 'Just a moment'}
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
            {isFinderView ? 'Access Error' : 'Error'} - YouFoundMyBag.com
          </title>
        </Helmet>
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center text-cinnabar-600">
              <ErrorIcon color="currentColor" size="large" />
            </div>
            <h1 className="text-2xl font-display tracking-tight text-cinnabar-600 mb-4">
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
          <title>Conversation Not Found - YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center text-saffron-700">
              <QuestionIcon color="currentColor" size="large" />
            </div>
            <h1 className="text-2xl font-display tracking-tight text-saffron-700 mb-4">
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
            )} - YouFoundMyBag.com`
    : 'Conversation - YouFoundMyBag.com';

  const nameInfo = {
    ownerName: conversation.bag.owner_name,
    bagName: conversation.bag.bag_name,
    finderName: conversation.conversation.finder_display_name,
  };

  const replyingAsName = isFinderView
    ? conversation.conversation.finder_display_name || 'Finder'
    : conversation.bag.owner_name || 'Owner';

  return (
    <div className="relative min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>{conversationTitle}</title>
      </Helmet>

      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-regal-navy-100/70 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-regal-navy-100/50 to-transparent rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="relative max-w-4xl mx-auto p-4 sm:p-6">
        <div className="sticky top-0 z-10 bg-regal-navy-50/95 backdrop-blur-sm border-b border-regal-navy-200/70 pb-3 sm:pb-4 mb-4 sm:mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 sm:pt-6">
          {!isFinderView ? (
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-1.5 text-sm text-regal-navy-500 hover:text-regal-navy-800 transition-colors mb-3 sm:mb-4"
            >
              <svg
                className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Dashboard
            </Link>
          ) : (
            <div className="mb-3 sm:mb-4" />
          )}

          <p className="text-xs font-medium tracking-widest uppercase text-regal-navy-400 mb-1">
            Conversation
          </p>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight mb-2">
            <Twemoji>
              {formatBagDisplayName(
                conversation.bag.owner_name,
                conversation.bag.bag_name,
                conversation.bag.short_id
              )}
            </Twemoji>
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-regal-navy-600">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  conversation.conversation.status === 'active'
                    ? 'bg-medium-jungle-500'
                    : conversation.conversation.status === 'resolved'
                      ? 'bg-regal-navy-400'
                      : 'bg-regal-navy-300'
                }`}
              />
              <span className="text-xs font-medium tracking-widest uppercase text-regal-navy-500">
                {conversation.conversation.status === 'resolved'
                  ? 'Resolved'
                  : 'Active'}
              </span>
            </span>

            <span className="hidden sm:flex items-center gap-1.5">
              <span
                className="w-6 h-6 rounded-full bg-regal-navy-200 text-regal-navy-700 flex items-center justify-center text-xs font-medium"
                title={conversation.bag.owner_name || 'Owner'}
              >
                {(conversation.bag.owner_name || 'O').charAt(0).toUpperCase()}
              </span>
              {conversation.conversation.finder_display_name && (
                <span
                  className="w-6 h-6 rounded-full bg-dark-coffee-100 text-dark-coffee-700 flex items-center justify-center text-xs font-medium"
                  title={conversation.conversation.finder_display_name}
                >
                  {conversation.conversation.finder_display_name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
              <span className="text-regal-navy-400 text-xs">
                {isFinderView && conversation.bag.owner_name && (
                  <Twemoji>{conversation.bag.owner_name}</Twemoji>
                )}
                {!isFinderView &&
                  conversation.conversation.finder_display_name && (
                    <Twemoji>
                      {conversation.conversation.finder_display_name}
                    </Twemoji>
                  )}
              </span>
            </span>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5 mb-4 sm:mb-6">
          {(() => {
            const currentUserSenderType = isFinderView ? 'finder' : 'owner';
            const lastReadMessage = [...conversation.messages]
              .reverse()
              .find(
                (m) => m.sender_type === currentUserSenderType && m.read_at
              );
            const lastReadMessageId = lastReadMessage?.id;

            return conversation.messages.map((message: ConversationMessage) => {
              const isCurrentUserMessage = isFinderView
                ? message.sender_type === 'finder'
                : message.sender_type === 'owner';

              const participantName = formatConversationParticipant(
                message.sender_type,
                nameInfo,
                false
              );

              const avatarInitial = participantName.charAt(0).toUpperCase();

              const isOwnerMessage = message.sender_type === 'owner';

              if (isCurrentUserMessage) {
                return (
                  <div
                    key={message.id}
                    className="flex flex-col items-end ml-8 sm:ml-14 md:ml-20"
                  >
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <Twemoji className="text-xs font-medium text-regal-navy-500">
                        You
                      </Twemoji>
                      <span className="text-xs text-regal-navy-400">
                        {formatRelativeTimestamp(message.sent_at)}
                      </span>
                    </div>
                    <div className="bg-regal-navy-700 text-white px-4 py-3 rounded-t-2xl rounded-bl-2xl rounded-br-sm shadow-soft max-w-full">
                      <Twemoji
                        tag="p"
                        className="text-wrap-aggressive leading-relaxed"
                      >
                        {message.message_content}
                      </Twemoji>
                    </div>
                    {message.id === lastReadMessageId && (
                      <span className="text-xs text-regal-navy-400 mt-0.5 px-1 flex items-center gap-1">
                        <CheckIcon color="currentColor" size="small" />
                        Seen {formatRelativeTimestamp(message.read_at!)}
                      </span>
                    )}
                  </div>
                );
              } else {
                return (
                  <div
                    key={message.id}
                    className="flex items-end gap-2.5 mr-8 sm:mr-14 md:mr-20"
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                        isOwnerMessage
                          ? 'bg-regal-navy-200 text-regal-navy-700'
                          : 'bg-dark-coffee-100 text-dark-coffee-700'
                      }`}
                      title={participantName}
                    >
                      {avatarInitial}
                    </span>
                    <div className="flex flex-col items-start min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 px-1">
                        <Twemoji className="text-xs font-medium text-regal-navy-500">
                          {participantName}
                        </Twemoji>
                        <span className="text-xs text-regal-navy-400">
                          {formatRelativeTimestamp(message.sent_at)}
                        </span>
                      </div>
                      <div className="bg-white border border-regal-navy-200 text-regal-navy-900 px-4 py-3 rounded-t-2xl rounded-br-2xl rounded-bl-sm shadow-soft max-w-full">
                        <Twemoji
                          tag="p"
                          className="text-wrap-aggressive leading-relaxed"
                        >
                          {message.message_content}
                        </Twemoji>
                      </div>
                    </div>
                  </div>
                );
              }
            });
          })()}
          <div ref={messagesEndRef} />
        </div>

        {conversation.conversation.status === 'active' && (
          <form
            onSubmit={sendReply}
            className="bg-white border border-regal-navy-200/80 rounded-2xl shadow-soft-md p-4 sm:p-6"
          >
            <h3 className="font-display text-lg sm:text-xl tracking-tight text-regal-navy-900 mb-1">
              Send a Reply
            </h3>
            <p className="text-sm text-regal-navy-500 mb-3 sm:mb-4">
              Replying as{' '}
              <Twemoji className="font-medium text-regal-navy-700">
                {replyingAsName}
              </Twemoji>
            </p>
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
            <div className="mt-3 sm:mt-4 flex flex-col-reverse sm:flex-row justify-between gap-2 sm:gap-3">
              {!isFinderView ? (
                <button
                  type="button"
                  onClick={() => setShowResolveConfirm(true)}
                  className="bg-medium-jungle-50 hover:bg-medium-jungle-100 text-medium-jungle-800 border border-medium-jungle-200 px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
                  disabled={sending || resolving}
                >
                  <span className="w-2 h-2 rounded-full bg-medium-jungle-500" />
                  {resolving ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              ) : (
                <div className="hidden sm:block" />
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
          <div className="bg-white border border-regal-navy-200/80 rounded-2xl shadow-soft-md p-6 sm:p-8">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-14 h-14 rounded-full bg-medium-jungle-100 flex items-center justify-center text-medium-jungle-700">
                  <CheckIcon color="currentColor" />
                </div>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-regal-navy-900 mb-2">
                All sorted!
              </h2>
              <p className="text-regal-navy-600 text-sm">
                This conversation has been resolved. No further replies can be
                sent.
              </p>
            </div>

            {!isFinderView && (
              <>
                <div className="border-t border-regal-navy-100 my-6" />
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleArchiveClick}
                    disabled={archiving}
                    className="inline-flex items-center gap-2 bg-saffron-50 hover:bg-saffron-100 text-saffron-800 border border-saffron-200 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArchiveIcon color="currentColor" />
                    {archiving ? 'Archiving...' : 'Archive Conversation'}
                  </button>
                  <p className="text-xs text-regal-navy-500 text-center max-w-sm">
                    Resolved conversations are automatically archived after 30
                    days. Archived conversations are permanently deleted after 6
                    months.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {conversation.conversation.status === 'archived' && (
          <div className="bg-regal-navy-100/60 border border-regal-navy-200/60 rounded-xl px-6 py-4 text-center text-regal-navy-600">
            <p>This conversation has been archived.</p>
          </div>
        )}
      </div>

      {!isFinderView && (
        <ConfirmModal
          isOpen={showResolveConfirm}
          title="Mark as Resolved"
          message="Are you sure you want to mark this conversation as resolved? No further replies can be sent."
          confirmText="Mark as Resolved"
          cancelText="Cancel"
          variant="primary"
          onConfirm={() => {
            setShowResolveConfirm(false);
            handleResolveConversation();
          }}
          onCancel={() => setShowResolveConfirm(false)}
        />
      )}

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
