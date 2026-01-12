import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

interface SMTPTLSConfig {
  rejectUnauthorized?: boolean;
  minVersion?: string;
}

interface SMTPTransportConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
  requireTLS?: boolean;
  tls?: SMTPTLSConfig;
}

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (!transporter && config.SMTP_HOST) {
    const needsAuth = config.SMTP_HOST !== 'localhost';
    const isSecure =
      config.NODE_ENV === 'development' ? false : config.SMTP_SECURE;

    if (!needsAuth || (config.SMTP_USER && config.SMTP_PASS)) {
      const transportConfig: SMTPTransportConfig = {
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: isSecure,
      };

      if (needsAuth) {
        transportConfig.auth = {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        };
      }

      if (config.NODE_ENV !== 'development') {
        if (!config.SMTP_SECURE && config.SMTP_REQUIRE_TLS) {
          transportConfig.requireTLS = true;
          transportConfig.tls = {
            rejectUnauthorized: config.SMTP_REJECT_UNAUTHORIZED,
            minVersion: 'TLSv1.2',
          };
        } else if (config.SMTP_SECURE) {
          transportConfig.tls = {
            rejectUnauthorized: config.SMTP_REJECT_UNAUTHORIZED,
            minVersion: 'TLSv1.2',
          };
        }
      }

      transporter = nodemailer.createTransport(
        transportConfig as nodemailer.TransportOptions
      );

      if (config.NODE_ENV === 'development') {
        logger.debug(
          `SMTP configured: ${config.SMTP_HOST}:${config.SMTP_PORT}, secure=${config.SMTP_SECURE}, requireTLS=${config.SMTP_REQUIRE_TLS}`
        );
      }
    }
  }
  return transporter;
}

export function resetTransporter(): void {
  transporter = null;
}
