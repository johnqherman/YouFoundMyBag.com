<p align="center">
  <img src="src/client/public/apple-touch-icon.png" alt="YouFoundMyBag Logo" width="120" />
</p>

<h1 align="center">YouFoundMyBag.com</h1>

<p align="center">
  <strong>Privacy-first return tags that let finders contact you directly or anonymously, on your terms.</strong>
</p>

<p align="center">
  <a href="https://github.com/johnqherman/YouFoundMyBag.com/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" />
  </a>
  <a href="https://github.com/johnqherman/YouFoundMyBag.com/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/johnqherman/YouFoundMyBag.com/deploy.yml?branch=master" alt="Build Status" />
  </a>
  <img src="https://img.shields.io/badge/version-1.0.0-green.svg" alt="Version" />
</p>

---

<p align="center">
  <img src="https://static.raccoonlagoon.com/images/yfmb/screenshot.png" alt="YouFoundMyBag Demo" width="75%" />
</p>

## Features

- **QR Code Tags** - Unique, scannable codes for your belongings
- **Privacy-First** - Personal info stays hidden unless you choose to share
- **Flexible Contact** - Finders can reach you via SMS, WhatsApp, Email, Telegram, Signal, Instagram, and more
- **Secure Messaging** - End-to-end encrypted conversations
- **Magic Link Login** - No passwords, just your email
- **Owner Dashboard** - Manage items, conversations, and settings
- **Email Alerts** - Notifications when items are found
- **Bag Management** - Rotate IDs, rename, disable, or delete anytime
- **Abuse Protection** - Rate limiting & CAPTCHA
- **GDPR-Friendly** - Hashed emails and encrypted storage

## FAQ

<details>
<summary><strong>Is my personal information safe?</strong></summary>

Yes. Your email is hashed using HMAC-SHA256 and never stored in plaintext. Messages are encrypted with AES-256-GCM. Finders only see what you explicitly choose to share.

</details>

<details>
<summary><strong>Do I need to create an account?</strong></summary>

No traditional account needed. We use magic links - just enter your email and click the link we send. No passwords to remember.

</details>

<details>
<summary><strong>Can I have multiple bags?</strong></summary>

Yes. The free tier supports 1 active bag; Pro supports up to 10.

</details>

<details>
<summary><strong>What if someone abuses the system?</strong></summary>

We have rate limiting, CAPTCHA protection, and the ability to disable bags or block conversations. You stay in control.

</details>

<details>
<summary><strong>Is this free?</strong></summary>

YouFoundMyBag has a free tier (1 bag, core features) and a Pro plan at $5/month or $45/year (up to 10 bags, custom QR colors, no branding). Sign up at [youfoundmybag.com](https://youfoundmybag.com/pricing).

</details>

## Acknowledgements

- [Tailwind CSS](https://tailwindcss.com/) for the utility-first styling
- [BullMQ](https://docs.bullmq.io/) for reliable background job processing
- [Mailgun](https://www.mailgun.com/) for transactional email delivery
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) for styled QR code generation
- All the open-source contributors who make projects like this possible

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

You may use, modify, and distribute this software, but running a modified version on a server requires making the source code available to its users. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤ for privacy and lost belongings everywhere.
  <br />
  <a href="https://youfoundmybag.com">Website</a> •
  <a href="https://github.com/johnqherman/YouFoundMyBag.com/issues">Report Bug</a> •
  <a href="https://github.com/johnqherman/YouFoundMyBag.com/discussions">Discussions</a>
</p>
