import { useState, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import type { BagCreatedProps } from '../types/index.js';
import { TIME_MS as t } from '../constants/timeConstants.js';
import {
  SuccessIcon,
  AlertIcon,
  PrintIcon,
  DownloadActionIcon,
  PlusIcon,
} from './icons/AppIcons.js';
import BrandedQRCode, {
  downloadQRWithBorder,
  printQR,
} from './BrandedQRCode.js';
import type QRCodeStyling from 'qr-code-styling';

export default function BagCreated({
  bagData,
  onCreateAnother,
  isPro,
}: BagCreatedProps) {
  const [copied, setCopied] = useState(false);
  const qrInstanceRef = useRef<QRCodeStyling | null>(null);

  const handleQRInstanceReady = useCallback((instance: QRCodeStyling) => {
    qrInstanceRef.current = instance;
  }, []);

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
    if (qrInstanceRef.current) {
      downloadQRWithBorder(
        qrInstanceRef.current,
        `youfoundmybag-${bagData.data.short_id}`
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>Your QR Code is Ready - YouFoundMyBag.com</title>
      </Helmet>
      <div className="max-w-3xl mx-auto p-6 w-full 2xl:[zoom:1.25]">
        <div className="card text-center">
          <h1 className="text-2xl font-semibold mb-6 text-medium-jungle-700 flex items-center justify-center gap-2">
            <SuccessIcon color="currentColor" /> Your QR code is ready!
          </h1>

          <div className="qr-code-container mb-6 inline-block">
            <BrandedQRCode
              url={bagData.data.url}
              size={256}
              onInstanceReady={handleQRInstanceReady}
              className="rounded-[9px] shadow-lg"
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
              onClick={() => {
                if (qrInstanceRef.current) printQR(qrInstanceRef.current);
              }}
              className="btn-secondary w-full hidden sm:flex items-center justify-center gap-2"
            >
              <PrintIcon color="currentColor" /> Print QR Code
            </button>
            {isPro && (
              <button
                onClick={onCreateAnother}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <PlusIcon color="currentColor" /> Create Another
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
