import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useToast } from '../hooks/useToast.js';
import { useModalBackdrop } from '../hooks/useModalBackdrop.js';
import { useScrollLock } from '../hooks/useScrollLock.js';
import ConfirmModal from './ConfirmModal.js';
import BrandedQRCode, {
  downloadQRWithBorder,
  printQR,
} from './BrandedQRCode.js';
import type QRCodeStyling from 'qr-code-styling';
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
  PaletteIcon,
  BagIcon,
  PrivacyIcon,
  MessageIcon,
  PhoneContactIcon,
  getContactMethodIcon,
} from './icons/AppIcons.js';
import { formatPhoneNumber } from '../../infrastructure/utils/formatting.js';
import { api } from '../utils/api.js';
import { getMinLuminance, isColorTooLight } from '../utils/color.js';
import type {
  QRCodeData,
  SectionId,
  NavigationItem,
  BagManagementModalProps,
} from '../types/index.js';

function ColorPickerSwatch({
  value,
  onChange,
  size,
  borderClass,
}: {
  value: string;
  onChange: (value: string) => void;
  size: 'sm' | 'md';
  borderClass: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(false);
  const suppressClick = useRef(false);
  const removeDocListener = useRef<(() => void) | null>(null);

  const close = () => {
    isOpenRef.current = false;
    removeDocListener.current?.();
    removeDocListener.current = null;
  };

  const dim = size === 'sm' ? 'w-9 h-9' : 'w-10 h-10';
  return (
    <div className={`${dim} shrink-0 rounded border ${borderClass}`}>
      <div
        className="dark-mode-immune w-full h-full rounded relative overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full"
        />
        <div
          className="absolute inset-0 cursor-pointer"
          onMouseDown={() => {
            if (isOpenRef.current) suppressClick.current = true;
          }}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              close();
              return;
            }
            isOpenRef.current = true;
            inputRef.current?.click();
            const handler = () => close();
            setTimeout(() => {
              document.addEventListener('mousedown', handler, { once: true });
              removeDocListener.current = () =>
                document.removeEventListener('mousedown', handler);
            }, 0);
          }}
        />
      </div>
    </div>
  );
}

const GRADIENT_PRESETS = [
  { label: 'Ocean', start: '#1e3a5f', end: '#4a90e2' },
  { label: 'Forest', start: '#1a3c2b', end: '#52b788' },
  { label: 'Lavender', start: '#4a3f6b', end: '#c3b1e1' },
  { label: 'Rose', start: '#8b2252', end: '#f4a5c0' },
  { label: 'Slate', start: '#1e293b', end: '#64748b' },
  { label: 'Amber', start: '#78350f', end: '#fbbf24' },
  { label: 'Mint', start: '#134e4a', end: '#5eead4' },
];

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
    mobileLabel: 'Rotate Link',
    icon: <RefreshRotateIcon color="currentColor" />,
    group: 'settings',
  },
  {
    id: 'email',
    label: 'Email Preferences',
    mobileLabel: 'Email Prefs',
    icon: <MailIcon color="currentColor" />,
    group: 'settings',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: <PaletteIcon color="currentColor" />,
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
  planInfo,
}: BagManagementModalProps) {
  useScrollLock(isOpen);
  const { toast } = useToast();
  const isFree = !planInfo || planInfo.plan === 'free';
  const [activeSection, setActiveSection] = useState<SectionId>('qr');
  const [loading, setLoading] = useState(false);
  const [bagStatus, setBagStatus] = useState<'active' | 'disabled'>(bag.status);

  useEffect(() => {
    setBagStatus(bag.status);
  }, [bag.status]);

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

  const [ownerNameOverride, setOwnerNameOverride] = useState(
    bag.owner_name_override || ''
  );
  const [ownerNameLoading, setOwnerNameLoading] = useState(false);

  const [confirmResolveAll, setConfirmResolveAll] = useState(false);

  const [confirmStatusToggle, setConfirmStatusToggle] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [tagColorStart, setTagColorStart] = useState('');
  const [tagColorEnd, setTagColorEnd] = useState('');
  const [colorFromPreset, setColorFromPreset] = useState(false);
  const [showBrandingOverride, setShowBrandingOverride] = useState<
    boolean | null
  >(null);
  const [appearanceLoading, setAppearanceLoading] = useState(false);
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [saveButtonState, setSaveButtonState] = useState<
    'idle' | 'saving' | 'saved'
  >('idle');
  const [appearanceLoaded, setAppearanceLoaded] = useState(false);
  const autoSaveEnabledRef = useRef(false);
  const [finderPreviewData, setFinderPreviewData] = useState<{
    owner_name?: string;
    bag_name?: string;
    owner_message?: string;
    secure_messaging_enabled: boolean;
    contact_options: Array<{
      type: string;
      label: string;
      value: string;
      is_primary: boolean;
    }>;
  } | null>(null);

  const qrInstanceRef = useRef<QRCodeStyling | null>(null);

  const navItemsRef = useRef<HTMLDivElement>(null);
  const navButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [navIndicator, setNavIndicator] = useState({
    top: 0,
    height: 48,
    isDelete: false,
  });

  const handleQRInstanceReady = useCallback((instance: QRCodeStyling) => {
    qrInstanceRef.current = instance;
  }, []);

  const handleClose = useCallback(() => {
    setActiveSection('qr');
    onClose();
  }, [onClose]);
  const backdropProps = useModalBackdrop(handleClose);

  useEffect(() => {
    const btn = navButtonRefs.current[activeSection];
    const container = navItemsRef.current;
    if (!btn || !container) return;
    const btnRect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setNavIndicator({
      top: btnRect.top - containerRect.top + container.scrollTop,
      height: btnRect.height,
      isDelete: activeSection === 'delete',
    });
  }, [activeSection, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveSection('qr');
      setNewName(bag.bag_name || '');
      setOwnerNameOverride(bag.owner_name_override || '');
      setQrData(null);
      setTagColorStart('');
      setTagColorEnd('');
      setShowBrandingOverride(null);
      setAppearanceLoaded(false);
    }
  }, [isOpen, bag.bag_name, bag.owner_name_override]);

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
      toast.error(
        err instanceof Error ? err.message : 'Failed to load QR code'
      );
    } finally {
      setQrLoading(false);
    }
  }, [bag.id, toast]);

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
      toast.error(
        err instanceof Error ? err.message : 'Failed to check rotation cooldown'
      );
    }
  }, [bag.id, toast]);

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
      toast.error(
        err instanceof Error ? err.message : 'Failed to check cooldown'
      );
    }
  }, [bag.id, toast]);

  const loadAppearance = useCallback(async () => {
    setAppearanceLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/appearance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load appearance settings');
      }

      const data = await response.json();
      setTagColorStart(data.data.tag_color_start ?? '');
      setTagColorEnd(data.data.tag_color_end ?? '');
      setShowBrandingOverride(data.data.show_branding ?? null);

      try {
        const finderData = await api.getFinderPageData(bag.short_id);
        if (finderData.data.status === 'active') {
          setFinderPreviewData(finderData.data);
        }
      } catch {
        // non-critical
      }

      setAppearanceLoaded(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load appearance settings'
      );
    } finally {
      setAppearanceLoading(false);
    }
  }, [bag.id, toast]);

  useEffect(() => {
    if (!isOpen) return;

    if (activeSection === 'qr') {
      if (!qrData) loadQRCode();
      if (!isFree && !appearanceLoaded) loadAppearance();
    } else if (activeSection === 'name') {
      loadCooldownInfo();
    } else if (activeSection === 'rotate') {
      loadRotationCooldownInfo();
    } else if (activeSection === 'appearance' && !isFree && !appearanceLoaded) {
      loadAppearance();
    }
  }, [
    activeSection,
    isOpen,
    qrData,
    loadQRCode,
    loadCooldownInfo,
    loadRotationCooldownInfo,
    isFree,
    appearanceLoaded,
    loadAppearance,
  ]);

  useEffect(() => {
    if (!appearanceLoaded) {
      autoSaveEnabledRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      autoSaveEnabledRef.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [appearanceLoaded]);

  useEffect(() => {
    if (!autoSaveEnabledRef.current || activeSection !== 'qr') return;
    const timer = setTimeout(() => handleSaveAppearance(true), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagColorStart, tagColorEnd, showBrandingOverride]);

  if (!isOpen) return null;

  const downloadQR = async () => {
    if (!qrData || !qrInstanceRef.current) return;

    await downloadQRWithBorder(
      qrInstanceRef.current,
      `youfoundmybag-${qrData.short_id}`
    );

    toast.success('QR code downloaded!');
  };

  const copyShortLink = () => {
    if (!qrData) return;

    navigator.clipboard.writeText(qrData.url);
    toast.success('Link copied to clipboard!');
  };

  const handleRotateShortId = async () => {
    setRotateLoading(true);

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
      toast.success(
        'Short link rotated successfully! Old QR codes will no longer work for new finders.',
        { duration: 7000 }
      );
      setConfirmRotate(false);
      setActiveSection('qr');
      onBagUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to rotate short ID'
      );
    } finally {
      setRotateLoading(false);
    }
  };

  const handleUpdateName = async () => {
    setLoading(true);

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

      toast.success('Bag name updated successfully!');
      onBagUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update bag name'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOwnerNameOverride = async () => {
    setOwnerNameLoading(true);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/owner-name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner_name_override: ownerNameOverride.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || 'Failed to update owner name'
        );
      }

      toast.success('Owner name updated!');
      onBagUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update owner name'
      );
    } finally {
      setOwnerNameLoading(false);
    }
  };

  const handleResolveAll = async () => {
    setLoading(true);

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
      toast.success(data.message);
      setConfirmResolveAll(false);
      onBagUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to resolve conversations'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    setLoading(true);

    const newStatus = bagStatus === 'active' ? 'disabled' : 'active';

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

      setBagStatus(newStatus);
      toast.success(
        `Bag ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully!`
      );
      setConfirmStatusToggle(false);
      onBagUpdated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update status'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBag = async () => {
    setLoading(true);

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

      toast.success('Bag deleted successfully!');
      setConfirmDelete(false);
      onBagUpdated();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete bag');
    } finally {
      setLoading(false);
    }
  };

  const openEmailPreferences = async () => {
    if (!bag.owner_email) {
      toast.error('Email address not found');
      return;
    }

    setLoading(true);

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
      toast.error(
        err instanceof Error ? err.message : 'Failed to open email preferences'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAppearance = async (silent = false) => {
    setAppearanceSaving(true);
    if (!silent) setSaveButtonState('saving');

    try {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      const colorStart = hexRegex.test(tagColorStart) ? tagColorStart : null;
      const colorEnd = hexRegex.test(tagColorEnd) ? tagColorEnd : null;

      const token = getAuthToken();
      const response = await fetch(`/api/bags/${bag.id}/appearance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tag_color_start: colorStart,
          tag_color_end: colorEnd,
          show_branding: showBrandingOverride,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || 'Failed to save appearance'
        );
      }

      if (!silent) {
        setSaveButtonState('saved');
        setTimeout(() => setSaveButtonState('idle'), 1800);
        toast.success('Appearance saved!');
      }
      onBagUpdated();
    } catch (err) {
      if (!silent) setSaveButtonState('idle');
      toast.error(
        err instanceof Error ? err.message : 'Failed to save appearance'
      );
    } finally {
      setAppearanceSaving(false);
    }
  };

  const renderSectionContent = () => {
    const hasActiveConversations = (bag.conversation_count ?? 0) > 0;
    switch (activeSection) {
      case 'qr':
        return (
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                QR Code & Short Link
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Print and attach this QR code to your bag so finders can reach
                you if it gets lost.
              </p>
            </div>

            {qrLoading ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-slate-500">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-slate-200 border-t-regal-navy-600 rounded-full animate-spin mb-4" />
                <p>Loading QR code...</p>
              </div>
            ) : qrData ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="qr-code-container flex justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl sm:rounded-2xl border-2 border-slate-200">
                  <BrandedQRCode
                    url={qrData.url}
                    size={320}
                    colorStart={tagColorStart || undefined}
                    colorEnd={tagColorEnd || undefined}
                    onInstanceReady={handleQRInstanceReady}
                    className="rounded-[9px] sm:rounded-[11px] shadow-lg"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2 sm:mb-3">
                    Short Link
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={qrData.url}
                      readOnly
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono text-xs sm:text-sm"
                    />
                    <button
                      onClick={copyShortLink}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-lg transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    QR Style{' '}
                    {isFree && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-saffron-100 text-saffron-800 border border-saffron-300 normal-case tracking-normal">
                        ✦ Pro
                      </span>
                    )}
                  </label>

                  {isFree ? (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm">
                      Customize your QR code colors with a Pro plan.{' '}
                      <a
                        href="/pricing"
                        className="font-medium text-regal-navy-700 hover:text-regal-navy-900 underline underline-offset-2"
                      >
                        Upgrade to Pro
                      </a>
                    </div>
                  ) : appearanceLoading ? (
                    <div className="flex items-center gap-3 py-4 text-slate-500 text-sm">
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-regal-navy-600 rounded-full animate-spin" />
                      Loading color settings...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => {
                              setTagColorStart('');
                              setTagColorEnd('');
                            }}
                            className={`h-10 w-full rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-all bg-white text-slate-600 ${
                              !tagColorStart
                                ? 'border-regal-navy-600 ring-2 ring-regal-navy-600/20'
                                : 'border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            None
                          </button>
                          <span className="text-xs text-center text-slate-500">
                            None
                          </span>
                        </div>
                        {GRADIENT_PRESETS.map((preset) => (
                          <div
                            key={preset.label}
                            className="flex flex-col items-center gap-1"
                          >
                            <button
                              title={preset.label}
                              onClick={() => {
                                setTagColorStart(preset.start);
                                setTagColorEnd(preset.end);
                                setColorFromPreset(true);
                              }}
                              className={`dark-mode-immune h-10 w-full rounded-lg border-2 transition-all ${
                                tagColorStart === preset.start &&
                                tagColorEnd === preset.end
                                  ? 'border-regal-navy-600 ring-2 ring-regal-navy-600/20 scale-105'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{
                                background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                              }}
                            />
                            <span className="text-xs text-center text-slate-500">
                              {preset.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const startTooLight =
                          !colorFromPreset && isColorTooLight(tagColorStart);
                        const endTooLight =
                          !colorFromPreset && isColorTooLight(tagColorEnd);
                        return (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                  Start Color
                                </label>
                                <div className="flex gap-2">
                                  <ColorPickerSwatch
                                    value={tagColorStart || '#1e3a5f'}
                                    onChange={(v) => {
                                      setColorFromPreset(false);
                                      setTagColorStart(v);
                                    }}
                                    size="sm"
                                    borderClass={
                                      startTooLight
                                        ? 'border-amber-400'
                                        : 'border-slate-300'
                                    }
                                  />
                                  <input
                                    type="text"
                                    value={tagColorStart}
                                    onChange={(e) => {
                                      setColorFromPreset(false);
                                      setTagColorStart(e.target.value);
                                    }}
                                    placeholder="#000000"
                                    maxLength={7}
                                    className={`flex-1 px-2 py-1.5 border rounded-lg text-xs font-mono focus:outline-none ${startTooLight ? 'border-amber-400 focus:border-amber-500' : 'border-slate-300 focus:border-regal-navy-600'}`}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                  End Color
                                </label>
                                <div className="flex gap-2">
                                  <ColorPickerSwatch
                                    value={tagColorEnd || '#4a90e2'}
                                    onChange={(v) => {
                                      setColorFromPreset(false);
                                      setTagColorEnd(v);
                                    }}
                                    size="sm"
                                    borderClass={
                                      endTooLight
                                        ? 'border-amber-400'
                                        : 'border-slate-300'
                                    }
                                  />
                                  <input
                                    type="text"
                                    value={tagColorEnd}
                                    onChange={(e) => {
                                      setColorFromPreset(false);
                                      setTagColorEnd(e.target.value);
                                    }}
                                    placeholder="#000000"
                                    maxLength={7}
                                    className={`flex-1 px-2 py-1.5 border rounded-lg text-xs font-mono focus:outline-none ${endTooLight ? 'border-amber-400 focus:border-amber-500' : 'border-slate-300 focus:border-regal-navy-600'}`}
                                  />
                                </div>
                              </div>
                            </div>
                            {(startTooLight || endTooLight) && (
                              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                {startTooLight && endTooLight
                                  ? 'Both colors are too light'
                                  : startTooLight
                                    ? 'Start color is too light'
                                    : 'End color is too light'}{' '}
                                — low contrast on white may cause scan failures.
                                Use darker shades.
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button
                    onClick={downloadQR}
                    className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md sm:hover:-translate-y-0.5"
                  >
                    <DownloadActionIcon color="currentColor" />
                    Download QR
                  </button>
                  <button
                    onClick={() => {
                      if (qrInstanceRef.current) printQR(qrInstanceRef.current);
                    }}
                    className="hidden sm:flex flex-1 items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
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
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                Edit Bag Name
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                {isFree
                  ? 'Names can be updated once per week.'
                  : 'Rename anytime with your Pro plan.'}
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
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

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 sm:mt-8">
                <button
                  onClick={() => setNewName(bag.bag_name || '')}
                  disabled={loading || newName === bag.bag_name}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md sm:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="border-t border-slate-100 pt-6 mt-2" />

              <div>
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Owner Name for This Bag{' '}
                  {isFree && (
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-saffron-100 text-saffron-800 border border-saffron-300 normal-case tracking-normal">
                      ✦ Pro
                    </span>
                  )}
                </label>
                {isFree ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm">
                    Set a different name per bag — perfect for families.
                    Requires Pro.{' '}
                    <a
                      href="/pricing"
                      className="font-medium text-regal-navy-700 hover:text-regal-navy-900 underline underline-offset-2"
                    >
                      Upgrade to Pro
                    </a>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={ownerNameOverride}
                      onChange={(e) => setOwnerNameOverride(e.target.value)}
                      maxLength={30}
                      disabled={ownerNameLoading}
                      placeholder={bag.owner_name || 'e.g. Emma'}
                      className="w-full px-4 py-3.5 text-base border-2 border-slate-300 rounded-xl bg-white text-slate-900 transition-all focus:outline-none focus:border-regal-navy-600 focus:ring-4 focus:ring-regal-navy-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Leave blank to use &ldquo;
                      {bag.owner_name || 'account name'}&rdquo;
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                      <button
                        onClick={() =>
                          setOwnerNameOverride(bag.owner_name_override || '')
                        }
                        disabled={
                          ownerNameLoading ||
                          ownerNameOverride === (bag.owner_name_override || '')
                        }
                        className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reset
                      </button>
                      <button
                        onClick={handleSaveOwnerNameOverride}
                        disabled={
                          ownerNameLoading ||
                          ownerNameOverride === (bag.owner_name_override || '')
                        }
                        className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md sm:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
                      >
                        {ownerNameLoading ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'rotate':
        return (
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                Rotate Your Short Link
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Generate a new QR code and short link if the current one has
                been over-shared or needs a reset.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {rotationCooldownInfo && !rotationCooldownInfo.canRotate && (
                <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <AlertIcon
                    color="currentColor"
                    className="flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <strong className="block text-base font-semibold mb-1">
                      You rotated recently
                    </strong>
                    <p className="text-sm">
                      You can rotate again on{' '}
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
                      .
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  What rotation does
                </h3>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-saffron-100 flex items-center justify-center shrink-0">
                      <RefreshRotateIcon
                        color="currentColor"
                        className="text-saffron-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        Generates a fresh QR code and short link
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your bag gets a brand-new scannable code immediately.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertIcon
                        color="currentColor"
                        className="text-amber-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        Invalidates your old link
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Anyone scanning the old QR code or visiting the old
                        short link will see a not-found page.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-medium-jungle-100 flex items-center justify-center shrink-0">
                      <CheckIcon
                        color="currentColor"
                        className="text-medium-jungle-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        Keeps existing conversations intact
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        All your current threads and messages remain fully
                        accessible.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-regal-navy-100 flex items-center justify-center shrink-0">
                      <MailIcon
                        color="currentColor"
                        className="text-regal-navy-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        One rotation per week
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        A cooldown period applies after each rotation.
                      </p>
                    </div>
                  </div>
                </div>
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
                {rotateLoading ? 'Rotating...' : 'Generate New Link'}
              </button>
            </div>
          </div>
        );

      case 'status':
        return (
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                Bag Visibility
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Control whether finders who scan your QR code can reach out to
                you.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div
                className={`border-2 rounded-2xl p-6 ${bagStatus === 'active' ? 'bg-medium-jungle-50 border-medium-jungle-200' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bagStatus === 'active' ? 'bg-medium-jungle-100 text-medium-jungle-700' : 'bg-slate-200 text-slate-500'}`}
                  >
                    <StatusIcon color="currentColor" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-slate-900">
                        {bagStatus === 'active' ? 'Active' : 'Disabled'}
                      </h3>
                      <span
                        className={`badge ${bagStatus === 'active' ? 'badge-success' : 'badge-neutral'}`}
                      >
                        {bagStatus === 'active'
                          ? 'Accepting messages'
                          : 'Paused'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {bagStatus === 'active'
                        ? 'Finders who scan your QR code can send you a message.'
                        : 'Finders see a disabled notice and cannot message you.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  {bagStatus === 'active'
                    ? 'Disabling will'
                    : 'Re-enabling will'}
                </h3>
                <div className="divide-y divide-slate-100">
                  {bagStatus === 'active' ? (
                    <>
                      <div className="flex items-start gap-3 py-3 first:pt-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <AlertIcon
                            color="currentColor"
                            className="text-amber-700"
                          />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium text-slate-800">
                            Block new messages
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            New finders will see a notice that this bag is
                            currently disabled.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 py-3">
                        <div className="w-8 h-8 rounded-lg bg-medium-jungle-100 flex items-center justify-center shrink-0">
                          <CheckIcon
                            color="currentColor"
                            className="text-medium-jungle-700"
                          />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium text-slate-800">
                            Keep existing conversations open
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Threads you're already in remain accessible and you
                            can still reply.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 py-3 last:pb-0">
                        <div className="w-8 h-8 rounded-lg bg-regal-navy-100 flex items-center justify-center shrink-0">
                          <PrivacyIcon
                            color="currentColor"
                            className="text-regal-navy-700"
                          />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium text-slate-800">
                            Protect your privacy
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            No new contact attempts can be made while the bag is
                            disabled.
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 py-3 first:pt-0">
                        <div className="w-8 h-8 rounded-lg bg-medium-jungle-100 flex items-center justify-center shrink-0">
                          <CheckIcon
                            color="currentColor"
                            className="text-medium-jungle-700"
                          />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium text-slate-800">
                            Reopen your bag to new messages
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Finders who scan will be able to reach out to you
                            again.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 py-3">
                        <div className="w-8 h-8 rounded-lg bg-saffron-100 flex items-center justify-center shrink-0">
                          <RefreshRotateIcon
                            color="currentColor"
                            className="text-saffron-700"
                          />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium text-slate-800">
                            Reactivate your QR code and short link
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Your existing codes will start working for new
                            finders immediately.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 py-3 last:pb-0">
                        <div className="w-8 h-8 rounded-lg bg-regal-navy-100 flex items-center justify-center shrink-0">
                          <BagIcon
                            color="currentColor"
                            className="text-regal-navy-700"
                          />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium text-slate-800">
                            Resume normal bag functionality
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Everything works exactly as it did before you
                            disabled the bag.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setConfirmStatusToggle(true)}
                className={`w-full px-6 py-4 font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                  bagStatus === 'active'
                    ? 'bg-saffron-400 hover:bg-saffron-500 border border-saffron-600 text-saffron-950'
                    : 'bg-regal-navy-600 hover:bg-regal-navy-700 text-white'
                }`}
              >
                {bagStatus === 'active' ? 'Disable Bag' : 'Enable Bag'}
              </button>
            </div>
          </div>
        );

      case 'email':
        return (
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                Notification Preferences
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Choose which emails we send you and when. You can fine-tune or
                turn off any category.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <div className="divide-y divide-slate-100">
                  <div className="flex items-start gap-3 py-3 first:pt-0">
                    <div className="w-8 h-8 rounded-lg bg-regal-navy-100 flex items-center justify-center shrink-0">
                      <MessageIcon
                        color="currentColor"
                        className="text-regal-navy-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        New conversations
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sent when a finder scans your bag and starts a new
                        thread.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-medium-jungle-100 flex items-center justify-center shrink-0">
                      <MailIcon
                        color="currentColor"
                        className="text-medium-jungle-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        Replies
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Sent when a finder replies to an existing conversation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-saffron-100 flex items-center justify-center shrink-0">
                      <AlertIcon
                        color="currentColor"
                        className="text-saffron-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-800">
                        System updates
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Occasional emails about your account, billing, and
                        important changes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={openEmailPreferences}
                disabled={loading}
                className="w-full px-6 py-4 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-sm"
              >
                {loading ? 'Opening...' : 'Open Email Preferences'}
              </button>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                Appearance
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Customize the finder page gradient and branding for this bag.
              </p>
            </div>

            {isFree ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <p className="text-base text-slate-700 mb-4">
                  Appearance customization requires a Pro plan.
                </p>
                <a
                  href="/pricing"
                  className="inline-block px-6 py-3 bg-regal-navy-600 hover:bg-regal-navy-700 text-white font-semibold rounded-xl transition-all"
                >
                  Upgrade to Pro
                </a>
              </div>
            ) : appearanceLoading ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-slate-500">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-slate-200 border-t-regal-navy-600 rounded-full animate-spin mb-4" />
                <p>Loading appearance settings...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Preview
                  </label>
                  {(() => {
                    const hasColors = Boolean(tagColorStart);
                    const minLuminance = hasColors
                      ? getMinLuminance(tagColorStart, tagColorEnd || null)
                      : 0;
                    const useWhiteText = minLuminance <= 0.179;
                    const bgStyle = tagColorStart
                      ? !tagColorEnd || tagColorEnd === tagColorStart
                        ? { backgroundColor: tagColorStart }
                        : {
                            background: `linear-gradient(160deg, ${tagColorStart}, ${tagColorEnd})`,
                          }
                      : {
                          background:
                            'linear-gradient(135deg, #e2e8f0, #f8fafc)',
                        };

                    const glassCard = hasColors
                      ? {
                          background: useWhiteText
                            ? 'rgba(255,255,255,0.15)'
                            : 'rgba(0,0,0,0.07)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: useWhiteText
                            ? '1px solid rgba(255,255,255,0.25)'
                            : '1px solid rgba(0,0,0,0.12)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        }
                      : {};

                    const glassSection = hasColors
                      ? {
                          background: useWhiteText
                            ? 'rgba(255,255,255,0.10)'
                            : 'rgba(0,0,0,0.05)',
                          border: useWhiteText
                            ? '1px solid rgba(255,255,255,0.18)'
                            : '1px solid rgba(0,0,0,0.10)',
                        }
                      : {};

                    const glassItem = hasColors
                      ? {
                          background: useWhiteText
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.04)',
                          border: useWhiteText
                            ? '1px solid rgba(255,255,255,0.15)'
                            : '1px solid rgba(0,0,0,0.08)',
                        }
                      : {};

                    const tx =
                      hasColors && useWhiteText
                        ? 'text-white'
                        : 'text-regal-navy-900';
                    const txm =
                      hasColors && useWhiteText
                        ? 'text-white/80'
                        : 'text-regal-navy-700';
                    const textShadow =
                      hasColors && useWhiteText
                        ? ({ textShadow: '0 1px 3px rgba(0,0,0,0.3)' } as const)
                        : undefined;

                    const previewOwnerName =
                      finderPreviewData?.owner_name ??
                      bag.owner_name_override ??
                      bag.owner_name;
                    const previewBagName =
                      finderPreviewData?.bag_name ?? bag.bag_name;
                    const previewOwnerMessage =
                      finderPreviewData?.owner_message;
                    const previewSecureMessaging =
                      finderPreviewData?.secure_messaging_enabled ?? false;
                    const previewContacts =
                      finderPreviewData?.contact_options ?? [];
                    const ownerRef = previewOwnerName
                      ? `${previewOwnerName}'s`
                      : 'my';
                    const bagLabel = previewBagName || 'bag';
                    const totalContactMethods =
                      (previewSecureMessaging ? 1 : 0) + previewContacts.length;
                    const showBranding =
                      showBrandingOverride ?? planInfo?.showBranding ?? true;

                    const contactHeader = (() => {
                      if (totalContactMethods === 0) return null;
                      if (totalContactMethods === 1) {
                        if (previewContacts.length === 1) {
                          return (
                            <p
                              className={`text-lg font-medium text-center ${tx} mb-2`}
                              style={textShadow}
                            >
                              Contact {previewOwnerName || 'me'} directly:
                            </p>
                          );
                        }
                        return (
                          <p
                            className={`text-lg font-medium text-center ${tx} mb-2`}
                            style={textShadow}
                          >
                            You can message me here:
                          </p>
                        );
                      }
                      if (previewSecureMessaging) {
                        return (
                          <p
                            className={`text-lg font-medium text-center ${tx} mb-2`}
                            style={textShadow}
                          >
                            Choose how you&apos;d like to contact me:
                          </p>
                        );
                      }
                      return (
                        <p
                          className={`text-lg font-medium text-center ${tx} mb-2`}
                          style={textShadow}
                        >
                          Contact {previewOwnerName || 'me'} directly:
                        </p>
                      );
                    })();

                    return (
                      <div
                        className={`rounded-xl border border-white/20 p-4 sm:p-6 pointer-events-none select-none transition-all${hasColors ? ' dark-mode-immune' : ''}`}
                        style={bgStyle}
                      >
                        <div className="max-w-lg mx-auto">
                          <div
                            className={
                              hasColors ? 'rounded-lg p-4 sm:p-6' : 'card'
                            }
                            style={glassCard}
                          >
                            <div className="text-center mb-6 sm:mb-8">
                              <div
                                className={`mb-3 sm:mb-4 flex justify-center ${hasColors && useWhiteText ? 'text-white/90' : 'text-regal-navy-700'}`}
                              >
                                <BagIcon color="currentColor" size="large" />
                              </div>
                              <h1
                                className={`text-2xl sm:text-3xl font-semibold mb-2 sm:mb-3 ${tx}`}
                                style={textShadow}
                              >
                                You found {ownerRef} {bagLabel}!
                              </h1>
                              <p
                                className={`text-base sm:text-lg ${txm}`}
                                style={textShadow}
                              >
                                Thank you for taking the time to help.
                              </p>
                            </div>

                            {previewOwnerMessage && (
                              <div
                                className={
                                  hasColors
                                    ? 'rounded-lg p-4 mb-6 sm:mb-8'
                                    : 'alert-info mb-6 sm:mb-8'
                                }
                                style={glassSection}
                              >
                                <p
                                  className={`font-medium text-sm sm:text-base ${tx} mb-2`}
                                  style={textShadow}
                                >
                                  Message from {previewOwnerName || 'owner'}:
                                </p>
                                <p
                                  className={`text-sm sm:text-base ${hasColors && useWhiteText ? 'text-white/90' : 'text-regal-navy-800'} italic`}
                                >
                                  &quot;{previewOwnerMessage}&quot;
                                </p>
                              </div>
                            )}

                            <div className="space-y-4 sm:space-y-5">
                              {contactHeader}

                              {previewSecureMessaging && (
                                <div
                                  className={
                                    hasColors
                                      ? 'rounded-lg p-5'
                                      : 'bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-5'
                                  }
                                  style={glassSection}
                                >
                                  <h3
                                    className={`font-medium ${tx} mb-2 flex items-center gap-2`}
                                    style={textShadow}
                                  >
                                    <PrivacyIcon color="currentColor" /> Private
                                    Messaging
                                  </h3>
                                  <p
                                    className={`text-sm ${txm} mb-4`}
                                    style={textShadow}
                                  >
                                    Send a secure message (your info stays
                                    private)
                                  </p>
                                  <div
                                    className={`${hasColors && useWhiteText ? 'btn-glass' : 'btn-primary'} w-full flex items-center justify-center gap-2`}
                                  >
                                    <MessageIcon color="currentColor" /> Send
                                    Private Message
                                  </div>
                                </div>
                              )}

                              {previewContacts.length > 0 && (
                                <div
                                  className={
                                    hasColors
                                      ? 'rounded-lg p-5'
                                      : 'bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-5'
                                  }
                                  style={glassSection}
                                >
                                  <h3
                                    className={`font-medium ${tx} mb-3 flex items-center gap-2`}
                                    style={textShadow}
                                  >
                                    <PhoneContactIcon color="currentColor" />{' '}
                                    Direct Contact
                                  </h3>
                                  <div className="space-y-2">
                                    {previewContacts
                                      .slice()
                                      .sort(
                                        (a, b) =>
                                          (b.is_primary ? 1 : 0) -
                                          (a.is_primary ? 1 : 0)
                                      )
                                      .map((option, index) => {
                                        const ContactIcon =
                                          getContactMethodIcon(option.type);
                                        return (
                                          <div
                                            key={index}
                                            className={
                                              hasColors
                                                ? 'rounded-lg p-3.5'
                                                : `border rounded-lg p-3.5 ${option.is_primary ? 'border-regal-navy-300 bg-white' : 'border-regal-navy-200 bg-white'}`
                                            }
                                            style={glassItem}
                                          >
                                            <div className="flex items-center justify-between mb-3">
                                              <span
                                                className={`font-medium ${tx} text-sm flex items-center gap-2`}
                                                style={textShadow}
                                              >
                                                <ContactIcon color="currentColor" />{' '}
                                                {option.label}
                                              </span>
                                              {option.is_primary && (
                                                <span
                                                  className={`badge ${hasColors ? (useWhiteText ? 'bg-white/20 text-white border-white/30' : 'bg-black/10 text-regal-navy-800 border-black/15') : 'badge-neutral'}`}
                                                >
                                                  Primary
                                                </span>
                                              )}
                                            </div>
                                            <div className="btn-primary w-full text-center block">
                                              {option.type === 'sms' ||
                                              option.type === 'whatsapp' ||
                                              option.type === 'signal' ||
                                              option.type === 'telegram'
                                                ? formatPhoneNumber(
                                                    option.value
                                                  )
                                                : option.value}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {showBranding && (
                            <div className="text-center mt-6 sm:mt-8 pb-4 space-y-2">
                              <p
                                className={`text-xs sm:text-sm underline ${hasColors && useWhiteText ? 'text-white/80' : 'link'}`}
                              >
                                Create your own bag QR code →
                              </p>
                              <p
                                className={`text-xs ${hasColors && useWhiteText ? 'text-white/70' : 'text-regal-navy-400'}`}
                              >
                                Powered by YouFoundMyBag.com
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    Presets
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => {
                          setTagColorStart('');
                          setTagColorEnd('');
                        }}
                        className={`h-12 w-full rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-all bg-white text-slate-600 ${
                          !tagColorStart
                            ? 'border-regal-navy-600 ring-2 ring-regal-navy-600/20'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        None
                      </button>
                      <span className="text-xs text-center text-slate-500">
                        None
                      </span>
                    </div>
                    {GRADIENT_PRESETS.map((preset) => (
                      <div
                        key={preset.label}
                        className="flex flex-col items-center gap-1"
                      >
                        <button
                          title={preset.label}
                          onClick={() => {
                            setTagColorStart(preset.start);
                            setTagColorEnd(preset.end);
                          }}
                          className={`dark-mode-immune h-12 w-full rounded-lg border-2 transition-all ${
                            tagColorStart === preset.start &&
                            tagColorEnd === preset.end
                              ? 'border-regal-navy-600 ring-2 ring-regal-navy-600/20 scale-105'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                          }}
                        />
                        <span className="text-xs text-center text-slate-500">
                          {preset.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Start Color
                    </label>
                    <div className="flex gap-2">
                      <ColorPickerSwatch
                        value={tagColorStart || '#1e3a5f'}
                        onChange={setTagColorStart}
                        size="md"
                        borderClass="border-slate-300"
                      />
                      <input
                        type="text"
                        value={tagColorStart}
                        onChange={(e) => setTagColorStart(e.target.value)}
                        placeholder="#000000"
                        maxLength={7}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-regal-navy-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      End Color
                    </label>
                    <div className="flex gap-2">
                      <ColorPickerSwatch
                        value={tagColorEnd || '#4a90e2'}
                        onChange={setTagColorEnd}
                        size="md"
                        borderClass="border-slate-300"
                      />
                      <input
                        type="text"
                        value={tagColorEnd}
                        onChange={(e) => setTagColorEnd(e.target.value)}
                        placeholder="#000000"
                        maxLength={7}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-regal-navy-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Show Branding
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Display &ldquo;Powered by YouFoundMyBag.com&rdquo; on
                        the finder page.
                        {showBrandingOverride === null && (
                          <span className="italic">
                            {' '}
                            Plan default:{' '}
                            {planInfo?.showBranding ? 'shown' : 'hidden'}.
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const effective =
                          showBrandingOverride ??
                          planInfo?.showBranding ??
                          true;
                        setShowBrandingOverride(!effective);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ml-4 ${
                        (showBrandingOverride ?? planInfo?.showBranding ?? true)
                          ? 'bg-regal-navy-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          (showBrandingOverride ??
                          planInfo?.showBranding ??
                          true)
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {showBrandingOverride !== null && (
                    <button
                      onClick={() => setShowBrandingOverride(null)}
                      className="mt-3 text-xs text-regal-navy-600 hover:text-regal-navy-800 underline"
                    >
                      Reset to plan default
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6 sm:mt-8">
                  <button
                    onClick={() => {
                      setTagColorStart('');
                      setTagColorEnd('');
                      setShowBrandingOverride(null);
                    }}
                    disabled={appearanceSaving}
                    className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={() => handleSaveAppearance()}
                    disabled={saveButtonState === 'saving'}
                    className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold rounded-xl transition-all duration-300 shadow-sm active:scale-[0.97] active:shadow-none select-none ${
                      saveButtonState === 'saved'
                        ? 'bg-medium-jungle-500 hover:bg-medium-jungle-600 text-white shadow-medium-jungle-200 hover:shadow-md'
                        : saveButtonState === 'saving'
                          ? 'bg-regal-navy-600 text-white cursor-wait opacity-80'
                          : 'bg-regal-navy-600 hover:bg-regal-navy-700 text-white hover:shadow-md'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {saveButtonState === 'saving' && (
                        <svg
                          className="animate-spin w-4 h-4 shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                      )}
                      {saveButtonState === 'saved' && (
                        <svg
                          className="w-4 h-4 shrink-0"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M3 8l3.5 3.5 6.5-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      {saveButtonState === 'saving'
                        ? 'Saving…'
                        : saveButtonState === 'saved'
                          ? 'Saved!'
                          : 'Save Appearance'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'resolve':
        return (
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
                Close All Conversations
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Mark every open conversation as resolved. Good for a clean slate
                after recovering your bag.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              {!hasActiveConversations && (
                <div className="bg-medium-jungle-50 border border-medium-jungle-200 rounded-xl p-8 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-medium-jungle-100 flex items-center justify-center mb-4">
                    <SuccessIcon
                      color="currentColor"
                      className="text-medium-jungle-600"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-medium-jungle-900 mb-1">
                    You're all caught up
                  </h3>
                  <p className="text-sm text-medium-jungle-700">
                    There are no active conversations for this bag right now.
                  </p>
                </div>
              )}

              {hasActiveConversations && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-4">
                    Before you proceed
                  </h3>
                  <div className="divide-y divide-amber-100">
                    <div className="flex items-start gap-3 py-3 first:pt-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <CheckIcon
                          color="currentColor"
                          className="text-amber-700"
                        />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium text-amber-900">
                          All active conversations will close
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Every open thread for this bag gets marked as resolved
                          at once.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <BagIcon
                          color="currentColor"
                          className="text-amber-700"
                        />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium text-amber-900">
                          Conversations are archived automatically
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Archived threads are retained for 6 months before
                          permanent deletion.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 py-3 last:pb-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <AlertIcon
                          color="currentColor"
                          className="text-amber-700"
                        />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium text-amber-900">
                          This affects every conversation for this bag
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          There is no way to bulk-reopen conversations after
                          this action.
                        </p>
                      </div>
                    </div>
                  </div>
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
          <div>
            <div className="mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-cinnabar-700 mb-2 sm:mb-3 tracking-tight">
                Delete This Bag
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                This permanently removes the bag and every piece of data tied to
                it. There is no recovery option.
              </p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-start gap-4 p-5 bg-cinnabar-50 border border-cinnabar-200 border-t-4 border-t-cinnabar-500 rounded-xl text-cinnabar-900">
                <div className="w-10 h-10 rounded-lg bg-cinnabar-100 flex items-center justify-center shrink-0">
                  <AlertIcon
                    color="currentColor"
                    className="text-cinnabar-700"
                  />
                </div>
                <div className="flex-1 pt-0.5">
                  <strong className="block text-base font-semibold mb-1">
                    This action cannot be undone
                  </strong>
                  <p className="text-sm">
                    Deleting a bag is immediate and permanent. We do not retain
                    backups after deletion.
                  </p>
                </div>
              </div>

              <div className="bg-cinnabar-50 border border-cinnabar-200 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-cinnabar-600 uppercase tracking-wider mb-4">
                  Everything that will be deleted
                </h3>
                <div className="divide-y divide-cinnabar-100">
                  <div className="flex items-start gap-3 py-3 first:pt-0">
                    <div className="w-8 h-8 rounded-lg bg-cinnabar-100 flex items-center justify-center shrink-0">
                      <BagIcon
                        color="currentColor"
                        className="text-cinnabar-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-cinnabar-900">
                        This bag and its QR code
                      </p>
                      <p className="text-xs text-cinnabar-700 mt-0.5">
                        The bag profile, short link, and associated QR code are
                        deleted.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-cinnabar-100 flex items-center justify-center shrink-0">
                      <MessageIcon
                        color="currentColor"
                        className="text-cinnabar-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-cinnabar-900">
                        All conversations
                      </p>
                      <p className="text-xs text-cinnabar-700 mt-0.5">
                        Every thread — active, resolved, and archived — is
                        removed permanently.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <div className="w-8 h-8 rounded-lg bg-cinnabar-100 flex items-center justify-center shrink-0">
                      <MailIcon
                        color="currentColor"
                        className="text-cinnabar-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-cinnabar-900">
                        All messages and contact info
                      </p>
                      <p className="text-xs text-cinnabar-700 mt-0.5">
                        Every message sent and any finder contact details are
                        wiped.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-cinnabar-100 flex items-center justify-center shrink-0">
                      <DeleteIcon
                        color="currentColor"
                        className="text-cinnabar-700"
                      />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium text-cinnabar-900">
                        All historical data
                      </p>
                      <p className="text-xs text-cinnabar-700 mt-0.5">
                        Activity logs, appearance settings, and analytics for
                        this bag are gone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full px-6 py-4 bg-cinnabar-100 hover:bg-cinnabar-200 border border-cinnabar-300 text-cinnabar-900 font-semibold rounded-xl transition-all"
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

  const MobileNavItem = ({ item }: { item: NavigationItem }) => (
    <button
      onClick={() => {
        setActiveSection(item.id);
        setMobileNavOpen(false);
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all w-full ${
        activeSection === item.id
          ? item.id === 'delete'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-regal-navy-100 text-regal-navy-800 border border-regal-navy-200'
          : item.id === 'delete'
            ? 'text-red-600 hover:bg-red-50'
            : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <span className="text-lg">{item.icon}</span>
      <span>{item.mobileLabel ?? item.label}</span>
    </button>
  );

  return (
    <>
      <div
        className="modal-backdrop fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn"
        {...backdropProps}
      >
        <div
          className="modal-container bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-[90vh] sm:max-w-6xl flex flex-col md:grid md:grid-cols-[280px_1fr] overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-sidebar md:hidden bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-4 flex items-center justify-between shrink-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {bag.bag_name || 'Bag Settings'}
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {bag.short_id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                aria-label="Menu"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
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
            </div>
          </div>

          {mobileNavOpen && (
            <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-2 max-h-[50vh] overflow-y-auto shrink-0">
              <div className="grid grid-cols-2 gap-2">
                {navigationItems.map((item) => (
                  <MobileNavItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          <nav className="modal-sidebar hidden md:flex bg-gradient-to-b from-slate-800 to-slate-900 border-r border-white/10 py-8 flex-col overflow-y-auto">
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

            <div ref={navItemsRef} className="flex-1 overflow-y-auto relative">
              <motion.div
                className={`absolute left-0 right-0 pointer-events-none ${
                  navIndicator.isDelete
                    ? 'bg-red-500/10'
                    : 'bg-regal-navy-600/20'
                }`}
                animate={{ top: navIndicator.top, height: navIndicator.height }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />

              <div className="mb-8">
                <h3 className="px-6 text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Quick Access
                </h3>
                {navigationItems
                  .filter((item) => item.group === 'primary')
                  .map((item) => (
                    <button
                      key={item.id}
                      ref={(el) => {
                        navButtonRefs.current[item.id] = el;
                      }}
                      onClick={() => setActiveSection(item.id)}
                      className={`relative w-full flex items-center gap-3 px-6 py-3 text-base font-medium transition-colors border-l-3 ${
                        activeSection === item.id
                          ? 'border-l-regal-navy-400 text-regal-navy-300'
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
                      ref={(el) => {
                        navButtonRefs.current[item.id] = el;
                      }}
                      onClick={() => setActiveSection(item.id)}
                      className={`relative w-full flex items-center gap-3 px-6 py-3 text-base font-medium transition-colors border-l-3 ${
                        activeSection === item.id
                          ? 'border-l-regal-navy-400 text-regal-navy-300'
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
                      ref={(el) => {
                        navButtonRefs.current[item.id] = el;
                      }}
                      onClick={() => setActiveSection(item.id)}
                      className={`relative w-full flex items-center gap-3 px-6 py-3 text-base font-medium transition-colors border-l-3 ${
                        activeSection === item.id
                          ? item.id === 'delete'
                            ? 'border-l-red-400 text-red-400'
                            : 'border-l-regal-navy-400 text-regal-navy-300'
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

          <main className="bg-white overflow-y-auto relative p-5 sm:p-8 md:p-12 flex-1">
            <button
              onClick={handleClose}
              className="hidden md:block absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
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

            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {renderSectionContent()}
              </motion.div>
            </AnimatePresence>
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
        title={bagStatus === 'active' ? 'Disable Bag?' : 'Enable Bag?'}
        message={
          bagStatus === 'active'
            ? 'This will prevent new finders from starting conversations. Existing conversations will remain accessible.'
            : 'This will allow new finders to start conversations with you.'
        }
        confirmText={bagStatus === 'active' ? 'Disable' : 'Enable'}
        cancelText="Cancel"
        onConfirm={handleStatusToggle}
        onCancel={() => setConfirmStatusToggle(false)}
        variant={bagStatus === 'active' ? 'warning' : 'primary'}
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
