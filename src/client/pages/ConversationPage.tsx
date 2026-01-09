import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import CharacterLimitTextArea from '../components/CharacterLimitTextArea';
import type { ConversationThread, ConversationMessage } from '../types/index';
import { api } from '../utils/api';
import {
  formatConversationParticipant,
  getContextualReplyPlaceholder,
} from '../../infrastructure/utils/personalization';
import {
  ErrorIcon,
  QuestionIcon,
  CheckIcon,
} from '../components/icons/AppIcons';

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
  const [conversation, setConversation] = useState<ConversationThread | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversation = useCallback(async () => {
    const token = localStorage.getItem('owner_session_token');
    if (!token) {
      navigate('/auth/verify');
      return;
    }

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}?viewer_type=owner`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('owner_session_token');
          navigate('/auth/verify');
          return;
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
      setLoading(false);
    }
  }, [conversationId, navigate]);

  const sendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || sending) return;

    const token = localStorage.getItem('owner_session_token');
    if (!token) {
      navigate('/auth/verify');
      return;
    }

    setSending(true);
    try {
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

  const handleArchiveConversation = async () => {
    if (!conversationId || archiving) return;

    const token = localStorage.getItem('owner_session_token');
    if (!token) {
      navigate('/auth/verify');
      return;
    }

    if (
      !confirm(
        'Archive this conversation? It will be automatically deleted after 6 months.'
      )
    ) {
      return;
    }

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
      loadConversation();
    }
  }, [conversationId, loadConversation]);

  useEffect(() => {
    if (!conversation?.messages.length) return;

    const timeout = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 0);

    return () => clearTimeout(timeout);
  }, [conversation?.messages.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-regal-navy-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div
              className="mb-4 flex justify-center text-cinnabar-600"
              style={{ fontSize: '4rem' }}
            >
              <ErrorIcon color="currentColor" />
            </div>
            <h1 className="text-2xl font-semibold text-cinnabar-600 mb-4">
              Error Loading Conversation
            </h1>
            <p className="text-regal-navy-600 mb-6">{error}</p>
            <Link to="/dashboard" className="link">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div
              className="mb-4 flex justify-center text-saffron-700"
              style={{ fontSize: '4rem' }}
            >
              <QuestionIcon color="currentColor" />
            </div>
            <h1 className="text-2xl font-semibold text-saffron-700 mb-4">
              Conversation Not Found
            </h1>
            <p className="text-regal-navy-600 mb-6">
              The conversation you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </p>
            <Link to="/dashboard" className="link">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="sticky top-0 z-10 bg-regal-navy-50 pb-4 mb-6 -mx-6 px-6 pt-6 shadow-sm">
          <Link to="/dashboard" className="link mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-semibold mb-2">
            Conversation about{' '}
            {formatBagDisplayName(
              conversation.bag.owner_name,
              conversation.bag.bag_name,
              conversation.bag.short_id
            )}
          </h1>
          <p className="text-regal-navy-600">
            Status:{' '}
            <span
              className={`badge ${
                conversation.conversation.status === 'active'
                  ? 'badge-success'
                  : conversation.conversation.status === 'resolved'
                    ? 'badge-neutral'
                    : 'badge-neutral'
              }`}
            >
              {conversation.conversation.status === 'resolved'
                ? 'Resolved'
                : 'Active'}
            </span>
            {conversation.conversation.finder_display_name && (
              <span className="ml-4">
                • Finder: {conversation.conversation.finder_display_name}
              </span>
            )}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {conversation.messages.map((message: ConversationMessage) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                message.sender_type === 'owner'
                  ? 'bg-regal-navy-600 text-white ml-12 shadow-soft'
                  : 'bg-white border border-regal-navy-200 text-regal-navy-900 mr-12 shadow-soft'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm">
                  {formatConversationParticipant(
                    message.sender_type,
                    {
                      ownerName: conversation.bag.owner_name,
                      bagName: conversation.bag.bag_name,
                      finderName: conversation.conversation.finder_display_name,
                    },
                    message.sender_type === 'owner'
                  )}
                </span>
                <span
                  className={`text-xs ${
                    message.sender_type === 'owner'
                      ? 'text-regal-navy-200'
                      : 'text-regal-navy-500'
                  }`}
                >
                  {new Date(message.sent_at).toLocaleString('default', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-wrap-aggressive leading-relaxed">
                {message.message_content}
              </p>
            </div>
          ))}
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
                  'finder',
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
              <button
                type="button"
                onClick={handleResolveConversation}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={sending || resolving}
              >
                {resolving ? 'Resolving...' : 'Mark as Resolved'}
              </button>
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
            <button
              onClick={handleArchiveConversation}
              disabled={archiving}
              className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {archiving ? 'Archiving...' : 'Archive Conversation'}
            </button>
            <p className="text-xs text-regal-navy-600 text-center mt-2">
              Resolved conversations are automatically archived after 30 days.
              Archived conversations are permanently deleted after 6 months.
            </p>
          </div>
        )}

        {conversation.conversation.status === 'archived' && (
          <div className="alert-info text-center">
            <p>This conversation has been archived.</p>
          </div>
        )}
      </div>
    </div>
  );
}
