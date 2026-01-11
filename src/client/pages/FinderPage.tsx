import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../utils/api';
import type { FinderPageData } from '../types';
import ContactModal from '../components/ContactModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Twemoji from '../components/Twemoji';
import {
  BagIcon,
  PrivacyIcon,
  PhoneContactIcon,
  MessageIcon,
  getContactMethodIcon,
} from '../components/icons/AppIcons';
import { formatPhoneNumber } from '../../infrastructure/utils/formatting';

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
          <title>Bag Not Found | YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-readable mx-auto p-6">
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
          <title>Bag Deactivated | YouFoundMyBag.com</title>
        </Helmet>
        <div className="max-w-readable mx-auto p-6">
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

  return (
    <div className="min-h-screen bg-regal-navy-50">
      <Helmet>
        <title>You Found My Bag!</title>
      </Helmet>
      <div className="max-w-readable mx-auto p-6">
        <div className="card">
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center text-regal-navy-700">
              <BagIcon color="currentColor" size="large" />
            </div>
            <h1 className="text-3xl font-semibold mb-3 text-regal-navy-900">
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
            <p className="text-lg text-regal-navy-700">
              Thank you for taking the time to help.
            </p>
          </div>

          {activeBagData.owner_message && (
            <div className="alert-info mb-8">
              <p className="font-medium text-regal-navy-900 mb-2">
                Message from{' '}
                <Twemoji>{activeBagData.owner_name || 'owner'}</Twemoji>:
              </p>
              <Twemoji
                tag="p"
                className="text-regal-navy-800 italic text-wrap-aggressive"
              >
                &quot;{activeBagData.owner_message}&quot;
              </Twemoji>
            </div>
          )}

          <div className="space-y-5">
            {activeBagData.secure_messaging_enabled ? (
              <p className="text-lg font-medium text-center text-regal-navy-900 mb-2">
                Choose how you&apos;d like to contact me:
              </p>
            ) : (
              <>
                <p className="text-lg font-medium text-center text-regal-navy-900 mb-2">
                  Contact <Twemoji>{activeBagData.owner_name || 'me'}</Twemoji>{' '}
                  directly:
                </p>
              </>
            )}

            {activeBagData.secure_messaging_enabled && (
              <div className="bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-5">
                <h3 className="font-medium text-regal-navy-900 mb-2 flex items-center gap-2">
                  <PrivacyIcon color="currentColor" /> Private Messaging
                </h3>
                <p className="text-sm text-regal-navy-700 mb-4">
                  Send a secure message (your info stays private)
                </p>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <MessageIcon color="currentColor" /> Send Private Message
                </button>
              </div>
            )}

            {activeBagData.contact_options.length > 0 && (
              <div className="bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-5">
                <h3 className="font-medium text-regal-navy-900 mb-3 flex items-center gap-2">
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
                          className={`border rounded-lg p-3.5 ${
                            option.is_primary
                              ? 'border-regal-navy-300 bg-white'
                              : 'border-regal-navy-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-regal-navy-900 text-sm flex items-center gap-2">
                              <ContactIcon color="currentColor" />{' '}
                              {option.label}
                            </span>
                            {option.is_primary && (
                              <span className="badge badge-neutral">
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

        <div className="text-center mt-8">
          <a href="/" className="link text-sm">
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
