import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal.js';
import {
  SecureIcon,
  QRCodeIcon,
  MessageIcon,
  ChevronRightIcon,
} from '../components/icons/AppIcons.js';

function QrGridPattern() {
  return (
    <svg
      className="absolute right-0 top-0 h-full w-1/2 text-regal-navy-900 opacity-[0.03]"
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

function LuggageTagVisual() {
  const tagRef = useRef<HTMLDivElement>(null);
  const mouseAngleRef = useRef(0);
  const currentAngleRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseAngleRef.current = (e.clientX / window.innerWidth - 0.5) * 16;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = (time: number) => {
      const passive = Math.sin(time / 1600) * 1.8;
      const target = passive + mouseAngleRef.current;
      currentAngleRef.current += (target - currentAngleRef.current) * 0.04;
      if (tagRef.current) {
        tagRef.current.style.transform = `rotate(${currentAngleRef.current}deg)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={tagRef}
        className="flex flex-col items-center"
        style={{ transformOrigin: 'top center' }}
      >
        <div className="w-px h-48 bg-gradient-to-b from-transparent via-regal-navy-300 to-regal-navy-400" />
        <div className="w-5 h-5 rounded-full border-2 border-regal-navy-300 bg-regal-navy-50 -mb-1 relative z-10" />
        <div className="relative w-56 sm:w-64">
          <div className="landing-tag-card bg-white border border-regal-navy-200 rounded-2xl p-6 pb-8 shadow-soft-lg">
            <div className="bg-regal-navy-50 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-sm ${
                      [
                        0, 1, 2, 5, 6, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24,
                      ].includes(i)
                        ? 'bg-regal-navy-800'
                        : 'bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-regal-navy-100 rounded-full w-3/4" />
              <div className="h-2 bg-regal-navy-100 rounded-full w-1/2" />
            </div>
          </div>

          <div className="landing-tag-glow absolute -inset-4 bg-regal-navy-200/40 rounded-3xl blur-2xl -z-10" />
        </div>
      </div>
    </div>
  );
}

function CreateTagIllustration() {
  return (
    <div className="hidden sm:block ml-auto shrink-0 w-32 h-28 bg-white border border-regal-navy-200 rounded-xl shadow-soft p-3 relative">
      <div className="space-y-2.5 mb-3">
        <div className="h-1.5 bg-regal-navy-100 rounded-full w-full" />
        <div className="h-1.5 bg-regal-navy-100 rounded-full w-4/5" />
        <div className="h-1.5 bg-regal-navy-100 rounded-full w-3/5" />
      </div>
      <div className="absolute bottom-3 right-3">
        <svg
          className="w-7 h-7 text-regal-navy-300"
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
  );
}

function AttachTagIllustration() {
  return (
    <div className="hidden sm:block ml-auto shrink-0 w-32 h-28 bg-white border border-regal-navy-200 rounded-xl shadow-soft p-3 relative overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full text-regal-navy-100"
        viewBox="0 0 128 112"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="44"
          y="8"
          width="40"
          height="6"
          rx="3"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <rect
          x="24"
          y="22"
          width="80"
          height="72"
          rx="8"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle cx="40" cy="100" r="4" fill="currentColor" />
        <circle cx="88" cy="100" r="4" fill="currentColor" />
      </svg>
      <div className="absolute bottom-3 right-3 w-8 h-10 bg-white border border-regal-navy-300 rounded-md flex flex-col items-center justify-center gap-0.5">
        <div className="w-2 h-2 rounded-full border border-regal-navy-300" />
        <div className="grid grid-cols-2 gap-px">
          <div className="w-1.5 h-1.5 bg-regal-navy-700 rounded-[1px]" />
          <div className="w-1.5 h-1.5 bg-regal-navy-300 rounded-[1px]" />
          <div className="w-1.5 h-1.5 bg-regal-navy-300 rounded-[1px]" />
          <div className="w-1.5 h-1.5 bg-regal-navy-700 rounded-[1px]" />
        </div>
      </div>
    </div>
  );
}

function GetNotifiedIllustration() {
  return (
    <div className="hidden sm:block ml-auto shrink-0 w-32 h-28 bg-white border border-regal-navy-200 rounded-xl shadow-soft relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="w-14 h-12 text-regal-navy-300"
          viewBox="0 0 56 48"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <rect x="2" y="8" width="52" height="36" rx="4" />
          <path d="M2 12l24 16a4 4 0 004 0l24-16" />
        </svg>
        <div className="absolute top-3 right-5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
      </div>
    </div>
  );
}

const stepIllustrations = [
  <CreateTagIllustration key="create" />,
  <AttachTagIllustration key="attach" />,
  <GetNotifiedIllustration key="notify" />,
];

const steps = [
  {
    number: '1',
    title: 'Create a tag',
    description:
      'Enter your item details and get a unique QR code in seconds. No account required.',
  },
  {
    number: '2',
    title: 'Attach the QR code',
    description:
      'Print or save the QR code and attach it to your bag, luggage, or valuables.',
  },
  {
    number: '3',
    title: 'Get notified',
    description:
      "When someone finds your item and scans the code, you'll receive an instant email notification.",
  },
];

function StepItem({
  step,
  index,
  illustration,
}: {
  step: (typeof steps)[0];
  index: number;
  illustration: ReactNode;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(0.6);
  const delay = index * 160;

  return (
    <div
      ref={ref}
      className="relative flex items-start gap-6 sm:gap-10"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(36px)',
        transition: `opacity 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <span
        className="relative z-10 text-6xl sm:text-7xl font-display leading-none text-regal-navy-100 select-none shrink-0 w-[4.5rem] sm:w-[5.5rem] text-center bg-white py-1"
        style={{
          transform: isVisible ? 'scale(1)' : 'scale(0.72)',
          transition: `transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay + 80}ms`,
        }}
      >
        {step.number}
      </span>
      <div className="pt-1 sm:pt-2 flex-1">
        <h3 className="text-xl sm:text-2xl font-semibold text-regal-navy-900 mb-2">
          {step.title}
        </h3>
        <p className="text-regal-navy-600 leading-relaxed max-w-lg">
          {step.description}
        </p>
      </div>
      {illustration}
    </div>
  );
}

const features = [
  {
    icon: <SecureIcon />,
    title: 'Privacy-first',
    description:
      'Your personal information is never shared with finders. Communication happens through our secure relay. Your email, phone, and identity stay hidden.',
  },
  {
    icon: <QRCodeIcon />,
    title: 'Instant QR scanning',
    description:
      'Any smartphone camera can scan the code. No app download needed.',
  },
  {
    icon: <MessageIcon />,
    title: 'Secure messaging',
    description:
      'Chat anonymously with the finder to arrange a safe return. Both parties stay protected throughout the entire conversation.',
  },
];

function FeatureItem({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(0.6);
  const delay = index * 140;

  return (
    <div
      ref={ref}
      className="flex flex-col sm:flex-row items-start gap-6 sm:gap-12 py-10 sm:py-14 first:pt-0 last:pb-0"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <div className="sm:w-2/5">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-white text-regal-navy-700 border border-regal-navy-100 mb-3"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0.6)',
            transition: `transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay + 60}ms`,
          }}
        >
          {feature.icon}
        </div>
        <h3 className="text-xl font-semibold text-regal-navy-900">
          {feature.title}
        </h3>
      </div>
      <div className="sm:w-3/5">
        <p className="text-regal-navy-600 leading-relaxed text-base">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

function PrivacySection() {
  const { ref: headingRef, isVisible: headingVisible } =
    useScrollReveal<HTMLDivElement>(0.6);

  return (
    <section className="bg-regal-navy-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div
          ref={headingRef}
          className="text-center mb-14 sm:mb-20"
          style={{
            opacity: headingVisible ? 1 : 0,
            transform: headingVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
            Built around your privacy
          </h2>
          <p className="mt-3 text-regal-navy-600 text-lg max-w-xl mx-auto">
            Your security isn&apos;t a feature, it&apos;s the foundation.
          </p>
        </div>
        <div className="divide-y divide-regal-navy-200/60">
          {features.map((feature, index) => (
            <FeatureItem key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { ref: headingRef, isVisible: headingVisible } =
    useScrollReveal<HTMLDivElement>(0.4);
  const { ref: stepsContainerRef, isVisible: stepsContainerVisible } =
    useScrollReveal<HTMLDivElement>(0.35);

  return (
    <section
      id="how-it-works"
      className="bg-white border-y border-regal-navy-200/60"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div
          ref={headingRef}
          className="text-center mb-14 sm:mb-20"
          style={{
            opacity: headingVisible ? 1 : 0,
            transform: headingVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
            How it works
          </h2>
          <p className="mt-3 text-regal-navy-600 text-lg max-w-xl mx-auto">
            Three simple steps to protect your belongings.
          </p>
        </div>
        <div
          ref={stepsContainerRef}
          className="relative space-y-12 sm:space-y-16"
        >
          <div
            className="absolute left-[2.25rem] sm:left-[2.75rem] top-0 border-l border-dashed border-regal-navy-200"
            aria-hidden="true"
            style={{
              height: stepsContainerVisible ? '85%' : '0%',
              transition:
                'height 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 150ms',
            }}
          />
          {steps.map((step, index) => (
            <StepItem
              key={step.number}
              step={step}
              index={index}
              illustration={stepIllustrations[index]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const [isOwner, setIsOwner] = useState(() =>
    Boolean(localStorage.getItem('owner_session_token'))
  );

  useEffect(() => {
    const handleStorage = () =>
      setIsOwner(Boolean(localStorage.getItem('owner_session_token')));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const { ref: openSourceRef, isVisible: openSourceVisible } =
    useScrollReveal<HTMLDivElement>(0.4);

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>YouFoundMyBag.com - Privacy-First Lost &amp; Found</title>
      </Helmet>

      <section className="relative overflow-hidden">
        <QrGridPattern />
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">
          <div className="animate-slideUp">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-5">
                  Privacy-first lost &amp; found
                </p>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-regal-navy-900 leading-[1.1] tracking-tight">
                  Reunite with your{' '}
                  <span className="text-regal-navy-600">lost belongings</span>{' '}
                  without giving up your privacy
                </h1>
                <p className="mt-6 text-lg sm:text-xl text-regal-navy-600 max-w-xl leading-relaxed">
                  Attach a QR code to your bags and valuables. When someone
                  finds them, they reach you securely without ever seeing your
                  personal information.
                </p>
                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link
                    to={isOwner ? '/dashboard' : '/new'}
                    className="group btn-primary text-base px-8 inline-flex items-center justify-center gap-2 hover:shadow-soft-lg"
                  >
                    {isOwner ? 'Go to Dashboard' : 'Create your first tag'}
                    <span className="inline-flex items-center transition-transform duration-200 group-hover:translate-x-1">
                      <ChevronRightIcon />
                    </span>
                  </Link>
                </div>
              </div>

              <div className="hidden lg:flex items-start justify-center flex-shrink-0 -mt-24">
                <LuggageTagVisual />
              </div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <PrivacySection />

      <section className="bg-white border-t border-regal-navy-200/60">
        <div
          ref={openSourceRef}
          className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center"
          style={{
            opacity: openSourceVisible ? 1 : 0,
            transform: openSourceVisible ? 'none' : 'translateY(28px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          <h2 className="font-display text-2xl sm:text-4xl text-regal-navy-900 tracking-tight">
            Open source. Auditable. Yours.
          </h2>
          <p className="mt-5 text-regal-navy-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Every line of code is publicly auditable. We don&apos;t store what
            we don&apos;t need, and we never sell your data. Your trust is
            earned, not assumed.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={isOwner ? '/dashboard' : '/new'}
              className="btn-primary text-base px-8 text-center"
            >
              {isOwner ? 'Go to Dashboard' : 'Get started for free'}
            </Link>
            <a
              href="https://github.com/johnqherman/YouFoundMyBag.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-base px-8"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
