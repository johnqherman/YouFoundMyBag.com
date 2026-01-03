import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import type { FinderPageData } from '../types';
import ContactModal from '../components/ContactModal';
import LoadingSpinner from '../components/LoadingSpinner';

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
      <div className="finder-page min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !bagData) {
    return (
      <div className="finder-page min-h-screen">
        <div className="max-w-readable mx-auto p-6">
          <div className="finder-card text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Bag Not Found
            </h1>
            <p className="text-neutral-700 mb-6">
              {error || 'This bag ID does not exist or has been removed.'}
            </p>
            <p className="text-sm text-neutral-500">
              Double-check the QR code or URL and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = bagData;

  return (
    <div className="finder-page min-h-screen">
      <div className="max-w-readable mx-auto p-6">
        <div className="finder-card">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎒</div>
            <h1 className="text-3xl font-bold mb-4">
              You found {formatOwnerReference(data.owner_name)}{' '}
              {formatBagDisplayName(data.owner_name, data.bag_name)}!
            </h1>
            <p className="text-lg text-neutral-700 mb-6">
              Thank you for taking the time to help.
            </p>
          </div>

          {data.owner_message && (
            <div className="bg-neutral-100 border border-neutral-300 rounded-xl p-4 mb-8">
              <p className="font-medium text-neutral-800 mb-2">
                Message from {data.owner_name || 'owner'}:
              </p>
              <p className="text-neutral-700 italic">
                &quot;{data.owner_message}&quot;
              </p>
            </div>
          )}

          <div className="space-y-6 mb-8">
            {data.secure_messaging_enabled ? (
              <p className="text-lg font-semibold text-center mb-6">
                Choose how you&apos;d like to contact me:
              </p>
            ) : (
              <>
                <p className="text-lg font-semibold text-center mb-6">
                  Contact {data.owner_name || 'me'} directly:
                </p>
              </>
            )}

            {data.secure_messaging_enabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-medium text-blue-800 mb-2">
                  🔒 Private Messaging
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  Send a secure message (your info stays private)
                </p>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="finder-btn w-full bg-blue-600 hover:bg-blue-700"
                >
                  📩 Send Private Message
                </button>
              </div>
            )}

            {data.contact_options.length > 0 && (
              <div className="bg-neutral-100 border border-neutral-300 rounded-xl p-4">
                <h3 className="font-medium text-neutral-800 mb-2">
                  📞 Direct Contact
                </h3>
                <div className="space-y-2">
                  {data.contact_options
                    .sort(
                      (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
                    )
                    .map((option, index) => {
                      const getContactHref = () => {
                        switch (option.type) {
                          case 'sms':
                            return `tel:${option.value}`;
                          case 'signal':
                            return `signal://contact/${option.value}`;
                          case 'whatsapp':
                            return `https://wa.me/${option.value.replace(/\D/g, '')}`;
                          case 'telegram':
                            return `tg://resolve?domain=${option.value.replace('@', '')}`;
                          case 'instagram':
                            return `https://instagram.com/${option.value.replace('@', '')}`;
                          case 'email':
                            return `mailto:${option.value}`;
                          default:
                            return '#';
                        }
                      };

                      const getContactIcon = () => {
                        switch (option.type) {
                          case 'sms':
                            return '📞';
                          case 'signal':
                            return '🔐';
                          case 'whatsapp':
                            return '📱';
                          case 'telegram':
                            return '✈️';
                          case 'instagram':
                            return '📸';
                          case 'email':
                            return '📧';
                          case 'other':
                            return '📞';
                          default:
                            return '📞';
                        }
                      };

                      return (
                        <div
                          key={index}
                          className={`border rounded-lg p-3 ${
                            option.is_primary
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-neutral-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-neutral-800">
                              {getContactIcon()} {option.label}
                            </span>
                            {option.is_primary && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                          <a
                            href={getContactHref()}
                            className="finder-btn w-full text-center block"
                          >
                            {option.value}
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
          <a
            href="/"
            className="text-neutral-500 hover:text-neutral-700 text-sm underline"
          >
            Create your own lost item QR code →
          </a>
        </div>
      </div>

      {showContactModal && shortId && data.secure_messaging_enabled && (
        <ContactModal
          shortId={shortId}
          onClose={() => setShowContactModal(false)}
          ownerName={data.owner_name}
        />
      )}
    </div>
  );
}
