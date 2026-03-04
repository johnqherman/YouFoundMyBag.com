import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type {
  ConversationThread,
  ConversationMessage,
  MessageContext,
  MessageContextInfo,
  DashboardData,
  PlanInfo,
} from '../types/index.js';
import { api } from '../utils/api.js';
import { useScrollLock } from '../hooks/useScrollLock.js';
import { useEscapeKey } from '../hooks/useEscapeKey.js';
import CreateBagForm from '../components/CreateBagForm.js';
import LoadingSpinner from '../components/LoadingSpinner.js';
import ConfirmModal from '../components/ConfirmModal.js';
import BagManagementModal from '../components/BagManagementModal.js';
import AccountSettingsModal from '../components/AccountSettingsModal.js';
import RequestMagicLinkModal from '../components/RequestMagicLinkModal.js';
import PaymentModal from '../components/PaymentModal.js';
import Twemoji from '../components/Twemoji.js';
import {
  MessageIcon,
  MailIcon,
  ArchiveIcon,
  BagSettingsIcon,
  PlusIcon,
} from '../components/icons/AppIcons.js';
import { formatRelativeTimestamp } from '../utils/dateTime.js';

function QrGridPattern() {
  return (
    <svg
      className="absolute right-0 top-0 h-full w-1/2 text-regal-navy-900 opacity-[0.03]"
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => {
          const show = (row + col) % 3 !== 0 && (row * col + row) % 2 === 0;
          return show ? (
            <rect
              key={`${row}-${col}`}
              x={col * 50 + 5}
              y={row * 50 + 5}
              width="40"
              height="40"
              rx="4"
              fill="currentColor"
            />
          ) : null;
        })
      )}
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="8"
        stroke="currentColor"
        strokeWidth="6"
      />
      <rect x="25" y="25" width="50" height="50" rx="4" fill="currentColor" />
      <rect
        x="305"
        y="5"
        width="90"
        height="90"
        rx="8"
        stroke="currentColor"
        strokeWidth="6"
      />
      <rect x="325" y="25" width="50" height="50" rx="4" fill="currentColor" />
      <rect
        x="5"
        y="305"
        width="90"
        height="90"
        rx="8"
        stroke="currentColor"
        strokeWidth="6"
      />
      <rect x="25" y="325" width="50" height="50" rx="4" fill="currentColor" />
    </svg>
  );
}

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

  const tabContentRef = useRef<HTMLDivElement>(null);
  const [tabCardHeight, setTabCardHeight] = useState<number | undefined>(
    undefined
  );
  const loadingArchivedRef = useRef(loadingArchived);
  loadingArchivedRef.current = loadingArchived;

  useLayoutEffect(() => {
    const el = tabContentRef.current;
    if (!el) return;
    setTabCardHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => {
      if (loadingArchivedRef.current) return;
      setTabCardHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [confirmArchive, setConfirmArchive] = useState<{
    conversationId: string;
    event: React.MouseEvent;
  } | null>(null);
  const [managementModalBag, setManagementModalBag] = useState<{
    id: string;
    short_id: string;
    owner_name?: string;
    owner_name_override?: string;
    bag_name?: string;
    status: 'active' | 'disabled';
    owner_email?: string;
    conversation_count?: number;
  } | null>(null);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const [showCreateBagModal, setShowCreateBagModal] = useState(false);
  useScrollLock(showCreateBagModal);
  useEscapeKey(showCreateBagModal, () => setShowCreateBagModal(false));
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

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

      if (response.status === 401) {
        localStorage.removeItem('owner_session_token');
        setError(
          'Not authenticated. Please check your email for an access link.'
        );
        setLoading(false);
        return;
      }

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
        if (response.status === 404 || response.status === 500) {
          await loadDashboard();
          throw new Error(
            'This conversation no longer exists. Dashboard has been refreshed.'
          );
        }
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

  const handleUpgradeSuccess = () => {
    setPaymentModalOpen(false);
    setPaymentClientSecret(null);
    loadDashboard();
  };

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
          <title>Dashboard Error - YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="font-display text-2xl text-cinnabar-600 mb-4 tracking-tight">
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
    <div className="flex-1 bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>Your Dashboard - YouFoundMyBag.com</title>
      </Helmet>

      <section className="relative overflow-hidden">
        <QrGridPattern />
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-10 sm:pb-14">
          <div className="animate-slideUp">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-3">
                  Your Account
                </p>
                <h1 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
                  Your Dashboard
                </h1>
                <p className="mt-2 text-sm sm:text-base text-regal-navy-600">
                  Manage your bags and respond to messages from people who find
                  them.
                </p>
              </div>
              {dashboardData.plan && (
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      dashboardData.plan.plan === 'pro'
                        ? 'bg-saffron-100 text-saffron-800 border border-saffron-300'
                        : 'badge-neutral'
                    }`}
                  >
                    {dashboardData.plan.plan === 'pro' ? '✦ Pro' : 'Free Plan'}
                  </span>
                  <span className="text-sm text-regal-navy-500">
                    {dashboardData.bags.length}/{dashboardData.plan.bagLimit}{' '}
                    tags
                  </span>
                  {dashboardData.plan.plan === 'free' && (
                    <button
                      onClick={async () => {
                        setUpgradeLoading(true);
                        try {
                          const token = localStorage.getItem(
                            'owner_session_token'
                          );
                          if (!token) return;
                          const result = await api.createSubscriptionIntent(
                            'monthly',
                            token
                          );
                          setPaymentClientSecret(result.data.clientSecret);
                          setPaymentModalOpen(true);
                        } catch {
                          setError(
                            'Failed to start upgrade. Please try again.'
                          );
                        } finally {
                          setUpgradeLoading(false);
                        }
                      }}
                      disabled={upgradeLoading}
                      className="text-sm font-medium text-regal-navy-700 hover:text-regal-navy-900 underline underline-offset-2"
                    >
                      {upgradeLoading ? 'Loading...' : 'Upgrade to Pro'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowAccountSettings(true)}
                    className="text-regal-navy-500 hover:text-regal-navy-900 transition-colors p-1"
                    title="Account settings"
                    aria-label="Account settings"
                  >
                    <BagSettingsIcon color="currentColor" />
                  </button>
                </div>
              )}
            </div>
            {dashboardData.plan?.subscription_status === 'past_due' && (
              <div className="mt-3 bg-saffron-50 border border-saffron-200 rounded-lg px-4 py-3 text-sm text-saffron-800">
                Your payment is past due. Please update your payment method to
                avoid losing Pro features.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="md:col-span-1">
            <div className="bg-gradient-to-b from-white to-regal-navy-50/50 border border-regal-navy-200/60 rounded-2xl p-6 sm:p-8">
              <h2 className="font-display text-xl text-regal-navy-700 mb-5 flex items-center gap-2">
                Your Bags
                <span className="text-regal-navy-400 font-sans text-sm font-normal">
                  ({dashboardData.bags.length})
                </span>
                {dashboardData.plan?.plan === 'pro' &&
                  dashboardData.bags.length < dashboardData.plan.bagLimit && (
                    <button
                      onClick={() => setShowCreateBagModal(true)}
                      className="ml-auto text-regal-navy-400 hover:text-regal-navy-700 transition-colors"
                      title="Create another bag"
                      aria-label="Create another bag"
                    >
                      <PlusIcon size="small" color="currentColor" />
                    </button>
                  )}
              </h2>

              {dashboardData.bags.length === 0 ? (
                <div className="text-center text-regal-navy-500 py-8">
                  <p>No bags created yet.</p>
                  <a href="/" className="link mt-2 inline-block">
                    Create your first bag
                  </a>
                </div>
              ) : (
                <div>
                  {dashboardData.bags.map((bag) => (
                    <div
                      key={bag.id}
                      className="group relative flex items-start gap-3 rounded-xl -mx-2 px-3 py-3 hover:bg-regal-navy-50 transition-colors cursor-pointer"
                      onClick={() =>
                        setManagementModalBag({
                          id: bag.id,
                          short_id: bag.short_id,
                          owner_name: bag.owner_name,
                          owner_name_override: bag.owner_name_override,
                          bag_name: bag.bag_name,
                          status: bag.status,
                          owner_email: dashboardData?.owner_email,
                          conversation_count: bag.conversation_count,
                        })
                      }
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          bag.status === 'active'
                            ? 'bg-medium-jungle-500'
                            : 'bg-regal-navy-300'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-regal-navy-900 text-sm leading-snug">
                          <Twemoji>
                            {formatBagDisplayName(
                              bag.owner_name_override || bag.owner_name,
                              bag.bag_name,
                              bag.short_id
                            )}
                          </Twemoji>
                        </p>
                        <div className="flex items-center flex-wrap gap-1 mt-1">
                          <span className="font-mono text-xs bg-regal-navy-100 text-regal-navy-500 px-1.5 py-0.5 rounded">
                            {bag.short_id}
                          </span>
                          <span className="text-xs text-regal-navy-400">
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
                      <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-regal-navy-400 shrink-0"
                        aria-hidden="true"
                      >
                        <BagSettingsIcon color="currentColor" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-1 lg:col-span-2">
            <motion.div
              className="bg-white border border-regal-navy-200/60 rounded-2xl overflow-hidden"
              animate={{ height: tabCardHeight ?? 'auto' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div ref={tabContentRef} className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6">
                  <h2 className="font-display text-xl text-regal-navy-700">
                    <AnimatePresence
                      custom={activeTab === 'archived' ? 1 : -1}
                      mode="popLayout"
                    >
                      <motion.span
                        key={activeTab}
                        custom={activeTab === 'archived' ? 1 : -1}
                        variants={{
                          enter: (dir: number) => ({ opacity: 0, x: dir * 16 }),
                          center: { opacity: 1, x: 0 },
                          exit: (dir: number) => ({ opacity: 0, x: dir * -16 }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="inline-block whitespace-nowrap"
                      >
                        {activeTab === 'active'
                          ? 'Recent Messages'
                          : 'Archived'}
                      </motion.span>
                    </AnimatePresence>
                  </h2>
                  <div className="inline-flex items-center bg-regal-navy-100 border border-regal-navy-200 rounded-full p-1">
                    <button
                      onClick={() => setActiveTab('active')}
                      className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                        activeTab === 'active'
                          ? 'text-regal-navy-900'
                          : 'text-regal-navy-600 hover:text-regal-navy-800'
                      }`}
                    >
                      {activeTab === 'active' && (
                        <motion.div
                          layoutId="tab-pill"
                          className="absolute inset-0 bg-white rounded-full shadow-soft"
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        />
                      )}
                      <span className="relative">Active</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('archived')}
                      className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                        activeTab === 'archived'
                          ? 'text-regal-navy-900'
                          : 'text-regal-navy-600 hover:text-regal-navy-800'
                      }`}
                    >
                      {activeTab === 'archived' && (
                        <motion.div
                          layoutId="tab-pill"
                          className="absolute inset-0 bg-white rounded-full shadow-soft"
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        />
                      )}
                      <span className="relative">Archived</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence
                  custom={activeTab === 'archived' ? 1 : -1}
                  mode="wait"
                  initial={false}
                >
                  <motion.div
                    key={activeTab}
                    custom={activeTab === 'archived' ? 1 : -1}
                    variants={{
                      enter: (dir: number) => ({ opacity: 0, x: dir * 20 }),
                      center: { opacity: 1, x: 0 },
                      exit: (dir: number) => ({ opacity: 0, x: dir * -20 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
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
                            When someone scans your tag and sends a message, it
                            will appear here.
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
                              (msg) =>
                                msg.sender_type === 'finder' && !msg.read_at
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

                            const leftBorderClass =
                              unreadCount > 0
                                ? 'border-l-cinnabar-400'
                                : thread.conversation.status === 'resolved'
                                  ? 'border-l-medium-jungle-400'
                                  : 'border-l-regal-navy-200';

                            return (
                              <div
                                key={thread.conversation.id}
                                className={`group relative bg-white rounded-xl p-5 border-l-2 border border-regal-navy-200/60 hover:border-regal-navy-300 cursor-pointer transition-all duration-150 hover:shadow-soft-md ${leftBorderClass}`}
                                onClick={() =>
                                  navigate(
                                    `/dashboard/conversation/${thread.conversation.id}`
                                  )
                                }
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="font-medium text-regal-navy-900">
                                        <Twemoji>
                                          {formatBagDisplayName(
                                            thread.bag.owner_name,
                                            thread.bag.bag_name,
                                            thread.bag.short_id
                                          )}
                                        </Twemoji>
                                      </h3>
                                      {unreadCount > 0 && (
                                        <span className="badge badge-error">
                                          {unreadCount} new
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-regal-navy-600 mt-1">
                                      <span>
                                        Started{' '}
                                        {new Date(
                                          thread.conversation.created_at
                                        ).toLocaleDateString()}
                                      </span>
                                      <span
                                        className={`badge ${
                                          thread.conversation.status ===
                                          'resolved'
                                            ? 'bg-regal-navy-100 text-regal-navy-700'
                                            : contextInfo?.context === 'initial'
                                              ? 'bg-regal-navy-100 text-regal-navy-700'
                                              : contextInfo?.context ===
                                                  'follow-up'
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
                                          {thread.conversation.status ===
                                          'resolved'
                                            ? 'Resolved'
                                            : contextInfo?.context === 'initial'
                                              ? 'New'
                                              : contextInfo?.context ===
                                                  'follow-up'
                                                ? 'Follow-up'
                                                : 'Active'}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    {lastMessage && (
                                      <span className="text-xs text-regal-navy-400">
                                        {formatRelativeTimestamp(
                                          lastMessage.sent_at
                                        )}
                                      </span>
                                    )}
                                    {thread.conversation.status ===
                                      'resolved' && (
                                      <button
                                        onClick={(e) =>
                                          handleArchiveClick(
                                            thread.conversation.id,
                                            e
                                          )
                                        }
                                        disabled={
                                          archivingId === thread.conversation.id
                                        }
                                        className="bg-regal-navy-50 hover:bg-regal-navy-100 active:bg-regal-navy-200 text-regal-navy-800 font-medium py-3 px-4 sm:py-2.5 sm:px-5 rounded-lg shadow-soft transition-all duration-150 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-regal-navy-300 focus:ring-offset-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Archive conversation"
                                      >
                                        {archivingId === thread.conversation.id
                                          ? 'Archiving...'
                                          : 'Archive'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {lastMessage && (
                                  <div className="border-l-2 border-regal-navy-200 pl-3 mt-2">
                                    <p className="text-sm text-regal-navy-700 line-clamp-1">
                                      <span className="text-xs font-semibold text-regal-navy-500 uppercase tracking-wide mr-1.5">
                                        {contextLabel}
                                      </span>
                                      <Twemoji className="text-wrap-aggressive overflow-hidden text-ellipsis">
                                        {lastMessage.message_content}
                                      </Twemoji>
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
                            Resolved conversations are automatically archived
                            after 30 days.
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
                                className="bg-regal-navy-50/70 rounded-xl p-5 border border-regal-navy-100 hover:border-regal-navy-200 cursor-pointer transition-all duration-150 hover:shadow-soft"
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
                                    {thread.conversation
                                      .permanently_deleted_at && (
                                      <p className="text-xs text-cinnabar-600 mt-1">
                                        Will be permanently deleted on{' '}
                                        {new Date(
                                          thread.conversation
                                            .permanently_deleted_at
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
                                    disabled={
                                      restoringId === thread.conversation.id
                                    }
                                    className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {restoringId === thread.conversation.id
                                      ? 'Restoring...'
                                      : 'Restore'}
                                  </button>
                                </div>

                                {lastMessage && (
                                  <div className="border-l-2 border-regal-navy-200 pl-3 mt-2">
                                    <p className="text-sm text-regal-navy-700 line-clamp-1">
                                      <Twemoji className="text-wrap-aggressive overflow-hidden text-ellipsis">
                                        {lastMessage.message_content}
                                      </Twemoji>
                                    </p>
                                    <p className="text-xs text-regal-navy-400 mt-1">
                                      {formatRelativeTimestamp(
                                        lastMessage.sent_at
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {showCreateBagModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowCreateBagModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl text-regal-navy-900">
                Create New Bag
              </h3>
              <button
                onClick={() => setShowCreateBagModal(false)}
                className="text-regal-navy-400 hover:text-regal-navy-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <CreateBagForm
              onSuccess={() => {
                setShowCreateBagModal(false);
                loadDashboard();
              }}
            />
          </div>
        </div>
      )}

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
          planInfo={dashboardData?.plan}
        />
      )}

      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        planInfo={dashboardData?.plan}
        email={dashboardData?.owner_email}
        ownerName={dashboardData.bags[0]?.owner_name}
        onSaved={loadDashboard}
      />

      {paymentModalOpen && paymentClientSecret && (
        <PaymentModal
          isOpen={paymentModalOpen}
          clientSecret={paymentClientSecret}
          billingPeriod="monthly"
          onSuccess={handleUpgradeSuccess}
          onClose={() => {
            setPaymentModalOpen(false);
            setPaymentClientSecret(null);
          }}
        />
      )}
    </div>
  );
}
