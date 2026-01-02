import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import CharacterLimitTextArea from '../components/CharacterLimitTextArea';
import type { ConversationThread, ConversationMessage } from '../types/index';
import { api } from '../utils/api';
import {
  formatConversationParticipant,
  getContextualReplyPlaceholder,
} from '../../infrastructure/utils/personalization';

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

  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId, loadConversation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              Error Loading Conversation
            </h1>
            <p className="text-neutral-400 mb-6">{error}</p>
            <Link
              to="/dashboard"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">❓</div>
            <h1 className="text-2xl font-bold text-yellow-400 mb-4">
              Conversation Not Found
            </h1>
            <p className="text-neutral-400 mb-6">
              The conversation you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </p>
            <Link
              to="/dashboard"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="text-blue-400 hover:text-blue-300 underline mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">
            Conversation about{' '}
            {formatBagDisplayName(
              conversation.bag.owner_name,
              conversation.bag.bag_name,
              conversation.bag.short_id
            )}
          </h1>
          <p className="text-neutral-400">
            Status:{' '}
            <span
              className={`font-medium ${
                conversation.conversation.status === 'active'
                  ? 'text-green-400'
                  : conversation.conversation.status === 'resolved'
                    ? 'text-blue-400'
                    : 'text-neutral-400'
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

        <div className="space-y-4 mb-6">
          {conversation.messages.map((message: ConversationMessage) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                message.sender_type === 'owner'
                  ? 'bg-blue-500 text-white ml-8'
                  : 'bg-neutral-200 text-neutral-900 mr-8'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium">
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
                  className={`text-sm ${
                    message.sender_type === 'owner'
                      ? 'text-blue-100'
                      : 'text-neutral-600'
                  }`}
                >
                  {new Date(message.sent_at).toLocaleString()}
                </span>
              </div>
              <p
                className={
                  message.sender_type === 'owner'
                    ? 'text-white'
                    : 'text-neutral-900'
                }
              >
                {message.message_content}
              </p>
            </div>
          ))}
        </div>

        {conversation.conversation.status === 'active' && (
          <form onSubmit={sendReply} className="bg-neutral-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Send a Reply</h3>
            <div onKeyDown={handleKeyDown}>
              <CharacterLimitTextArea
                value={replyMessage}
                onChange={setReplyMessage}
                maxLength={500}
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
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={handleResolveConversation}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 text-white rounded-lg"
                disabled={sending || resolving}
              >
                {resolving ? 'Resolving...' : 'Mark as Resolved'}
              </button>
              <button
                type="submit"
                disabled={!replyMessage.trim() || sending}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 text-white rounded-lg"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        )}

        {conversation.conversation.status === 'resolved' && (
          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-4 text-center">
            <div className="text-blue-400 text-lg mb-2">✓</div>
            <p className="text-blue-300 font-medium">
              This conversation has been resolved.
            </p>
            <p className="text-neutral-400 text-sm mt-1">
              No further replies can be sent.
            </p>
          </div>
        )}

        {conversation.conversation.status === 'archived' && (
          <div className="bg-neutral-800 rounded-lg p-4 text-center">
            <p className="text-neutral-400">
              This conversation has been archived.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
