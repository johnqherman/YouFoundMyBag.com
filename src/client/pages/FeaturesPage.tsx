import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  QRCodeIcon,
  SecureIcon,
  EyeOffIcon,
  HashtagIcon,
  CodeBracketsIcon,
  BotAgentIcon,
  MessageIcon,
  CameraScanIcon,
  PaletteIcon,
  MailIcon,
  InboxTrayIcon,
  CheckIcon,
  CrossIcon,
  ChevronRightIcon,
  PlusIcon,
  WhatsAppIcon,
  InstagramIcon,
  TelegramIcon,
  SignalIcon,
} from '../components/icons/AppIcons.js';
import { useScrollReveal } from '../hooks/useScrollReveal.js';
import Twemoji from '../components/Twemoji.js';

function FingerprintIcon() {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 018 4" />
      <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 1 0 2 .2 2.8.6" />
      <path d="M17.6 9.4C18.5 10.1 19 11 19 12c0 5-3.5 7.5-5 8.5" />
      <path d="M12 10a2 2 0 00-2 2c0 3-1.5 5-2.5 6.5" />
      <path d="M14 12c0 2-1 3.5-2 5" />
    </svg>
  );
}

const qrFeatures = [
  {
    icon: <QRCodeIcon />,
    title: 'Instant generation',
    description:
      'Your QR code is created in seconds. No app to download, no account to create.',
  },
  {
    icon: <CameraScanIcon />,
    title: 'Any smartphone works',
    description:
      'Any modern smartphone camera can scan the code — iPhone, Android, no special app required.',
  },
  {
    icon: <FingerprintIcon />,
    title: 'Unique short IDs',
    description:
      'Every tag gets a unique 6-character ID that maps to a short, memorable URL.',
  },
  {
    icon: <PaletteIcon label="Customization" />,
    title: 'Customizable QR codes',
    description:
      'Pro users can customize QR colors and styling to match their luggage or personal taste.',
    pro: true,
  },
];

const privacyFeatures = [
  { icon: <EyeOffIcon />, text: 'Two-way anonymous messaging' },
  { icon: <HashtagIcon />, text: 'Encrypted in transit and at rest' },
  { icon: <SecureIcon />, text: "We store only what's necessary" },
  { icon: <EyeOffIcon />, text: 'No tracking. No ads. No data selling.' },
  { icon: <CodeBracketsIcon />, text: 'Open source and publicly auditable' },
  {
    icon: <BotAgentIcon />,
    text: 'Built-in protection against spam and abuse',
  },
];

const messagingFeatures = [
  'Finders start the conversation just by scanning your tag',
  'Private two-way conversations with the finder',
  'One-click sign in — no passwords to remember',
  'Know when your message has been seen',
  'Mark conversations as resolved when your item is back',
  'Instant alerts for new messages and follow-ups',
];

const contactChannels = [
  { name: 'SMS', icon: <MessageIcon /> },
  { name: 'WhatsApp', icon: <WhatsAppIcon /> },
  { name: 'Email', icon: <MailIcon /> },
  { name: 'Instagram', icon: <InstagramIcon /> },
  { name: 'Telegram', icon: <TelegramIcon /> },
  { name: 'Signal', icon: <SignalIcon /> },
];

const dashboardFeatures = [
  { text: 'View all your bags in one place' },
  { text: 'Conversation inbox with unread counts' },
  { text: 'Edit bag details anytime', pro: true },
  { text: 'Activate or deactivate tags' },
  { text: 'Delete bags you no longer need' },
  { text: 'Rotate short IDs for enhanced privacy' },
];

const emailFeatures = [
  'Instant alerts when someone finds your item',
  'Magic link access — one click to respond',
  'Granular email preferences',
  'Unsubscribe anytime',
];

const comparisonRows = [
  { label: 'Active QR tags', free: '1', pro: 'Up to 10' },
  { label: 'QR design', free: 'Basic', pro: 'Custom styling' },
  { label: 'Scan insights', free: false, pro: true },
  { label: 'Tag editing', free: false, pro: true },
  { label: 'Finder page branding', free: 'YouFoundMyBag', pro: 'No branding' },
  { label: 'Support level', free: 'Standard', pro: 'Priority' },
];

function QrFeatureCard({
  feature,
  index,
  isVisible,
}: {
  feature: (typeof qrFeatures)[0];
  index: number;
  isVisible: boolean;
}) {
  const delay = index * 120;
  return (
    <div
      className="bg-white border border-regal-navy-200/60 rounded-xl p-6 shadow-soft"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <div className="flex items-start gap-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-regal-navy-50 text-regal-navy-700 border border-regal-navy-100 shrink-0">
          {feature.icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-regal-navy-900 mb-1 flex items-center gap-2">
            {feature.title}
            {feature.pro && (
              <span className="bg-medium-jungle-100 text-medium-jungle-700 text-xs font-medium px-2 py-0.5 rounded-full">
                Pro
              </span>
            )}
          </h3>
          <p className="text-regal-navy-600 text-sm leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function PrivacyFeatureItem({
  feature,
  index,
  isVisible,
}: {
  feature: (typeof privacyFeatures)[0];
  index: number;
  isVisible: boolean;
}) {
  const delay = index * 80;
  return (
    <div
      className="flex items-start gap-3"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <span className="mt-0.5 text-medium-jungle-400 shrink-0">
        {feature.icon}
      </span>
      <span className="text-regal-navy-200 text-sm leading-relaxed">
        {feature.text}
      </span>
    </div>
  );
}

function MessagingFeatureItem({
  feature,
  index,
  isVisible,
}: {
  feature: string;
  index: number;
  isVisible: boolean;
}) {
  const delay = index * 80;
  return (
    <li
      className="flex items-start gap-3 text-sm"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <span className="mt-0.5 text-medium-jungle-500 shrink-0">
        <CheckIcon />
      </span>
      <span className="text-regal-navy-700 leading-relaxed">{feature}</span>
    </li>
  );
}

function ContactChannelItem({
  channel,
  index,
  isVisible,
}: {
  channel: (typeof contactChannels)[0];
  index: number;
  isVisible: boolean;
}) {
  const delay = index * 80;
  return (
    <div
      className="bg-white border border-dashed border-regal-navy-200 rounded-xl p-4 flex items-center gap-3"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <span className="brand-icon-lg text-regal-navy-400">{channel.icon}</span>
      <div>
        <span className="text-sm font-medium text-regal-navy-500">
          {channel.name}
        </span>
      </div>
    </div>
  );
}

function DashboardFeatureItem({
  feature,
  index,
  isVisible,
}: {
  feature: (typeof dashboardFeatures)[0];
  index: number;
  isVisible: boolean;
}) {
  const delay = index * 80;
  return (
    <li
      className="flex items-start gap-3 text-sm"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <span className="mt-0.5 text-medium-jungle-500 shrink-0">
        <CheckIcon />
      </span>
      <span className="text-regal-navy-700 leading-relaxed flex items-center gap-2">
        {feature.text}
        {feature.pro && (
          <span className="bg-medium-jungle-100 text-medium-jungle-700 text-xs font-medium px-2 py-0.5 rounded-full">
            Pro
          </span>
        )}
      </span>
    </li>
  );
}

function EmailFeatureItem({
  feature,
  index,
  isVisible,
}: {
  feature: string;
  index: number;
  isVisible: boolean;
}) {
  const delay = index * 80;
  return (
    <li
      className="flex items-start gap-3 text-sm"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : 'translateY(28px)',
        transition: `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <span className="mt-0.5 text-medium-jungle-500 shrink-0">
        <CheckIcon />
      </span>
      <span className="text-regal-navy-700 leading-relaxed">{feature}</span>
    </li>
  );
}

function ComparisonRow({
  row,
  index,
  isLast,
  isVisible,
}: {
  row: (typeof comparisonRows)[0];
  index: number;
  isLast: boolean;
  isVisible: boolean;
}) {
  const delay = index * 60;
  return (
    <tr
      className={!isLast ? 'border-b border-regal-navy-100' : ''}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
      }}
    >
      <td className="py-4 pr-4 pl-4 sm:pl-0 text-regal-navy-700 font-medium">
        {row.label}
      </td>
      <td className="py-4 px-4 text-center text-regal-navy-500">
        {typeof row.free === 'boolean' ? (
          row.free ? (
            <span className="inline-flex justify-center text-medium-jungle-500">
              <CheckIcon />
            </span>
          ) : (
            <span className="inline-flex justify-center text-regal-navy-300">
              <CrossIcon />
            </span>
          )
        ) : (
          row.free
        )}
      </td>
      <td className="py-4 px-4 pl-4 sm:pr-0 text-center text-regal-navy-900 font-medium">
        {typeof row.pro === 'boolean' ? (
          row.pro ? (
            <span className="inline-flex justify-center text-medium-jungle-500">
              <CheckIcon />
            </span>
          ) : (
            <span className="inline-flex justify-center text-regal-navy-300">
              <CrossIcon />
            </span>
          )
        ) : (
          row.pro
        )}
      </td>
    </tr>
  );
}

export default function FeaturesPage() {
  const { ref: qrHeadingRef, isVisible: qrHeadingVisible } =
    useScrollReveal<HTMLDivElement>(0.6);
  const { ref: privacySectionRef, isVisible: privacySectionVisible } =
    useScrollReveal<HTMLDivElement>(0.2);
  const { ref: messagingSectionRef, isVisible: messagingSectionVisible } =
    useScrollReveal<HTMLDivElement>(0.2);
  const { ref: contactHeadingRef, isVisible: contactHeadingVisible } =
    useScrollReveal<HTMLDivElement>(0.6);
  const { ref: dashboardSectionRef, isVisible: dashboardSectionVisible } =
    useScrollReveal<HTMLDivElement>(0.2);
  const { ref: emailSectionRef, isVisible: emailSectionVisible } =
    useScrollReveal<HTMLDivElement>(0.2);
  const { ref: comparisonHeadingRef, isVisible: comparisonHeadingVisible } =
    useScrollReveal<HTMLDivElement>(0.6);
  const { ref: ctaRef, isVisible: ctaVisible } =
    useScrollReveal<HTMLDivElement>(0.4);

  const fadeUp = (visible: boolean, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(20px)',
    transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  return (
    <div className="min-h-screen bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>Features - YouFoundMyBag.com</title>
        <meta
          name="description"
          content="Discover how YouFoundMyBag protects your belongings with privacy-first QR tags, secure anonymous messaging, and instant notifications."
        />
      </Helmet>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 sm:pb-14 text-center">
          <div className="animate-slideUp">
            <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-5">
              Features
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-regal-navy-900 leading-[1.1] tracking-tight">
              Privacy-first QR tags for lost item recovery.
            </h1>
            <p className="mt-5 text-lg text-regal-navy-600 max-w-2xl mx-auto leading-relaxed">
              Create a tag in seconds, get notified instantly, and communicate
              with finders — without ever exposing your personal information.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-regal-navy-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div
            ref={qrHeadingRef}
            className="text-center mb-14 sm:mb-20"
            style={fadeUp(qrHeadingVisible)}
          >
            <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
              Smart QR codes
            </h2>
            <p className="mt-3 text-regal-navy-600 text-lg max-w-xl mx-auto">
              No app. No friction. Just scan and connect.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {qrFeatures.map((feature, index) => (
              <QrFeatureCard
                key={feature.title}
                feature={feature}
                index={index}
                isVisible={qrHeadingVisible}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-regal-navy-900 text-white">
        <div
          ref={privacySectionRef}
          className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
        >
          <div
            className="text-center mb-14 sm:mb-20"
            style={fadeUp(privacySectionVisible)}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-regal-navy-800 border border-regal-navy-700 text-medium-jungle-400 mb-5">
              <SecureIcon />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
              Privacy &amp; security at every layer
            </h2>
            <p className="mt-3 text-regal-navy-400 text-lg max-w-xl mx-auto">
              Your security isn&apos;t a feature — it&apos;s the foundation
              everything is built on.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-w-3xl mx-auto">
            {privacyFeatures.map((feature, index) => (
              <PrivacyFeatureItem
                key={feature.text}
                feature={feature}
                index={index}
                isVisible={privacySectionVisible}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-regal-navy-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div
            ref={messagingSectionRef}
            className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16"
          >
            <div className="lg:w-2/5" style={fadeUp(messagingSectionVisible)}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-regal-navy-200 shadow-soft text-regal-navy-700 mb-5">
                <MessageIcon />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
                Secure messaging
              </h2>
              <p className="mt-3 text-regal-navy-600 text-base leading-relaxed">
                Communicate with finders without revealing your identity. Every
                conversation is anonymous, encrypted in transit, and fully under
                your control.
              </p>
            </div>
            <div className="lg:w-3/5">
              <ul className="space-y-4">
                {messagingFeatures.map((feature, index) => (
                  <MessagingFeatureItem
                    key={feature}
                    feature={feature}
                    index={index}
                    isVisible={messagingSectionVisible}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-regal-navy-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div
            ref={contactHeadingRef}
            className="text-center mb-12 sm:mb-16"
            style={fadeUp(contactHeadingVisible)}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-regal-navy-200 shadow-soft text-regal-navy-700 mb-5">
              <MessageIcon />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
              Stay reachable. Stay anonymous.
            </h2>
            <p className="mt-3 text-regal-navy-600 text-lg max-w-xl mx-auto">
              When someone finds your bag, they can message you directly — no
              phone number, no email, no personal details ever shared.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-medium-jungle-50 border border-medium-jungle-200 rounded-xl p-5 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-medium-jungle-100 text-medium-jungle-700 border border-medium-jungle-200 shrink-0 mt-0.5">
                  <MessageIcon />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-medium-jungle-900">
                      Private two-way messaging
                    </span>
                    <span className="recommended-badge bg-medium-jungle-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-medium-jungle-800 leading-relaxed">
                    A finder scans your tag and starts a conversation — you
                    respond from your dashboard. Both sides stay fully anonymous
                    throughout.
                  </p>
                </div>
              </div>

              <div
                className="border-t border-medium-jungle-200/60 mt-4 pt-4"
                aria-hidden="true"
              >
                <div className="space-y-4">
                  <div className="flex items-end gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-dark-coffee-100 text-dark-coffee-700 flex items-center justify-center text-sm font-medium shrink-0">
                      J
                    </span>
                    <div className="flex flex-col items-start min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 px-1">
                        <span className="text-xs font-medium text-regal-navy-500">
                          John
                        </span>
                        <span className="text-xs text-regal-navy-400">
                          2 min ago
                        </span>
                      </div>
                      <div className="bg-white border border-regal-navy-200 text-regal-navy-900 px-4 py-3 rounded-t-2xl rounded-br-2xl rounded-bl-sm shadow-soft">
                        <Twemoji tag="p" className="text-sm leading-relaxed">
                          Hey, I found your bag 😎
                        </Twemoji>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-2 mb-1 px-1">
                      <span className="text-xs font-medium text-regal-navy-500">
                        You
                      </span>
                      <span className="text-xs text-regal-navy-400">
                        just now
                      </span>
                    </div>
                    <div className="bg-regal-navy-700 text-white px-4 py-3 rounded-t-2xl rounded-bl-2xl rounded-br-sm shadow-soft">
                      <p className="text-sm leading-relaxed">
                        That's a relief! Where was it?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 my-10 max-w-3xl mx-auto">
            <div className="flex-1 h-px bg-regal-navy-200/60" />
            <p className="text-xs font-medium tracking-widest uppercase text-regal-navy-400 whitespace-nowrap">
              Or share a direct contact — your info will be visible to finders
            </p>
            <div className="flex-1 h-px bg-regal-navy-200/60" />
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {contactChannels.map((channel, index) => (
                <ContactChannelItem
                  key={channel.name}
                  channel={channel}
                  index={index}
                  isVisible={contactHeadingVisible}
                />
              ))}
              <div className="bg-regal-navy-50 border border-dashed border-regal-navy-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-regal-navy-300">
                  <PlusIcon />
                </span>
                <span className="text-sm font-medium text-regal-navy-400 italic">
                  Other
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-regal-navy-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div
            ref={dashboardSectionRef}
            className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16"
          >
            <div className="lg:w-2/5" style={fadeUp(dashboardSectionVisible)}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-regal-navy-200 shadow-soft text-regal-navy-700 mb-5">
                <InboxTrayIcon />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
                Dashboard &amp; management
              </h2>
              <p className="mt-3 text-regal-navy-600 text-base leading-relaxed">
                All your tags and conversations in one place — simple to manage,
                always under your control.
              </p>
            </div>
            <div className="lg:w-3/5">
              <ul className="space-y-4">
                {dashboardFeatures.map((feature, index) => (
                  <DashboardFeatureItem
                    key={feature.text}
                    feature={feature}
                    index={index}
                    isVisible={dashboardSectionVisible}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-regal-navy-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div
            ref={emailSectionRef}
            className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16"
          >
            <div className="lg:w-2/5" style={fadeUp(emailSectionVisible)}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-regal-navy-200 shadow-soft text-regal-navy-700 mb-5">
                <MailIcon />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
                Email notifications
              </h2>
              <p className="mt-3 text-regal-navy-600 text-base leading-relaxed">
                Stay informed without staying glued to a screen.
              </p>
            </div>
            <div className="lg:w-3/5">
              <ul className="space-y-4">
                {emailFeatures.map((feature, index) => (
                  <EmailFeatureItem
                    key={feature}
                    feature={feature}
                    index={index}
                    isVisible={emailSectionVisible}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-regal-navy-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div
            ref={comparisonHeadingRef}
            className="text-center mb-12"
            style={fadeUp(comparisonHeadingVisible)}
          >
            <h2 className="font-display text-3xl sm:text-4xl text-regal-navy-900 tracking-tight">
              Free vs Pro
            </h2>
            <p className="mt-3 text-regal-navy-600 text-lg max-w-xl mx-auto">
              Free is perfect for protecting one bag. Pro is built for frequent
              travelers, families, and anyone managing multiple items.
            </p>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b-2 border-regal-navy-200">
                  <th className="text-left font-medium text-regal-navy-500 py-4 pr-4 pl-4 sm:pl-0 w-2/5">
                    Feature
                  </th>
                  <th className="text-center font-medium text-regal-navy-500 py-4 px-4 w-[30%]">
                    Free
                  </th>
                  <th className="text-center font-semibold text-regal-navy-900 py-4 px-4 pl-4 sm:pr-0 w-[30%]">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <ComparisonRow
                    key={row.label}
                    row={row}
                    index={i}
                    isLast={i === comparisonRows.length - 1}
                    isVisible={comparisonHeadingVisible}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/pricing"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-regal-navy-600 hover:text-regal-navy-900 transition-colors"
            >
              Compare Free vs Pro plans
              <ChevronRightIcon />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-regal-navy-50">
        <div
          ref={ctaRef}
          className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center"
          style={fadeUp(ctaVisible)}
        >
          <h2 className="font-display text-2xl sm:text-4xl text-regal-navy-900 tracking-tight">
            Ready to protect what matters?
          </h2>
          <p className="mt-5 text-regal-navy-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Create your first QR tag in seconds — no account required. Your
            personal information is never shared with finders.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/new"
              className="group btn-primary text-base px-8 inline-flex items-center gap-2 hover:shadow-soft-lg"
            >
              Create your free QR tag
              <ChevronRightIcon />
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
