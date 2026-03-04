import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TIME_MS as t } from '../constants/timeConstants.js';
import RequestMagicLinkModal from '../components/RequestMagicLinkModal.js';

function QrGridPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full text-regal-navy-900 opacity-[0.025] pointer-events-none"
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
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

export default function AuthVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [error, setError] = useState<string | null>(null);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const [redirectProgress, setRedirectProgress] = useState(0);

  useEffect(() => {
    const verifyMagicLink = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('No verification token provided');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ magic_token: token }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Verification failed');
        }

        localStorage.setItem('owner_session_token', result.data.session_token);
        setStatus('success');

        const conversationId = searchParams.get('conversation');
        setTimeout(() => {
          if (conversationId) {
            navigate(`/dashboard/conversation/${conversationId}`);
          } else {
            navigate('/dashboard');
          }
        }, t.TWO_SECONDS);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    verifyMagicLink();
  }, [searchParams, navigate]);

  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => setRedirectProgress(100), 50);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <>
      <div className="page-container relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <QrGridPattern />

        <div className="relative w-full max-w-sm animate-slideUp">
          <div className="text-center mb-8">
            <span className="text-lg font-semibold text-regal-navy-900">
              YouFoundMyBag
            </span>
            <span className="text-sm text-regal-navy-500 font-normal">
              .com
            </span>
          </div>

          <div className="bg-white border border-regal-navy-100 rounded-2xl shadow-soft-lg p-8 text-center">
            {status === 'verifying' && (
              <>
                <Helmet>
                  <title>Verifying Access - YouFoundMyBag.com</title>
                </Helmet>
                <div className="flex justify-center mb-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-regal-navy-100" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-regal-navy-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-regal-navy-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="3" height="3" />
                      </svg>
                    </div>
                  </div>
                </div>
                <h1 className="font-display text-2xl text-regal-navy-900 mb-2">
                  Verifying access
                </h1>
                <p className="text-regal-navy-500 text-sm leading-relaxed">
                  Checking your secure link&hellip;
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <Helmet>
                  <title>Access Granted - YouFoundMyBag.com</title>
                </Helmet>
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-medium-jungle-50 border border-medium-jungle-200 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-medium-jungle-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <h1 className="font-display text-2xl text-regal-navy-900 mb-2">
                  Access granted
                </h1>
                <p className="text-regal-navy-500 text-sm leading-relaxed mb-6">
                  Redirecting you to your dashboard&hellip;
                </p>
                <div className="h-1 bg-regal-navy-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-regal-navy-600 rounded-full transition-all ease-linear"
                    style={{
                      width: `${redirectProgress}%`,
                      transitionDuration: `${t.TWO_SECONDS}ms`,
                    }}
                  />
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <Helmet>
                  <title>Verification Failed - YouFoundMyBag.com</title>
                </Helmet>
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-cinnabar-50 border border-cinnabar-200 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-cinnabar-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                </div>
                <h1 className="font-display text-2xl text-regal-navy-900 mb-2">
                  Link expired
                </h1>
                <p className="text-regal-navy-500 text-sm leading-relaxed mb-6">
                  {error || 'This verification link is invalid or has expired.'}
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowReissueModal(true)}
                    className="btn-primary w-full"
                  >
                    Request a new link
                  </button>
                  <a href="/" className="btn-ghost w-full text-center">
                    Return to homepage
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showReissueModal && (
        <RequestMagicLinkModal
          isOpen={showReissueModal}
          onClose={() => setShowReissueModal(false)}
        />
      )}
    </>
  );
}
