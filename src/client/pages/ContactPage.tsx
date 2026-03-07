import { useState, useRef, useEffect } from 'react';
import Twemoji from '../components/Twemoji.js';
import { Helmet } from 'react-helmet-async';
import { api } from '../utils/api.js';
import CharacterLimitTextArea from '../components/CharacterLimitTextArea.js';
import { MailIcon, SecureIcon } from '../components/icons/AppIcons.js';
import { useToast } from '../hooks/useToast.js';

type Status = 'idle' | 'submitting';

const SUBJECT_OPTIONS = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Other' },
];

function GitHubIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function SubjectSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selected = SUBJECT_OPTIONS.find((o) => o.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        disabled={disabled}
        className="input-field flex items-center justify-between text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selected.label}</span>
        <svg
          className={`w-4 h-4 text-regal-navy-500 shrink-0 ml-2 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 w-full mt-1 bg-white border border-regal-navy-200 rounded-lg shadow-lg overflow-hidden"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onMouseDown={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-3 py-2.5 text-sm cursor-pointer transition-colors duration-100 ${
                opt.value === value
                  ? 'bg-regal-navy-50 text-regal-navy-900 font-medium'
                  : 'text-regal-navy-700 hover:bg-regal-navy-50 hover:text-regal-navy-900'
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type EasterEggState = 'idle' | 'visible' | 'fading-out';

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [status, setStatus] = useState<Status>('idle');
  const [easterEgg, setEasterEgg] = useState<EasterEggState>('idle');
  const [easterEggText, setEasterEggText] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const msg = formData.message.trim().toLowerCase();
    if (msg === 'hello' || msg === 'hello bro' || msg === 'hi') {
      setEasterEgg('visible');
      setTimeout(() => setEasterEggText(true), 900);
      setTimeout(() => {
        setEasterEgg('fading-out');
        setEasterEggText(false);
      }, 3200);
      setTimeout(() => setEasterEgg('idle'), 4200);
      return;
    }

    setStatus('submitting');

    try {
      await api.submitContact(formData);
      toast.success(
        "Message sent! Thanks for reaching out. We'll get back to you within 1–2 business days."
      );
      setFormData({ name: '', email: '', subject: 'general', message: '' });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setStatus('idle');
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="dark-mode-immune"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: easterEgg === 'visible' ? 1 : 0,
          pointerEvents: easterEgg !== 'idle' ? 'all' : 'none',
          transition:
            easterEgg === 'visible' ? 'opacity 0.8s ease' : 'opacity 1s ease',
        }}
      >
        <p
          style={{
            color: '#fff',
            fontSize: 'clamp(4rem, 18vw, 12rem)',
            fontWeight: 900,
            textAlign: 'center',
            lineHeight: 1.1,
            fontFamily: 'Papyrus, fantasy',
            letterSpacing: '0.02em',
            userSelect: 'none',
            opacity: easterEggText ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          <Twemoji>Hello Bro ❤️</Twemoji>
        </p>
      </div>

      <Helmet>
        <title>Contact - YouFoundMyBag.com</title>
        <meta
          name="description"
          content="Get in touch with the YouFoundMyBag team for support, bug reports, feature requests, or general inquiries."
        />
      </Helmet>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 sm:pb-14 text-center">
          <div className="animate-slideUp">
            <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-5">
              Support
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-regal-navy-900 leading-[1.1] tracking-tight">
              Get in touch
            </h1>
            <p className="mt-5 text-lg text-regal-navy-600 max-w-2xl mx-auto leading-relaxed">
              Have a question, found a bug, or just want to say hello? We'd love
              to hear from you.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-regal-navy-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="animate-slideUp">
            <div className="grid lg:grid-cols-5 gap-10 lg:gap-12">
              <div className="lg:col-span-3">
                <div className="card">
                  <h2 className="text-xl font-semibold text-regal-navy-900 mb-6">
                    Send us a message
                  </h2>

                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-5"
                  >
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-regal-navy-700 mb-1.5"
                        >
                          Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="Your name"
                          disabled={status === 'submitting'}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-regal-navy-700 mb-1.5"
                        >
                          Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="you@example.com"
                          disabled={status === 'submitting'}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-regal-navy-700 mb-1.5">
                        Subject
                      </label>
                      <SubjectSelect
                        value={formData.subject}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, subject: value }))
                        }
                        disabled={status === 'submitting'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-regal-navy-700 mb-1.5">
                        Message
                      </label>
                      <CharacterLimitTextArea
                        name="message"
                        value={formData.message}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, message: value }))
                        }
                        maxLength={1000}
                        placeholder="Tell us what's on your mind…"
                        disabled={status === 'submitting'}
                        required
                        rows={6}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        status === 'submitting' ||
                        !formData.name.trim() ||
                        !formData.email.trim() ||
                        !formData.message.trim()
                      }
                      className="btn-primary w-full sm:w-auto"
                    >
                      {status === 'submitting' ? 'Sending…' : 'Send message'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="card">
                  <h2 className="text-base font-semibold text-regal-navy-900 mb-4">
                    Other ways to reach us
                  </h2>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-regal-navy-500">
                        <GitHubIcon />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-regal-navy-800">
                          GitHub Issues
                        </p>
                        <p className="text-sm text-regal-navy-500 mt-0.5">
                          Found a bug or have a feature request?{' '}
                          <a
                            href="https://github.com/johnqherman/YouFoundMyBag.com/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-regal-navy-700 underline underline-offset-2 hover:text-regal-navy-900 transition-colors"
                          >
                            Open an issue
                          </a>{' '}
                          on GitHub for the fastest response.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-regal-navy-100" />

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-regal-navy-500">
                        <MailIcon />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-regal-navy-800">
                          Response time
                        </p>
                        <p className="text-sm text-regal-navy-500 mt-0.5">
                          We aim to reply within 1–2 business days.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-regal-navy-100" />

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-regal-navy-500">
                        <SecureIcon />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-regal-navy-800">
                          Your privacy matters
                        </p>
                        <p className="text-sm text-regal-navy-500 mt-0.5">
                          We'll only use your contact details to respond to your
                          message. We never share your information with third
                          parties.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-regal-navy-100 bg-regal-navy-50/70 p-4">
                  <div className="flex gap-2.5 items-start">
                    <GitHubIcon />
                    <p className="text-sm text-regal-navy-600">
                      YouFoundMyBag is open source.{' '}
                      <a
                        href="https://github.com/johnqherman/YouFoundMyBag.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-regal-navy-800 font-medium underline underline-offset-2 hover:text-regal-navy-900 transition-colors"
                      >
                        View the source on GitHub.
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
