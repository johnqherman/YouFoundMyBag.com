import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import type { CreateBagResponse } from '../types/index.js';
import { TIME_MS as t } from '../constants/timeConstants';
import {
  SuccessIcon,
  AlertIcon,
  PrintIcon,
  DownloadActionIcon,
  PlusIcon,
} from './icons/AppIcons';

interface Props {
  bagData: CreateBagResponse;
  onCreateAnother: () => void;
}

export default function BagCreated({ bagData, onCreateAnother }: Props) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), t.TWO_SECONDS);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = bagData.data.qr_code;
    link.download = `youfoundmybag-${bagData.data.short_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900 pb-20">
      <Helmet>
        <title>Your QR code is ready! | YouFoundMyBag.com</title>
      </Helmet>
      <div className="max-w-md mx-auto p-6 lg:max-w-2xl">
        <div className="card text-center">
          <h1 className="text-2xl font-semibold mb-6 text-medium-jungle-700 flex items-center justify-center gap-2">
            <SuccessIcon color="currentColor" /> Your QR code is ready!
          </h1>

          <div className="bg-white p-6 rounded-lg mb-6 inline-block border border-regal-navy-100">
            <img
              src={bagData.data.qr_code}
              alt="QR Code"
              className="w-64 h-64 mx-auto"
            />
          </div>

          <div className="bg-regal-navy-50 border border-regal-navy-200 rounded-lg p-5 mb-6">
            <p className="text-sm text-regal-navy-700 font-medium mb-2">
              Your bag URL:
            </p>
            <p className="font-mono text-regal-navy-600 break-all text-sm">
              {bagData.data.url}
            </p>
            <button
              onClick={() => copyToClipboard(bagData.data.url)}
              className="btn-secondary mt-4"
            >
              {copied ? '✓ Copied!' : 'Copy URL'}
            </button>
          </div>

          <div className="alert-warning mb-6">
            <div className="flex items-start gap-3">
              <span className="shrink-0">
                <AlertIcon color="currentColor" />
              </span>
              <div className="text-left">
                <p className="font-semibold mb-2">
                  Important: Save this information!
                </p>
                <p className="text-sm leading-relaxed">
                  <strong>
                    Print the QR code <em>or</em> write down the short link
                    above.
                  </strong>
                  <br />
                  Either works! If you can&apos;t print the QR code, make sure
                  to write down the link so a finder can safely contact you.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={downloadQR}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <DownloadActionIcon color="currentColor" /> Download QR Code
            </button>
            <button
              onClick={() => window.print()}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <PrintIcon color="currentColor" /> Print QR Code
            </button>
            <button
              onClick={onCreateAnother}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <PlusIcon color="currentColor" /> Create Another
            </button>
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-regal-navy-100 text-center py-4 text-regal-navy-500 text-sm">
        <p>
          Privacy-first • No tracking •{' '}
          <a
            href="https://github.com/johnqherman/YouFoundMyBag.com"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            Open source
          </a>
        </p>
      </footer>
    </div>
  );
}
