import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Abstraction over the email provider (see ADR-0004). */
export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

export class ResendEmailService implements EmailService {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({ from: this.from, ...message });
    if (error) {
      logger.error({ error, to: message.to }, 'Failed to send email');
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }
}

/** Development/test adapter: logs emails and keeps them in memory for inspection. */
export class ConsoleEmailService implements EmailService {
  readonly outbox: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.outbox.push(message);
    logger.info({ to: message.to, subject: message.subject }, `[email] ${message.text}`);
  }
}

export const emailService: EmailService = env.RESEND_API_KEY
  ? new ResendEmailService(env.RESEND_API_KEY, env.EMAIL_FROM)
  : new ConsoleEmailService();
