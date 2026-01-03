import { useState } from 'react';
import type { CreateBagResponse } from '../types/index.js';
import { TIME_CONSTANTS as t } from '../constants/timeConstants';

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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      <div className="max-w-md mx-auto p-6 lg:max-w-2xl">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-6 text-green-400">
            ✅ Your QR code is ready!
          </h1>

          <div className="bg-white p-6 rounded-2xl mb-6 inline-block">
            <img
              src={bagData.data.qr_code}
              alt="QR Code"
              className="w-64 h-64 mx-auto"
            />
          </div>

          <div className="bg-neutral-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-neutral-300 mb-2">Your bag URL:</p>
            <p className="font-mono text-blue-400 break-all">
              {bagData.data.url}
            </p>
            <button
              onClick={() => copyToClipboard(bagData.data.url)}
              className="btn-secondary mt-3"
            >
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>

          <div className="bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-amber-400 text-xl">⚠️</span>
              <div className="text-left">
                <p className="text-amber-200 font-medium mb-2">
                  Important: Save this information!
                </p>
                <p className="text-amber-100 text-sm leading-relaxed">
                  <strong>
                    Print the QR code <em>or</em> write down the short link
                    above.
                  </strong>
                  <br />
                  Either works! If you can’t print the QR code, make sure to
                  write down the link so a finder can safely contact you.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button onClick={downloadQR} className="btn-primary w-full">
              📥 Download QR Code
            </button>
            <button
              onClick={() => window.print()}
              className="btn-secondary w-full"
            >
              🖨️ Print QR Code
            </button>
            <button onClick={onCreateAnother} className="btn-secondary w-full">
              ➕ Create Another
            </button>
          </div>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-neutral-950/80 backdrop-blur-sm text-center py-6 text-neutral-500 text-sm">
        <p>
          Privacy-first • No tracking •{' '}
          <a
            href="https://github.com/johnqherman/YouFoundMyBag.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-400 transition-colors duration-200"
          >
            Open source
          </a>
        </p>
      </footer>
    </div>
  );
}
