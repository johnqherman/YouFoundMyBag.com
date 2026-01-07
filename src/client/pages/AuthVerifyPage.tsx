import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { TIME_MS as t } from '../constants/timeConstants';
import { SuccessIcon, ErrorIcon } from '../components/icons/AppIcons';

export default function AuthVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [error, setError] = useState<string | null>(null);

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

        if (!response.ok) {
          throw new Error('Verification failed');
        }

        const result = await response.json();

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
        <div className="text-center">
          <div
            className="mb-4 flex justify-center text-green-400"
            style={{ fontSize: '4rem' }}
          >
            <SuccessIcon color="currentColor" />
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
      <div className="max-w-md mx-auto p-6 lg:max-w-2xl">
        <div className="text-center">
          <div
            className="mb-4 flex justify-center text-red-400"
            style={{ fontSize: '4rem' }}
          >
            <ErrorIcon color="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            Verification Failed
          </h1>
          <p className="text-neutral-400 mb-6">
            {error || 'The verification link is invalid or has expired.'}
          </p>
          <a href="/" className="text-blue-400 hover:text-blue-300 underline">
            Return to homepage
          </a>
        </div>
      </div>
    </div>
  );
}
