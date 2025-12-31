import { useState } from 'react';
import type { CreateBagResponse } from '../types/index.js';

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
      setTimeout(() => setCopied(false), 2000);
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-md mx-auto p-6">
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
    </div>
  );
}
