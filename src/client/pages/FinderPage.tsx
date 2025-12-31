import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../utils/api';
import type { FinderPageData } from '../types';
import ContactModal from '../components/ContactModal';
import LoadingSpinner from '../components/LoadingSpinner';

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
              You found {data.display_name ? `${data.display_name}'s` : 'my'}{' '}
              bag!
            </h1>
            <p className="text-lg text-neutral-700 mb-6">
              Thank you for taking the time to help.
            </p>
          </div>

          {data.owner_message && (
            <div className="bg-neutral-100 border border-neutral-300 rounded-xl p-4 mb-8">
              <p className="font-medium text-neutral-800 mb-2">
                Message from {data.display_name || 'owner'}:
              </p>
              <p className="text-neutral-700 italic">"{data.owner_message}"</p>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <p className="text-lg font-semibold text-center mb-6">
              Please contact me using one of the options below:
            </p>

            {data.contact_options.map((option, index) => (
              <div key={index}>
                {option.direct_contact ? (
                  <a
                    href={
                      option.type === 'email'
                        ? `mailto:${option.direct_contact}`
                        : option.type === 'sms'
                          ? `sms:${option.direct_contact}`
                          : '#'
                    }
                    className="finder-btn w-full text-center block"
                  >
                    {option.label}: {option.direct_contact}
                  </a>
                ) : (
                  <button
                    onClick={() => setShowContactModal(true)}
                    className="finder-btn w-full"
                  >
                    📩 Send a message
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="text-center text-neutral-600 text-sm">
            <p>
              If I don't respond immediately, please keep the bag somewhere
              safe. I really appreciate it.
            </p>
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

      {showContactModal && shortId && (
        <ContactModal
          shortId={shortId}
          onClose={() => setShowContactModal(false)}
          ownerName={data.display_name}
        />
      )}
    </div>
  );
}
