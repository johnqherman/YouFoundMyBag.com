import { useState, useEffect, useCallback } from 'react';
import ConfirmModal from './ConfirmModal';
import {
  PrintIcon,
  DownloadActionIcon,
  AlertIcon,
  SuccessIcon,
  QRCodeIcon,
  EditPencilIcon,
  RefreshRotateIcon,
  StatusIcon,
  MailIcon,
  CheckIcon,
  DeleteIcon,
} from './icons/AppIcons';
import { TIME_MS as t } from '../constants/timeConstants';
import type {
  QRCodeData,
  SectionId,
  NavigationItem,
  BagManagementModalProps,
} from '../types';

const navigationItems: NavigationItem[] = [
  {
    id: 'qr',
    label: 'QR Code',
    icon: <QRCodeIcon color="currentColor" />,
    group: 'primary',
  },
  {
    id: 'name',
    label: 'Edit Name',
    icon: <EditPencilIcon color="currentColor" />,
    group: 'primary',
  },
  {
    id: 'status',
    label: 'Bag Status',
    icon: <StatusIcon color="currentColor" />,
    group: 'settings',
  },
  {
    id: 'rotate',
    label: 'Rotate Short Link',
    icon: <RefreshRotateIcon color="currentColor" />,
    group: 'settings',
  },
  {
    id: 'email',
    label: 'Email Preferences',
    icon: <MailIcon color="currentColor" />,
    group: 'settings',
  },
  {
    id: 'resolve',
    label: 'Resolve All',
    icon: <CheckIcon color="currentColor" />,
    group: 'advanced',
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <DeleteIcon color="currentColor" />,
    group: 'advanced',
  },
];

export default function BagManagementModal({
  isOpen,
  onClose,
  bag,
  onBagUpdated,
}: BagManagementModalProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('qr');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotateLoading, setRotateLoading] = useState(false);
  const [rotationCooldownInfo, setRotationCooldownInfo] = useState<{
    canRotate: boolean;
    nextRotationAt?: Date;
  } | null>(null);

  const [newName, setNewName] = useState(bag.bag_name || '');
  const [cooldownInfo, setCooldownInfo] = useState<{
    canUpdate: boolean;
    nextUpdateAt?: Date;
  } | null>(null);

  const [confirmResolveAll, setConfirmResolveAll] = useState(false);

  const [confirmStatusToggle, setConfirmStatusToggle] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleClose = useCallback(() => {
    setError(null);
    setSuccess(null);
    setActiveSection('qr');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setActiveSection('qr');
      setNewName(bag.bag_name || '');
      setQrData(null);
    }
  }, [isOpen, bag.bag_name]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, handleClose]);

  const getAuthToken = () => {
    return localStorage.getItem('owner_session_token');
  };

  const loadQRCode = useCallback(async () => {
    setQrLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/qr-code`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load QR code');
      }

      const data = await response.json();
      setQrData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QR code');
    } finally {
      setQrLoading(false);
    }
  }, [bag.id]);

  const loadRotationCooldownInfo = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/rotation-cooldown`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check rotation cooldown');
      }

      const data = await response.json();
      setRotationCooldownInfo(data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to check rotation cooldown'
      );
    }
  }, [bag.id]);

  const loadCooldownInfo = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/name-cooldown`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check cooldown');
      }

      const data = await response.json();
      setCooldownInfo(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check cooldown');
    }
  }, [bag.id]);

  useEffect(() => {
    if (!isOpen) return;

    if (activeSection === 'qr' && !qrData) {
      loadQRCode();
    } else if (activeSection === 'name') {
      loadCooldownInfo();
    } else if (activeSection === 'rotate') {
      loadRotationCooldownInfo();
    }
  }, [
    activeSection,
    isOpen,
    qrData,
    loadQRCode,
    loadCooldownInfo,
    loadRotationCooldownInfo,
  ]);

  if (!isOpen) return null;

  const downloadQR = () => {
    if (!qrData) return;

    const link = document.createElement('a');
    link.href = qrData.qr_code;
    link.download = `youfoundmybag-${qrData.short_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccess('QR code downloaded!');
    setTimeout(() => setSuccess(null), t.THREE_SECONDS);
  };

  const copyShortLink = () => {
    if (!qrData) return;

    navigator.clipboard.writeText(qrData.url);
    setSuccess('Link copied to clipboard!');
    setTimeout(() => setSuccess(null), t.THREE_SECONDS);
  };

  const handleRotateShortId = async () => {
    setRotateLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/rotate-short-id`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rotate short ID');
      }

      const data = await response.json();
      setQrData(data.data);
      setSuccess(
        'Short link rotated successfully! Old QR codes will no longer work for new finders.'
      );
      setTimeout(() => setSuccess(null), t.FIVE_SECONDS);
      setConfirmRotate(false);
      setActiveSection('qr');
      onBagUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to rotate short ID'
      );
    } finally {
      setRotateLoading(false);
    }
  };

  const handleUpdateName = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bag_name: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bag name');
      }

      setSuccess('Bag name updated successfully!');
      setTimeout(() => setSuccess(null), t.THREE_SECONDS);
      onBagUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update bag name'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/resolve-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to resolve conversations');
      }

      const data = await response.json();
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), t.THREE_SECONDS);
      setConfirmResolveAll(false);
      onBagUpdated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to resolve conversations'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    setLoading(true);
    setError(null);

    const newStatus = bag.status === 'active' ? 'disabled' : 'active';

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update bag status');
      }

      setSuccess(
        `Bag ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully!`
      );
      setTimeout(() => setSuccess(null), t.THREE_SECONDS);
      setConfirmStatusToggle(false);
      onBagUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBag = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete bag');
      }

      setSuccess('Bag deleted successfully!');
      setConfirmDelete(false);
      onBagUpdated();

      setTimeout(() => {
        setSuccess(null);
        handleClose();
      }, t.TWO_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bag');
    } finally {
      setLoading(false);
    }
  };

  const openEmailPreferences = async () => {
    if (!bag.owner_email) {
      setError('Email address not found');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/email-preferences/token?email=${encodeURIComponent(bag.owner_email)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get email preferences link');
      }

      const data = await response.json();
      window.open(`/email-preferences/${data.token}`, '_blank');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to open email preferences'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderSectionContent = () => {
    const hasActiveConversations = (bag.conversation_count ?? 0) > 0;
    switch (activeSection) {
      case 'qr':
        return (
          <div className="animate-fadeIn">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                QR Code & Short Link
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Print and attach this QR code to your bag so finders can reach
                you if it gets lost.
              </p>
            </div>

            {qrLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-regal-navy-600 rounded-full animate-spin mb-4" />
                <p>Loading QR code...</p>
              </div>
            ) : qrData ? (
              <div className="space-y-6">
                <div className="flex justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200">
                  <img
                    src={qrData.qr_code}
                    alt="QR Code"
                    className="w-80 h-80 bg-white rounded-xl p-4 shadow-lg"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    Short Link
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={qrData.url}
                      readOnly
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono text-sm"
                    />
                    <button
                      onClick={copyShortLink}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-lg transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={downloadQR}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <DownloadActionIcon color="currentColor" />
                    Download QR
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
                  >
                    <PrintIcon color="currentColor" />
                    Print
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'name':
        return (
          <div className="animate-fadeIn">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Edit Bag Name
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Customize the name of your bag. Names can be updated once per
                week.
              </p>
            </div>

            <div className="space-y-6">
              {cooldownInfo && !cooldownInfo.canUpdate && (
                <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <AlertIcon
                    color="currentColor"
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <strong className="block text-base font-semibold mb-1">
                      Cooldown Active
                    </strong>
                    <p className="text-sm">
                      Next update available:{' '}
                      {cooldownInfo.nextUpdateAt
                        ? new Date(
                            cooldownInfo.nextUpdateAt
                          ).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Bag Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={30}
                  disabled={!cooldownInfo?.canUpdate || loading}
                  placeholder="Enter bag name"
                  className="w-full px-4 py-3.5 text-base border-2 border-slate-300 rounded-xl bg-white text-slate-900 transition-all focus:outline-none focus:border-regal-navy-600 focus:ring-4 focus:ring-regal-navy-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                <p className="mt-2 text-sm text-slate-500">
                  {newName.length}/30 characters
                </p>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setNewName(bag.bag_name || '')}
                  disabled={loading || newName === bag.bag_name}
                  className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={handleUpdateName}
                  disabled={
                    !cooldownInfo?.canUpdate ||
                    loading ||
                    !newName.trim() ||
                    newName === bag.bag_name
                  }
                  className="flex-1 px-6 py-4 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'rotate':
        return (
          <div className="animate-fadeIn">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Rotate Short Link
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Generate a new QR code and short link.
              </p>
            </div>

            <div className="space-y-6">
              {rotationCooldownInfo && !rotationCooldownInfo.canRotate && (
                <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <AlertIcon
                    color="currentColor"
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <strong className="block text-base font-semibold mb-1">
                      Cooldown Active
                    </strong>
                    <p className="text-sm">
                      Next rotation available:{' '}
                      {rotationCooldownInfo.nextRotationAt
                        ? new Date(
                            rotationCooldownInfo.nextRotationAt
                          ).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  What happens when you rotate?
                </h3>
                <ul className="space-y-2 text-base text-slate-700 list-disc list-inside">
                  <li>
                    A new QR code and short link will be generated for your bag
                  </li>
                  <li>Old QR codes will no longer work for new finders</li>
                  <li>Existing conversations remain fully accessible</li>
                  <li>You can rotate once per week</li>
                </ul>
              </div>

              <button
                onClick={() => setConfirmRotate(true)}
                disabled={
                  rotateLoading ||
                  (rotationCooldownInfo !== null &&
                    !rotationCooldownInfo.canRotate)
                }
                className="w-full px-6 py-4 bg-saffron-400 hover:bg-saffron-500 border border-saffron-600 text-saffron-950 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rotateLoading ? 'Rotating...' : 'Rotate Short Link'}
              </button>
            </div>
          </div>
        );

      case 'status':
        return (
          <div className="animate-fadeIn">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Bag Status
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Control whether finders can start new conversations with you.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl p-8">
                <div className="flex items-center gap-4">
                  <span
                    className={`w-4 h-4 rounded-full shadow-lg ${
                      bag.status === 'active'
                        ? 'bg-green-500 ring-4 ring-green-500/20'
                        : 'bg-slate-400 ring-4 ring-slate-400/20'
                    }`}
                  />
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {bag.status === 'active' ? 'Active' : 'Disabled'}
                    </h3>
                    <p className="text-base text-slate-600">
                      {bag.status === 'active'
                        ? 'Finders can start new conversations'
                        : 'New conversations are disabled'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  {bag.status === 'active'
                    ? 'Disabling your bag will:'
                    : 'Enabling your bag will:'}
                </h3>
                <ul className="space-y-2 text-base text-slate-700 list-disc list-inside">
                  {bag.status === 'active' ? (
                    <>
                      <li>Prevent new finders from starting conversations</li>
                      <li>Keep existing conversations accessible</li>
                      <li>Show a disabled message to new finders</li>
                    </>
                  ) : (
                    <>
                      <li>Allow new finders to start conversations</li>
                      <li>Reactivate your QR code and short link</li>
                      <li>Resume normal bag functionality</li>
                    </>
                  )}
                </ul>
              </div>

              <button
                onClick={() => setConfirmStatusToggle(true)}
                className={`w-full px-6 py-4 font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                  bag.status === 'active'
                    ? 'bg-saffron-400 hover:bg-saffron-500 border border-saffron-600 text-saffron-950'
                    : 'bg-regal-navy-600 hover:bg-regal-navy-700 text-white'
                }`}
              >
                {bag.status === 'active' ? 'Disable Bag' : 'Enable Bag'}
              </button>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="animate-fadeIn">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Email Preferences
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Manage your notification preferences and email settings.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  Notification Settings
                </h3>
                <p className="text-base text-slate-700 leading-relaxed">
                  Control which emails you receive, including new conversation
                  notifications, reply alerts, and system updates.
                </p>
              </div>

              <button
                onClick={openEmailPreferences}
                disabled={loading}
                className="w-full px-6 py-4 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                {loading ? 'Opening...' : 'Manage Email Preferences'}
              </button>
            </div>
          </div>
        );

      case 'resolve':
        return (
          <div className="animate-fadeIn">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                Resolve All Conversations
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Mark all active conversations as resolved and archive them.
              </p>
            </div>

            <div className="space-y-6">
              {!hasActiveConversations && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                  <p className="text-base text-slate-600">
                    No active conversations to resolve.
                  </p>
                </div>
              )}

              {hasActiveConversations && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <h3 className="text-base font-semibold text-amber-900 mb-3">
                    Before you proceed:
                  </h3>
                  <ul className="space-y-2 text-base text-amber-800 list-disc list-inside">
                    <li>All active conversations will be marked as resolved</li>
                    <li>Conversations will be archived automatically</li>
                    <li>
                      Archived conversations are permanently deleted after 6
                      months
                    </li>
                    <li>This action affects all conversations for this bag</li>
                  </ul>
                </div>
              )}

              <button
                onClick={() => setConfirmResolveAll(true)}
                disabled={!hasActiveConversations}
                className="w-full px-6 py-4 bg-saffron-400 hover:bg-saffron-500 border border-saffron-600 text-saffron-950 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-saffron-400"
              >
                Resolve All Conversations
              </button>
            </div>
          </div>
        );

      case 'delete':
        return (
          <div className="animate-fadeIn">
            <div className="mb-10">
              <h2 className="text-4xl font-bold text-red-600 mb-3 tracking-tight">
                Delete Bag
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Permanently delete this bag and all associated data.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-200 rounded-xl text-red-900">
                <AlertIcon
                  color="currentColor"
                  className="flex-shrink-0 mt-0.5"
                />
                <div>
                  <strong className="block text-base font-semibold mb-1">
                    This action cannot be undone
                  </strong>
                  <p className="text-sm">
                    All conversations, messages, and contacts will be
                    permanently deleted.
                  </p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-red-900 mb-3">
                  What will be deleted:
                </h3>
                <ul className="space-y-2 text-base text-red-800 list-disc list-inside">
                  <li>This bag and its QR code</li>
                  <li>All conversations (active, resolved, and archived)</li>
                  <li>All messages within those conversations</li>
                  <li>All contact information</li>
                  <li>All historical data for this bag</li>
                </ul>
              </div>

              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full px-6 py-4 bg-red-100 hover:bg-red-200 border border-red-300 text-red-900 font-semibold rounded-xl transition-all"
              >
                Delete Bag Permanently
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] grid grid-cols-[280px_1fr] overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="bg-gradient-to-b from-slate-800 to-slate-900 border-r border-white/10 py-8 flex flex-col overflow-y-auto">
            <div className="px-6 pb-8 border-b border-white/10 mb-6">
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                Bag Settings
              </h1>
              <p className="text-sm text-slate-300 mb-1">
                {bag.owner_name
                  ? `${bag.owner_name}'s ${bag.bag_name || 'Bag'}`
                  : bag.bag_name || 'Bag'}
              </p>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                {bag.short_id}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="mb-8">
                <h3 className="px-6 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Quick Access
                </h3>
                {navigationItems
                  .filter((item) => item.group === 'primary')
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-6 py-3 text-base font-medium transition-all border-l-3 ${
                        activeSection === item.id
                          ? 'bg-regal-navy-600/20 border-l-regal-navy-400 text-regal-navy-300'
                          : 'border-l-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-xl opacity-90">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>

              <div className="mb-8">
                <h3 className="px-6 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Settings
                </h3>
                {navigationItems
                  .filter((item) => item.group === 'settings')
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-6 py-3 text-base font-medium transition-all border-l-3 ${
                        activeSection === item.id
                          ? 'bg-regal-navy-600/20 border-l-regal-navy-400 text-regal-navy-300'
                          : 'border-l-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-xl opacity-90">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>

              <div className="mb-8">
                <h3 className="px-6 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Advanced
                </h3>
                {navigationItems
                  .filter((item) => item.group === 'advanced')
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-6 py-3 text-base font-medium transition-all border-l-3 ${
                        activeSection === item.id
                          ? item.id === 'delete'
                            ? 'bg-red-500/10 border-l-red-400 text-red-400'
                            : 'bg-regal-navy-600/20 border-l-regal-navy-400 text-regal-navy-300'
                          : item.id === 'delete'
                            ? 'border-l-transparent text-red-300 hover:bg-red-500/5 hover:text-red-200'
                            : 'border-l-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-xl opacity-90">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          </nav>

          <main className="bg-white overflow-y-auto relative p-12">
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {success && (
              <div className="mb-8 flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 animate-slideDown">
                <SuccessIcon color="currentColor" />
                <span className="text-base">{success}</span>
              </div>
            )}

            {error && (
              <div className="mb-8 flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-800 animate-slideDown">
                <AlertIcon color="currentColor" />
                <span className="text-base">{error}</span>
              </div>
            )}

            {renderSectionContent()}
          </main>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmRotate}
        title="Rotate Short Link?"
        message="This will generate a new QR code and short link. Old QR codes will no longer work for new finders, but existing conversations will remain accessible. Are you sure?"
        confirmText="Rotate"
        cancelText="Cancel"
        onConfirm={handleRotateShortId}
        onCancel={() => setConfirmRotate(false)}
        variant="warning"
      />

      <ConfirmModal
        isOpen={confirmResolveAll}
        title="Resolve All Conversations?"
        message="This will mark all active conversations as resolved and archive them. Archived conversations are automatically deleted after 6 months."
        confirmText="Resolve All"
        cancelText="Cancel"
        onConfirm={handleResolveAll}
        onCancel={() => setConfirmResolveAll(false)}
        variant="primary"
      />

      <ConfirmModal
        isOpen={confirmStatusToggle}
        title={bag.status === 'active' ? 'Disable Bag?' : 'Enable Bag?'}
        message={
          bag.status === 'active'
            ? 'This will prevent new finders from starting conversations. Existing conversations will remain accessible.'
            : 'This will allow new finders to start conversations with you.'
        }
        confirmText={bag.status === 'active' ? 'Disable' : 'Enable'}
        cancelText="Cancel"
        onConfirm={handleStatusToggle}
        onCancel={() => setConfirmStatusToggle(false)}
        variant={bag.status === 'active' ? 'warning' : 'primary'}
      />

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete Bag Permanently?"
        message="This will permanently delete your bag, all conversations, messages, and contacts. This action cannot be undone and will free up a bag slot."
        confirmText="Delete Permanently"
        cancelText="Cancel"
        onConfirm={handleDeleteBag}
        onCancel={() => setConfirmDelete(false)}
        variant="danger"
      />
    </>
  );
}
