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

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms of Service - YouFoundMyBag.com</title>
        <meta
          name="description"
          content="Terms of Service for YouFoundMyBag.com, the privacy-first QR code luggage tag service."
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
              Terms of Service
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
            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or using YouFoundMyBag.com (the "Service"), you
                agree to be bound by these Terms of Service. If you do not agree
                to these terms, please do not use the Service.
              </p>
            </Section>

            <Section title="2. Description of Service">
              <p>
                YouFoundMyBag.com provides QR code luggage tags that allow
                finders of lost luggage to anonymously contact the owner. When a
                finder scans a tag, they can initiate an anonymous conversation
                with the bag's owner without either party needing to share
                personal contact information directly.
              </p>
              <p>
                The Service includes owner account management, bag registration,
                finder messaging, and optional paid subscription features.
              </p>
            </Section>

            <Section title="3. User Accounts">
              <p>
                Owners create accounts using a magic link sent to their email
                address. No passwords are required. You are responsible for
                maintaining the security of your email account and for all
                activity that occurs under your YouFoundMyBag account.
              </p>
              <p>
                You agree to provide accurate and current contact information
                and to keep it up to date. Accounts with false or misleading
                information may be suspended.
              </p>
            </Section>

            <Section title="4. Permitted and Prohibited Use">
              <p>You may use the Service to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Register and manage your luggage tags</li>
                <li>Receive notifications when a finder scans your tag</li>
                <li>
                  Communicate anonymously with finders to recover lost bags
                </li>
              </ul>
              <p>You may not use the Service to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Provide false or misleading contact information</li>
                <li>Harass, threaten, or abuse other users or finders</li>
                <li>Send unsolicited commercial messages (spam)</li>
                <li>
                  Attempt to circumvent the anonymous messaging system to
                  collect personal data about finders
                </li>
                <li>
                  Use the Service for any unlawful purpose or in violation of
                  any applicable laws
                </li>
              </ul>
            </Section>

            <Section title="5. Finder Usage">
              <p>
                Finders do not need an account to use the Service. When a finder
                scans a QR code, they may initiate a private conversation with
                the bag owner. If using the private messaging feature, finders
                must provide an email address to receive a secure link to
                continue the conversation. Finder messages and email addresses
                are stored only for the duration of the active retrieval
                conversation.
              </p>
              <p>
                Finders agree not to misuse the messaging system or to provide
                false information about a bag's location or condition.
              </p>
            </Section>

            <Section title="6. Payments and Subscriptions">
              <p>
                Certain features of the Service are available through a paid Pro
                subscription. All payments are processed securely by Stripe. By
                subscribing, you authorize us to charge your payment method on a
                recurring basis according to the plan you select.
              </p>
              <p>
                You may cancel your subscription at any time from your
                dashboard. Cancellation takes effect at the end of the current
                billing period. We do not offer refunds for partial billing
                periods unless required by applicable law.
              </p>
            </Section>

            <Section title="7. Intellectual Property">
              <p>
                YouFoundMyBag.com is open source software licensed under the{' '}
                <a
                  href="https://www.gnu.org/licenses/agpl-3.0.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  GNU Affero General Public License v3.0 (AGPL-3.0)
                </a>
                . The source code is available on{' '}
                <a
                  href="https://github.com/johnqherman/YouFoundMyBag.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link"
                >
                  GitHub
                </a>
                .
              </p>
              <p>
                The YouFoundMyBag name, logo, and service identity are retained
                by the service operator. Your use of the Service does not grant
                you any rights to these marks.
              </p>
            </Section>

            <Section title="8. Disclaimers and Limitation of Liability">
              <p>
                The Service is provided "as is" without warranties of any kind,
                express or implied. We do not guarantee that the Service will be
                uninterrupted, error-free, or that lost items will be recovered.
              </p>
              <p>
                To the maximum extent permitted by law, YouFoundMyBag.com and
                its operators shall not be liable for any indirect, incidental,
                special, or consequential damages arising from your use of the
                Service, including but not limited to loss of luggage or
                personal belongings.
              </p>
            </Section>

            <Section title="9. Changes to Terms">
              <p>
                We may update these Terms of Service from time to time. We will
                notify registered users of material changes by email. Continued
                use of the Service after changes take effect constitutes
                acceptance of the updated terms.
              </p>
            </Section>

            <Section title="10. Contact">
              <p>
                If you have questions about these Terms of Service, please{' '}
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
