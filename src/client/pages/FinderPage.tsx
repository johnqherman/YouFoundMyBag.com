import { useState, useEffect, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../utils/api.js';
import type { FinderPageData } from '../types/index.js';
import ContactModal from '../components/ContactModal.js';
import LoadingSpinner from '../components/LoadingSpinner.js';
import Twemoji from '../components/Twemoji.js';
import {
  BagIcon,
  PrivacyIcon,
  PhoneContactIcon,
  MessageIcon,
  getContactMethodIcon,
} from '../components/icons/AppIcons.js';
import { formatPhoneNumber } from '../../infrastructure/utils/formatting.js';
import { getMinLuminance } from '../utils/color.js';

function formatOwnerReference(ownerName?: string): string {
  return ownerName ? `${ownerName}'s` : 'my';
}

function formatBagDisplayName(ownerName?: string, bagName?: string): string {
  if (bagName) {
    return bagName;
  }
  return 'bag';
}

export default function FinderPage() {
  const { shortId } = useParams<{ shortId: string }>();
  const [bagData, setBagData] = useState<FinderPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    async function loadBagData() {
      if (!shortId) {
        setError('Invalid bag ID');
        setLoading(false);
        return;
      }

      try {
        const data = await api.getFinderPageData(shortId);
        setBagData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load bag information'
        );
      } finally {
        setLoading(false);
      }
    }

    loadBagData();
  }, [shortId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-regal-navy-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !bagData) {
    return (
      <div className="min-h-screen bg-regal-navy-50">
        <Helmet>
          <title>Bag Not Found - YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-lg mx-auto p-6">
          <div className="card text-center">
            <h1 className="text-2xl font-semibold text-cinnabar-600 mb-4">
              Bag Not Found
            </h1>
            <p className="text-regal-navy-700 mb-6">
              {error || 'This bag ID does not exist or has been removed.'}
            </p>
            <p className="text-sm text-regal-navy-600">
              Double-check the QR code or URL and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = bagData;

  if (data.status === 'disabled') {
    return (
      <div className="min-h-screen bg-regal-navy-50">
        <Helmet>
          <title>Bag Deactivated - YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-lg mx-auto p-6">
          <div className="card text-center">
            <div className="mb-6 flex justify-center text-regal-navy-400">
              <BagIcon color="currentColor" size="large" />
            </div>
            <h1 className="text-2xl font-semibold text-regal-navy-900 mb-4">
              This bag has been deactivated
            </h1>
            <p className="text-regal-navy-700 mb-4">
              The owner of this bag tag has disabled it.
            </p>
          </div>

          <div className="text-center mt-8">
            <a href="/" className="link text-sm">
              Create your own bag QR code →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const activeBagData = data;

  const hasCustomColors = Boolean(activeBagData.tag_color_start);
  const minLuminance = hasCustomColors
    ? getMinLuminance(
        activeBagData.tag_color_start!,
        activeBagData.tag_color_end
      )
    : 0;
  const useWhiteText = minLuminance <= 0.179;
  const gradientStyle: CSSProperties = (() => {
    const s = activeBagData.tag_color_start;
    const e = activeBagData.tag_color_end;
    if (!s) return {};
    if (!e || e === s) return { backgroundColor: s };
    return { background: `linear-gradient(160deg, ${s}, ${e})` };
  })();

  const glassCard: CSSProperties | undefined = hasCustomColors
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
    : undefined;

  const glassSection: CSSProperties | undefined = hasCustomColors
    ? {
        background: useWhiteText
          ? 'rgba(255,255,255,0.10)'
          : 'rgba(0,0,0,0.05)',
        border: useWhiteText
          ? '1px solid rgba(255,255,255,0.18)'
          : '1px solid rgba(0,0,0,0.10)',
      }
    : undefined;

  const glassItem: CSSProperties | undefined = hasCustomColors
    ? {
        background: useWhiteText
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.04)',
        border: useWhiteText
          ? '1px solid rgba(255,255,255,0.15)'
          : '1px solid rgba(0,0,0,0.08)',
      }
    : undefined;

  const tx =
    hasCustomColors && useWhiteText ? 'text-white' : 'text-regal-navy-900';
  const txm =
    hasCustomColors && useWhiteText ? 'text-white/80' : 'text-regal-navy-700';
  const textShadow: CSSProperties | undefined =
    hasCustomColors && useWhiteText
      ? { textShadow: '0 1px 3px rgba(0,0,0,0.3)' }
      : undefined;

  return (
    <div
      className={`min-h-screen ${hasCustomColors ? 'dark-mode-immune' : 'bg-regal-navy-50'}`}
      style={hasCustomColors ? gradientStyle : undefined}
    >
      <Helmet>
        <title>{`You Found ${activeBagData.owner_name ? `${activeBagData.owner_name}'s` : 'My'} ${activeBagData.bag_name || 'Bag'}!`}</title>
      </Helmet>
      <div className="max-w-lg mx-auto p-4 sm:p-6">
        <div
          className={hasCustomColors ? 'rounded-lg p-4 sm:p-6' : 'card'}
          style={glassCard}
        >
          <div className="text-center mb-6 sm:mb-8">
            <div
              className={`mb-3 sm:mb-4 flex justify-center ${hasCustomColors && useWhiteText ? 'text-white/90' : 'text-regal-navy-700'}`}
            >
              <BagIcon color="currentColor" size="large" />
            </div>
            <h1
              className={`text-2xl sm:text-3xl font-semibold mb-2 sm:mb-3 ${tx}`}
              style={textShadow}
            >
              You found{' '}
              <Twemoji>
                {formatOwnerReference(activeBagData.owner_name)}{' '}
                {formatBagDisplayName(
                  activeBagData.owner_name,
                  activeBagData.bag_name
                )}
              </Twemoji>
              !
            </h1>
            <p className={`text-base sm:text-lg ${txm}`} style={textShadow}>
              Thank you for taking the time to help.
            </p>
          </div>

          {activeBagData.owner_message && (
            <div
              className={
                hasCustomColors
                  ? 'rounded-lg p-4 mb-6 sm:mb-8'
                  : 'alert-info mb-6 sm:mb-8'
              }
              style={glassSection}
            >
              <p
                className={`font-medium text-sm sm:text-base ${tx} mb-2`}
                style={textShadow}
              >
                Message from{' '}
                <Twemoji>{activeBagData.owner_name || 'owner'}</Twemoji>:
              </p>
              <Twemoji
                tag="p"
                className={`text-sm sm:text-base ${hasCustomColors && useWhiteText ? 'text-white/90' : 'text-regal-navy-800'} italic text-wrap-aggressive`}
              >
                &quot;{activeBagData.owner_message}&quot;
              </Twemoji>
            </div>
          )}

          <div className="space-y-4 sm:space-y-5">
            {(() => {
              const totalContactMethods =
                (activeBagData.secure_messaging_enabled ? 1 : 0) +
                activeBagData.contact_options.length;

              if (totalContactMethods === 1) {
                if (activeBagData.contact_options.length === 1) {
                  return (
                    <p
                      className={`text-lg font-medium text-center ${tx} mb-2`}
                      style={textShadow}
                    >
                      Contact{' '}
                      <Twemoji>{activeBagData.owner_name || 'me'}</Twemoji>{' '}
                      directly:
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

              if (activeBagData.secure_messaging_enabled) {
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
                  Contact <Twemoji>{activeBagData.owner_name || 'me'}</Twemoji>{' '}
                  directly:
                </p>
              );
            })()}

            {activeBagData.secure_messaging_enabled && (
              <div
                className={
                  hasCustomColors
                    ? 'rounded-lg p-5'
                    : 'bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-5'
                }
                style={glassSection}
              >
                <h3
                  className={`font-medium ${tx} mb-2 flex items-center gap-2`}
                  style={textShadow}
                >
                  <PrivacyIcon color="currentColor" /> Private Messaging
                </h3>
                <p className={`text-sm ${txm} mb-4`} style={textShadow}>
                  Send a secure message (your info stays private)
                </p>
                <button
                  onClick={() => setShowContactModal(true)}
                  className={`${hasCustomColors && useWhiteText ? 'btn-glass' : 'btn-primary'} w-full flex items-center justify-center gap-2`}
                >
                  <MessageIcon color="currentColor" /> Send Private Message
                </button>
              </div>
            )}

            {activeBagData.contact_options.length > 0 && (
              <div
                className={
                  hasCustomColors
                    ? 'rounded-lg p-5'
                    : 'bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-5'
                }
                style={glassSection}
              >
                <h3
                  className={`font-medium ${tx} mb-3 flex items-center gap-2`}
                  style={textShadow}
                >
                  <PhoneContactIcon color="currentColor" /> Direct Contact
                </h3>
                <div className="space-y-2">
                  {activeBagData.contact_options
                    .sort(
                      (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
                    )
                    .map((option, index) => {
                      const getContactHref = () => {
                        switch (option.type) {
                          case 'sms':
                            return `tel:${option.value}`;
                          case 'whatsapp':
                            return `https://wa.me/${option.value.replace(/\D/g, '')}`;
                          case 'email':
                            return `mailto:${option.value}`;
                          case 'instagram':
                            return `https://instagram.com/${option.value.replace('@', '')}`;
                          case 'telegram':
                            return `tg://resolve?domain=${option.value.replace('@', '')}`;
                          case 'signal':
                            return `signal://contact/${option.value}`;
                          default:
                            return '#';
                        }
                      };

                      const ContactIcon = getContactMethodIcon(option.type);

                      return (
                        <div
                          key={index}
                          className={
                            hasCustomColors
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
                                className={`badge ${hasCustomColors ? (useWhiteText ? 'bg-white/20 text-white border-white/30' : 'bg-black/10 text-regal-navy-800 border-black/15') : 'badge-neutral'}`}
                              >
                                Primary
                              </span>
                            )}
                          </div>
                          <a
                            href={getContactHref()}
                            className="btn-primary w-full text-center block"
                          >
                            {option.type === 'sms' ||
                            option.type === 'whatsapp' ||
                            option.type === 'signal' ||
                            option.type === 'telegram'
                              ? formatPhoneNumber(option.value)
                              : option.value}
                          </a>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6 sm:mt-8 pb-4 space-y-2">
          {activeBagData.show_branding !== false && (
            <p
              className={`text-xs ${hasCustomColors && useWhiteText ? 'text-white/70' : 'text-regal-navy-400'}`}
            >
              Powered by{' '}
              <a
                href="/"
                className={`underline transition-colors ${hasCustomColors && useWhiteText ? 'hover:text-white' : 'hover:text-regal-navy-600'}`}
              >
                YouFoundMyBag.com
              </a>
            </p>
          )}
          <a
            href="/"
            className={`text-xs sm:text-sm block underline transition-colors ${hasCustomColors && useWhiteText ? 'text-white/80 hover:text-white' : 'link'}`}
          >
            Create your own bag QR code →
          </a>
        </div>
      </div>

      {showContactModal &&
        shortId &&
        activeBagData.secure_messaging_enabled && (
          <ContactModal
            shortId={shortId}
            onClose={() => setShowContactModal(false)}
            ownerName={activeBagData.owner_name}
            bagName={activeBagData.bag_name}
          />
        )}
    </div>
  );
}
