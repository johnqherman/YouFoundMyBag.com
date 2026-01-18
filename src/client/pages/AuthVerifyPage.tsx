import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LoadingSpinner from '../components/LoadingSpinner.js';
import { TIME_MS as t } from '../constants/timeConstants.js';
import { SuccessIcon, ErrorIcon } from '../components/icons/AppIcons.js';
import RequestMagicLinkModal from '../components/RequestMagicLinkModal.js';

export default function AuthVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [error, setError] = useState<string | null>(null);
  const [showReissueModal, setShowReissueModal] = useState(false);

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
          headers: {
            'Content-Type': 'application/json',
          },
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

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <Helmet>
          <title>Verifying Access... | YouFoundMyBag.com</title>
        </Helmet>
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-400">Verifying your access...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <Helmet>
          <title>Access Granted! | YouFoundMyBag.com</title>
        </Helmet>
        <div className="text-center">
          <div className="mb-4 flex justify-center text-green-400">
            <SuccessIcon color="currentColor" size="large" />
          </div>
          <h1 className="text-2xl font-bold text-green-400 mb-4">
            Access Granted!
          </h1>
          <p className="text-neutral-400 mb-6">
            Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Helmet>
        <title>Verification Failed | YouFoundMyBag.com</title>
      </Helmet>
      <div className="max-w-md mx-auto p-4 sm:p-6 lg:max-w-2xl">
        <div className="text-center">
          <div className="mb-3 sm:mb-4 flex justify-center text-red-400">
            <ErrorIcon color="currentColor" size="large" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-red-400 mb-3 sm:mb-4">
            Verification Failed
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 mb-4 sm:mb-6">
            {error || 'The verification link is invalid or has expired.'}
          </p>
          <button
            onClick={() => setShowReissueModal(true)}
            className="text-sm sm:text-base text-blue-400 hover:text-blue-300 underline mb-4 transition-colors"
          >
            Lost your secure chat link?
          </button>
          <br />
          <a
            href="/"
            className="text-sm sm:text-base text-neutral-500 hover:text-neutral-400 underline transition-colors"
          >
            Return to homepage
          </a>
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
