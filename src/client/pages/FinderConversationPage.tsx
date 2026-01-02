import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import CharacterLimitTextArea from '../components/CharacterLimitTextArea';
import type { ConversationThread, ConversationMessage } from '../types/index';
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

export default function FinderConversationPage() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const [conversation, setConversation] = useState<ConversationThread | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const loadConversation = useCallback(async () => {
    const token = localStorage.getItem('finder_session_token');
    if (!token) {
      setError('No authentication token found');
      return;
    }

    try {
      const response = await fetch(
        `/api/finder/conversation/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('finder_session_token');
          setError(
            'Session expired. Please use your original magic link to access the conversation.'
          );
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
    }
  }, [conversationId]);

  const authenticateWithMagicLink = useCallback(async () => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid magic link - no token found');
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
        throw new Error(result.error || 'Authentication failed');
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

    const token = localStorage.getItem('finder_session_token');
    if (!token) {
      setError(
        'Session expired. Please use your original magic link to access the conversation.'
      );
      return;
    }

    setSending(true);
    try {
      const response = await fetch(
        `/api/finder/conversation/${conversationId}/reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message_content: replyMessage,
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

  useEffect(() => {
    if (conversationId) {
      const urlToken = searchParams.get('token');
      const storedToken = localStorage.getItem('finder_session_token');

      if (urlToken) {
        authenticateWithMagicLink();
      } else if (storedToken) {
        loadConversation();
        setLoading(false);
      } else {
        setError(
          'No valid authentication found. Please use your magic link to access this conversation.'
        );
        setLoading(false);
      }
    }
  }, [
    conversationId,
    searchParams,
    authenticateWithMagicLink,
    loadConversation,
  ]);

  if (loading || authenticating) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-400">
            {authenticating ? 'Authenticating...' : 'Loading conversation...'}
          </p>
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
              Access Error
            </h1>
            <p className="text-neutral-400 mb-6">{error}</p>
            <p className="text-sm text-neutral-500">
              If you need to access this conversation, please check your email
              for the original magic link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-white text-neutral-900">
        <div className="max-w-readable mx-auto p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">❓</div>
            <h1 className="text-2xl font-bold text-red-700 mb-4">
              Conversation Not Found
            </h1>
            <p className="text-neutral-800 mb-6">
              The conversation you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have access to it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-neutral-900">
            Conversation about{' '}
            {formatBagDisplayName(
              conversation.bag.owner_name,
              conversation.bag.bag_name,
              conversation.bag.short_id
            )}
          </h1>
          <p className="text-neutral-800 mb-2">
            Status:{' '}
            <span
              className={`font-bold ${
                conversation.conversation.status === 'active'
                  ? 'text-green-800'
                  : conversation.conversation.status === 'resolved'
                    ? 'text-blue-800'
                    : 'text-neutral-600'
              }`}
            >
              {conversation.conversation.status === 'resolved'
                ? 'Resolved'
                : 'Active'}
            </span>
            {conversation.bag.owner_name && (
              <span className="ml-4">
                • Owner: {conversation.bag.owner_name}
              </span>
            )}
          </p>
          <p className="text-sm text-neutral-800">
            You&apos;re connected as the finder who reported finding this item.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {conversation.messages.map((message: ConversationMessage) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg ${
                message.sender_type === 'finder'
                  ? 'bg-blue-500 text-white ml-8'
                  : 'bg-neutral-200 text-neutral-900 mr-8'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`font-medium ${
                    message.sender_type === 'finder'
                      ? 'text-white'
                      : 'text-neutral-900'
                  }`}
                >
                  {formatConversationParticipant(
                    message.sender_type,
                    {
                      ownerName: conversation.bag.owner_name,
                      bagName: conversation.bag.bag_name,
                      finderName: conversation.conversation.finder_display_name,
                    },
                    message.sender_type === 'finder'
                  )}
                </span>
                <span
                  className={`text-sm font-medium ${
                    message.sender_type === 'finder'
                      ? 'text-blue-100'
                      : 'text-neutral-600'
                  }`}
                >
                  {new Date(message.sent_at).toLocaleString()}
                </span>
              </div>
              <p
                className={`text-wrap-aggressive ${
                  message.sender_type === 'finder'
                    ? 'text-white'
                    : 'text-neutral-900'
                }`}
              >
                {message.message_content}
              </p>
            </div>
          ))}
        </div>

        {conversation.conversation.status === 'active' && (
          <form
            onSubmit={sendReply}
            className="bg-gray-100 border-2 border-gray-400 rounded-lg p-4"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Send a Reply
            </h3>
            <div onKeyDown={handleKeyDown}>
              <CharacterLimitTextArea
                value={replyMessage}
                onChange={setReplyMessage}
                maxLength={500}
                placeholder={getContextualReplyPlaceholder(
                  'owner',
                  {
                    ownerName: conversation.bag.owner_name,
                    bagName: conversation.bag.bag_name,
                    finderName: conversation.conversation.finder_display_name,
                  },
                  'response'
                )}
                rows={4}
                disabled={sending}
                variant="light"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!replyMessage.trim() || sending}
                className="px-6 py-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-500 text-white rounded-lg font-semibold"
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        )}

        {conversation.conversation.status === 'resolved' && (
          <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 text-center">
            <div className="text-blue-600 text-lg mb-2">✓</div>
            <p className="text-blue-900 font-bold">
              This conversation has been resolved by the owner.
            </p>
            <p className="text-blue-700 text-sm mt-1">
              No further replies can be sent.
            </p>
          </div>
        )}

        {conversation.conversation.status === 'archived' && (
          <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-4 text-center">
            <p className="text-yellow-900 font-bold">
              This conversation has been archived.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-100 border-2 border-blue-500 rounded-lg">
          <h4 className="text-sm font-bold text-blue-900 mb-2">
            🔒 Privacy Notice
          </h4>
          <p className="text-xs text-blue-800 font-medium">
            This conversation is secure and private. Only you and the item owner
            can see these messages. Your magic link provides secure access to
            this conversation only.
          </p>
        </div>
      </div>
    </div>
  );
}
