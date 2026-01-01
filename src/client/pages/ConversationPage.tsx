import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import CharacterLimitTextArea from '../components/CharacterLimitTextArea';
import type { ConversationThread, ConversationMessage } from '../types/index';

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

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
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
            <span className="text-green-400">
              {conversation.conversation.status}
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
                  ? 'bg-blue-900/30 ml-8'
                  : 'bg-neutral-800 mr-8'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium">
                  {message.sender_type === 'owner'
                    ? 'You'
                    : conversation.conversation.finder_display_name || 'Finder'}
                </span>
                <span className="text-sm text-neutral-400">
                  {new Date(message.sent_at).toLocaleString()}
                </span>
              </div>
              <p className="text-neutral-200">{message.message_content}</p>
            </div>
          ))}
        </div>

        {conversation.conversation.status === 'active' && (
          <form onSubmit={sendReply} className="bg-neutral-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Send a Reply</h3>
            <CharacterLimitTextArea
              value={replyMessage}
              onChange={setReplyMessage}
              maxLength={1000}
              placeholder="Type your reply to the finder..."
              rows={4}
              disabled={sending}
            />
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={() => {
                  // TODO: Implement resolve conversation
                  console.log('Resolve conversation not implemented yet');
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 text-white rounded-lg"
                disabled={sending}
              >
                Mark as Resolved
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

        {conversation.conversation.status !== 'active' && (
          <div className="bg-neutral-800 rounded-lg p-4 text-center">
            <p className="text-neutral-400">
              This conversation has been {conversation.conversation.status}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
