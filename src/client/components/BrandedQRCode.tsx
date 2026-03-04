import { useEffect, useRef, useState } from 'react';
import QRCodeStyling, { Options } from 'qr-code-styling';

const DOWNLOAD_SIZE = 1024;
const DOWNLOAD_PADDING = 48;
const DOWNLOAD_BORDER_WIDTH = 4;
const DOWNLOAD_BORDER_COLOR = '#cbd5e1'; // slate-300

const processedLogoCache = new Map<string, string>();

async function applyGradientToLogo(
  colorStart: string,
  colorEnd: string
): Promise<string> {
  const cacheKey = `${colorStart}|${colorEnd}`;
  if (processedLogoCache.has(cacheKey))
    return processedLogoCache.get(cacheKey)!;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.width,
        h = img.height;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.drawImage(img, 0, 0);
      const maskData = maskCtx.getImageData(0, 0, w, h);
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (
          (maskData.data[i] ?? 0) > 220 &&
          (maskData.data[i + 1] ?? 0) > 220 &&
          (maskData.data[i + 2] ?? 0) > 220
        ) {
          maskData.data[i + 3] = 0;
        }
      }
      maskCtx.putImageData(maskData, 0, 0);

      const gradCanvas = document.createElement('canvas');
      gradCanvas.width = w;
      gradCanvas.height = h;
      const gradCtx = gradCanvas.getContext('2d')!;
      const grad = gradCtx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      gradCtx.fillStyle = grad;
      gradCtx.fillRect(0, 0, w, h);
      gradCtx.globalCompositeOperation = 'destination-in';
      gradCtx.drawImage(maskCanvas, 0, 0);

      const result = document.createElement('canvas');
      result.width = w;
      result.height = h;
      const resultCtx = result.getContext('2d')!;
      resultCtx.fillStyle = '#ffffff';
      resultCtx.fillRect(0, 0, w, h);
      resultCtx.drawImage(gradCanvas, 0, 0);

      const dataUrl = result.toDataURL('image/png');
      processedLogoCache.set(cacheKey, dataUrl);
      resolve(dataUrl);
    };
    img.src = '/qrcode-center.png';
  });
}

function getQrOptions(
  url: string,
  size: number,
  colorStart?: string,
  colorEnd?: string,
  imageUrl?: string
): Options {
  const defaultColor = '#395d94';
  const hasGradient = colorStart && colorEnd && colorStart !== colorEnd;
  const hasSolid = colorStart && (!colorEnd || colorEnd === colorStart);

  const colorOption = hasGradient
    ? {
        gradient: {
          type: 'linear' as const,
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: colorStart },
            { offset: 1, color: colorEnd },
          ],
        },
      }
    : hasSolid
      ? { color: colorStart }
      : { color: defaultColor };

  return {
    width: size,
    height: size,
    type: 'svg',
    data: url,
    image: imageUrl ?? '/qrcode-center.png',
    dotsOptions: {
      type: 'dots',
      ...colorOption,
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      ...colorOption,
    },
    cornersDotOptions: {
      type: 'dot',
      ...colorOption,
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 0,
      imageSize: 0.25,
      hideBackgroundDots: true,
    },
    qrOptions: {
      errorCorrectionLevel: 'H',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  };
}

export async function printQR(qrInstance: QRCodeStyling): Promise<void> {
  const rawData = await qrInstance.getRawData('png');
  if (!rawData) return;

  const blob =
    rawData instanceof Blob
      ? rawData
      : new Blob([rawData as BlobPart], { type: 'image/png' });
  const objectUrl = URL.createObjectURL(blob);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(objectUrl);
    return;
  }

  printWindow.document.write(
    '<!DOCTYPE html><html><head><style>' +
      '@page{size:letter;margin:0.5in}' +
      'html,body{margin:0;padding:0}' +
      'body{display:flex;justify-content:flex-start;align-items:flex-start}' +
      '.qr-outer{' +
      'width:2.125in;height:2.125in;box-sizing:border-box;' +
      'background:linear-gradient(to bottom right,#f8fafc,#f1f5f9);' +
      'border-radius:16px;border:2px solid #e2e8f0;padding:10px;' +
      'display:flex;' +
      'print-color-adjust:exact;-webkit-print-color-adjust:exact' +
      '}' +
      '.qr-inner{' +
      'flex:1;box-sizing:border-box;' +
      'background:white;border-radius:10px;padding:8px;' +
      'box-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06);' +
      'display:flex;' +
      'print-color-adjust:exact;-webkit-print-color-adjust:exact' +
      '}' +
      'img{flex:1;width:0;height:0;min-width:100%;min-height:100%;display:block;border-radius:6px;object-fit:contain}' +
      '</style></head><body>' +
      '<div class="qr-outer"><div class="qr-inner">' +
      '<img src="' +
      objectUrl +
      '" onload="window.focus();window.print();window.close();" onerror="window.close();" />' +
      '</div></div>' +
      '</body></html>'
  );
  printWindow.document.close();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
}

export async function downloadQRWithBorder(
  qrInstance: QRCodeStyling,
  filename: string
) {
  const rawData = await qrInstance.getRawData('png');
  if (!rawData) return;

  const blob =
    rawData instanceof Blob
      ? rawData
      : new Blob([rawData as BlobPart], { type: 'image/png' });
  const img = new Image();
  const objectUrl = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = objectUrl;
  });

  const totalSize = DOWNLOAD_SIZE + DOWNLOAD_PADDING * 2;
  const canvas = document.createElement('canvas');
  canvas.width = totalSize;
  canvas.height = totalSize;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalSize, totalSize);

  ctx.strokeStyle = DOWNLOAD_BORDER_COLOR;
  ctx.lineWidth = DOWNLOAD_BORDER_WIDTH;
  const offset = DOWNLOAD_BORDER_WIDTH / 2;
  ctx.strokeRect(
    offset,
    offset,
    totalSize - DOWNLOAD_BORDER_WIDTH,
    totalSize - DOWNLOAD_BORDER_WIDTH
  );

  ctx.drawImage(
    img,
    DOWNLOAD_PADDING,
    DOWNLOAD_PADDING,
    DOWNLOAD_SIZE,
    DOWNLOAD_SIZE
  );

  URL.revokeObjectURL(objectUrl);

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

interface BrandedQRCodeProps {
  url: string;
  size?: number;
  className?: string;
  colorStart?: string;
  colorEnd?: string;
  onInstanceReady?: (instance: QRCodeStyling) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function BrandedQRCode({
  url,
  size = 256,
  className,
  colorStart,
  colorEnd,
  onInstanceReady,
}: BrandedQRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  const debouncedColorStart = useDebounce(colorStart, 300);
  const debouncedColorEnd = useDebounce(colorEnd, 300);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const imageUrl = debouncedColorStart
        ? await applyGradientToLogo(
            debouncedColorStart,
            debouncedColorEnd ?? debouncedColorStart
          )
        : '/qrcode-center.png';

      if (cancelled) return;

      const qr = new QRCodeStyling(
        getQrOptions(
          url,
          size,
          debouncedColorStart,
          debouncedColorEnd,
          imageUrl
        )
      );
      qrRef.current = qr;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        qr.append(containerRef.current);
      }

      const downloadQr = new QRCodeStyling(
        getQrOptions(
          url,
          DOWNLOAD_SIZE,
          debouncedColorStart,
          debouncedColorEnd,
          imageUrl
        )
      );
      if (onInstanceReady) onInstanceReady(downloadQr);
    }

    init();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [url, size, debouncedColorStart, debouncedColorEnd]);

  useEffect(() => {
    if (!onInstanceReady) return;
    const cb = onInstanceReady;

    async function refreshDownload() {
      const imageUrl = debouncedColorStart
        ? await applyGradientToLogo(
            debouncedColorStart,
            debouncedColorEnd ?? debouncedColorStart
          )
        : '/qrcode-center.png';
      const downloadQr = new QRCodeStyling(
        getQrOptions(
          url,
          DOWNLOAD_SIZE,
          debouncedColorStart,
          debouncedColorEnd,
          imageUrl
        )
      );
      cb(downloadQr);
    }

    refreshDownload();
  }, [onInstanceReady]);

  return (
    <div
      ref={containerRef}
      className={`qr-code-container ${className ?? ''}`}
    />
  );
}
