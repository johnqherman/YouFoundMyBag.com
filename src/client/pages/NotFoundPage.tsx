import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

function LostTagIllustration() {
  return (
    <div className="relative w-48 h-56 mx-auto" aria-hidden="true">
      <style>{`
        @keyframes sway {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(300%); opacity: 0; }
        }
        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-stagger-1 { animation: stagger-in 0.5s ease-out 0.1s both; }
        .anim-stagger-2 { animation: stagger-in 0.5s ease-out 0.25s both; }
        .anim-stagger-3 { animation: stagger-in 0.5s ease-out 0.4s both; }
        .anim-stagger-4 { animation: stagger-in 0.5s ease-out 0.55s both; }
        .anim-stagger-5 { animation: stagger-in 0.5s ease-out 0.7s both; }
        .tag-sway {
          transform-origin: top center;
          animation: sway 4s ease-in-out infinite, floatUp 5s ease-in-out infinite;
        }
        .scan-line {
          animation: scanLine 3s ease-in-out 1.2s infinite;
        }
      `}</style>

      <div className="tag-sway absolute left-1/2 -translate-x-1/2 top-0 w-36 flex flex-col items-center">
        <div className="w-px h-8 bg-gradient-to-b from-transparent via-regal-navy-300 to-regal-navy-400" />
        <div className="w-5 h-5 rounded-full border-2 border-regal-navy-300 bg-regal-navy-50 -mb-1 relative z-10" />

        <div className="w-36 bg-white border border-regal-navy-200 rounded-2xl shadow-soft-lg overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-regal-navy-400 to-regal-navy-600" />

          <div className="p-4">
            <div className="bg-regal-navy-50 rounded-xl p-3 mb-3 relative overflow-hidden">
              <svg
                className="w-full h-20 text-regal-navy-200"
                viewBox="0 0 100 80"
                fill="none"
              >
                <rect
                  x="2"
                  y="2"
                  width="22"
                  height="22"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <rect
                  x="8"
                  y="8"
                  width="10"
                  height="10"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="76"
                  y="2"
                  width="22"
                  height="22"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <rect
                  x="82"
                  y="8"
                  width="10"
                  height="10"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="2"
                  y="56"
                  width="22"
                  height="22"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <rect
                  x="8"
                  y="62"
                  width="10"
                  height="10"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="30"
                  y="6"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.5"
                />
                <rect
                  x="42"
                  y="6"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect
                  x="54"
                  y="6"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.5"
                />
                <rect
                  x="30"
                  y="18"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect
                  x="54"
                  y="18"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.5"
                />
                <rect
                  x="30"
                  y="30"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.5"
                />
                <rect
                  x="42"
                  y="30"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.4"
                />
                <rect
                  x="66"
                  y="30"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect
                  x="30"
                  y="42"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.4"
                />
                <rect
                  x="54"
                  y="42"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect
                  x="66"
                  y="42"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.5"
                />
                <rect
                  x="42"
                  y="54"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.4"
                />
                <rect
                  x="54"
                  y="54"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect
                  x="66"
                  y="54"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.5"
                />
                <rect
                  x="30"
                  y="66"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.3"
                />
                <rect
                  x="54"
                  y="66"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.5"
                />
                <rect
                  x="66"
                  y="66"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  opacity="0.4"
                />
                <text
                  x="50"
                  y="46"
                  textAnchor="middle"
                  fontSize="32"
                  fontWeight="700"
                  fontFamily="serif"
                  fill="#8eafd7"
                  opacity="0.9"
                >
                  ?
                </text>
              </svg>
              <div className="scan-line absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-regal-navy-400 to-transparent opacity-0" />
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 bg-regal-navy-100 rounded-full w-full" />
              <div className="h-1.5 bg-regal-navy-100 rounded-full w-3/5" />
            </div>
          </div>

          <div className="h-1 bg-regal-navy-50" />
        </div>

        <div className="lost-tag-glow absolute -inset-2 top-2 bg-regal-navy-200/30 rounded-3xl blur-xl -z-10" />
      </div>
    </div>
  );
}

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex flex-col bg-regal-navy-50 text-regal-navy-900 relative overflow-hidden">
      <Helmet>
        <title>Page Not Found - YouFoundMyBag.com</title>
      </Helmet>

      <svg
        className="absolute -right-8 -bottom-8 w-80 h-80 text-regal-navy-900 opacity-[0.025] pointer-events-none select-none"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden="true"
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
        <rect
          x="325"
          y="25"
          width="50"
          height="50"
          rx="4"
          fill="currentColor"
        />
        <rect
          x="5"
          y="305"
          width="90"
          height="90"
          rx="8"
          stroke="currentColor"
          strokeWidth="6"
        />
        <rect
          x="25"
          y="325"
          width="50"
          height="50"
          rx="4"
          fill="currentColor"
        />
      </svg>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div
          className="anim-stagger-1 absolute select-none pointer-events-none font-display font-bold text-regal-navy-200 opacity-[0.5] leading-none"
          style={{ fontSize: 'clamp(8rem, 30vw, 18rem)' }}
          aria-hidden="true"
        >
          404
        </div>

        <div className="relative z-10 text-center max-w-sm w-full">
          <div className="anim-stagger-2 mb-8">
            <LostTagIllustration />
          </div>

          <h1 className="anim-stagger-3 font-display text-3xl sm:text-4xl text-regal-navy-900 leading-tight tracking-tight mb-3">
            Page lost in transit
          </h1>

          <p className="anim-stagger-4 text-regal-navy-500 text-base leading-relaxed mb-8 max-w-xs mx-auto">
            Unlike your luggage, this one probably isn&apos;t coming back.
          </p>

          <div className="anim-stagger-5">
            <Link
              to="/"
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M10 12L6 8l4-4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
