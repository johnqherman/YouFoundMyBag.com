import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CURRENT_TERMS_VERSION } from '../constants/legalConstants.js';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-regal-navy-900 mb-3">
        {title}
      </h2>
      <div className="text-regal-navy-600 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - YouFoundMyBag.com</title>
        <meta
          name="description"
          content="Privacy Policy for YouFoundMyBag.com. We don't track you, sell your data, or use advertising. Your privacy is our default."
        />
      </Helmet>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-regal-navy-100/60 to-regal-navy-50/0 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 sm:pb-14 text-center">
          <div className="animate-slideUp">
            <p className="text-sm font-medium tracking-widest uppercase text-regal-navy-500 mb-5">
              Legal
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-regal-navy-900 leading-[1.1] tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-5 text-lg text-regal-navy-600 max-w-2xl mx-auto leading-relaxed">
              Last updated: {CURRENT_TERMS_VERSION}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-regal-navy-200/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="animate-slideUp space-y-10">
            <Section title="1. Overview">
              <p>
                YouFoundMyBag.com is built on a privacy-first foundation. We do
                not track your browsing behavior, sell your data, or use
                advertising. We collect only the information necessary to
                operate the Service, and nothing more.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>
                <strong className="text-regal-navy-800">Bag owners</strong> must
                provide an email address to create an account. You may
                optionally add additional contact channels (such as phone,
                WhatsApp, Telegram, Signal, Instagram, or a secondary email) to
                make it easier for finders to reach you. This information is
                stored securely and is only surfaced to finders in the context
                of an active bag retrieval.
              </p>
              <p>
                <strong className="text-regal-navy-800">Finders</strong> do not
                need an account. If a finder uses the private messaging feature,
                they must provide an email address so we can send them a secure
                link to continue the conversation. This email is stored only for
                the duration of the active retrieval conversation. Finders may
                optionally provide a display name.
              </p>
              <p>
                <strong className="text-regal-navy-800">Payments</strong> are
                handled entirely by Stripe. We never receive or store your card
                number, CVV, or full payment details. Stripe may store payment
                information in accordance with their own{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  Facilitate the return of lost bags by connecting finders with
                  owners
                </li>
                <li>
                  Send transactional email notifications (e.g., when a finder
                  scans your tag)
                </li>
                <li>Process subscription billing through Stripe</li>
                <li>
                  Respond to support requests submitted via the contact form
                </li>
              </ul>
              <p>
                We do not use your information for marketing, profiling, or any
                purpose beyond operating the Service.
              </p>
            </Section>

            <Section title="4. Data Storage and Security">
              <p>
                Your data is stored in a PostgreSQL database. All data is
                transmitted over TLS (HTTPS). Finder-to-owner messaging uses
                end-to-end encrypted transport.
              </p>
              <p>
                We follow industry-standard security practices and regularly
                review our infrastructure for vulnerabilities.
              </p>
            </Section>

            <Section title="5. Third-Party Services">
              <p>We use the following third-party services:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong className="text-regal-navy-800">Stripe</strong> for
                  payment processing and subscription management
                </li>
                <li>
                  <strong className="text-regal-navy-800">Mailgun</strong> for
                  transactional email delivery (tag scan notifications, magic
                  links)
                </li>
              </ul>
              <p>
                These services may process data in accordance with their own
                privacy policies. We do not use analytics platforms, advertising
                networks, or social media tracking.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                Account and bag data is retained until you delete your account.
                You can delete your account and associated data from your
                dashboard at any time.
              </p>
              <p>
                Conversation data (finder messages) is retained per your
                settings as an owner. You may configure retention preferences in
                your dashboard.
              </p>
            </Section>

            <Section title="7. Your Rights">
              <p>
                You have the right to access, correct, or delete your personal
                data. To exercise these rights, please{' '}
                <Link to="/contact" className="link">
                  contact us
                </Link>{' '}
                and we will respond within a reasonable time.
              </p>
              <p>
                If you are located in the European Economic Area or the United
                Kingdom, you may also have rights under the GDPR or UK GDPR,
                including the right to data portability and the right to lodge a
                complaint with a supervisory authority.
              </p>
            </Section>

            <Section title="8. Cookies">
              <p>
                We use only session cookies necessary for authentication and
                security. We do not use tracking cookies, advertising cookies,
                or analytics cookies of any kind. No third-party cookies are set
                by YouFoundMyBag.com.
              </p>
            </Section>

            <Section title="9. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. We will
                notify registered users of material changes by email. The date
                at the top of this page reflects when the policy was last
                updated.
              </p>
            </Section>

            <Section title="10. Contact">
              <p>
                If you have questions or concerns about this Privacy Policy or
                how your data is handled, please{' '}
                <Link to="/contact" className="link">
                  contact us
                </Link>
                .
              </p>
            </Section>
          </div>
        </div>
      </section>
    </>
  );
}
