import type { EmailMessage } from './email.service.js';

function layout(heading: string, paragraph: string, actionLabel: string, actionUrl: string): string {
  return `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
    <p style="font-weight:700;color:#4f46e5;letter-spacing:.05em;margin:0 0 16px">CAMPUSKONNECT</p>
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px">${heading}</h1>
    <p style="color:#334155;line-height:1.5">${paragraph}</p>
    <p style="margin:24px 0"><a href="${actionUrl}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${actionLabel}</a></p>
    <p style="color:#64748b;font-size:12px">If the button doesn't work, paste this link into your browser:<br>${actionUrl}</p>
  </div>
</body></html>`;
}

export function verificationEmail(to: string, name: string, url: string): EmailMessage {
  return {
    to,
    subject: 'Verify your CampusKonnect account',
    text: `Hi ${name}, verify your CampusKonnect account: ${url}`,
    html: layout(
      `Welcome, ${name}!`,
      'Confirm your college email to join your campus marketplace and community. This link expires in 24 hours.',
      'Verify email',
      url,
    ),
  };
}

export function passwordResetEmail(to: string, name: string, url: string): EmailMessage {
  return {
    to,
    subject: 'Reset your CampusKonnect password',
    text: `Hi ${name}, reset your CampusKonnect password: ${url} (expires in 1 hour)`,
    html: layout(
      'Reset your password',
      "We received a request to reset your password. This link expires in 1 hour. If you didn't ask for this, you can ignore this email.",
      'Reset password',
      url,
    ),
  };
}
