import nodemailer from "nodemailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Shared Dark-Mode Emerald HTML Layout
 */
function wrapEmailLayout(title: string, bodyHtml: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F4F4F5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090B;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#121215;border:1px solid #27272A;border-radius:20px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #27272A;">
              <span style="display:inline-block;padding:6px 12px;border-radius:10px;background-color:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#34D399;font-weight:700;font-size:14px;letter-spacing:-0.02em;">
                ◉ Music Player
              </span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #27272A;background-color:#0C0C0E;font-size:12px;color:#71717A;line-height:1.6;">
              <p style="margin:0 0 8px 0;">
                © ${new Date().getFullYear()} Music Player. All rights reserved.
              </p>
              <p style="margin:0;">
                <a href="${APP_URL}/terms" style="color:#10B981;text-decoration:none;">Terms of Service</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}/privacy" style="color:#10B981;text-decoration:none;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 1. "Welcome Aboard" — Triggered on Account Creation (/api/auth/create)
 */
export async function sendWelcomeEmail(toEmail: string, username: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const subject = "Welcome Aboard to Music Player! 🎵";
  const html = wrapEmailLayout(
    subject,
    `
      <p style="margin:0 0 8px 0;font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#34D399;">
        Welcome Aboard
      </p>
      <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#FFFFFF;">
        Hey ${username}, your studio is ready!
      </h1>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#A1A1AA;">
        Thanks for joining <strong style="color:#F4F4F5;">Music Player</strong>. You can now curate up to 25 songs per album, upload tracks via URL or MP3, and share your albums anywhere using a unique UUID.
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background-color:#09090B;border:1px solid #27272A;border-radius:14px;padding:18px;">
        <tr>
          <td style="font-size:13px;color:#D4D4D8;line-height:1.7;">
            <strong style="color:#34D399;">Quick Start:</strong><br/>
            1. Search our server catalog or add songs via URL / MP3.<br/>
            2. Build your tracklist (up to 25 songs) and set it to Public or Private.<br/>
            3. Copy your Album UUID to share with friends or encode onto an NFC disc.
          </td>
        </tr>
      </table>

      <div style="margin:28px 0 8px 0;">
        <a href="${APP_URL}/create-album" style="display:inline-block;padding:12px 24px;background-color:#10B981;color:#09090B;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;">
          Create Your First Album →
        </a>
      </div>
    `,
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    html,
  });
}

/**
 * 2. "Account Details Updated" — Triggered on Account Update (/api/auth/update)
 */
export async function sendAccountUpdatedEmail(
  toEmail: string,
  username: string,
  updatedFields: string[],
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const formattedFields = updatedFields
    .map((f) => f.charAt(0).toUpperCase() + f.slice(1))
    .join(", ");

  const subject = "Security Alert: Your Music Player Account Was Updated";
  const html = wrapEmailLayout(
    subject,
    `
      <p style="margin:0 0 8px 0;font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#34D399;">
        Security Notice
      </p>
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:800;color:#FFFFFF;">
        Your account details were updated
      </h1>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#A1A1AA;">
        Hi <strong style="color:#F4F4F5;">${username}</strong>, this is a confirmation that the following settings on your Music Player account were recently changed:
      </p>

      <div style="margin:20px 0;padding:16px;background-color:#09090B;border:1px solid #27272A;border-radius:12px;font-family:monospace;font-size:13px;color:#34D399;">
        Updated: ${formattedFields}
      </div>

      <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;color:#A1A1AA;">
        If you made this change, no further action is needed. If you did not authorize this update, please reset your password immediately.
      </p>

      <a href="${APP_URL}/reset-password" style="display:inline-block;padding:11px 20px;background-color:#27272A;color:#F4F4F5;font-weight:600;font-size:13px;text-decoration:none;border-radius:10px;">
        Reset Password
      </a>
    `,
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    html,
  });
}

/**
 * 3. "Sorry to See You Go" — Triggered on Account Deletion (/api/auth/delete)
 */
export async function sendAccountDeletedEmail(
  toEmail: string,
  username: string,
  deletedAlbums: boolean,
) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const subject = "Sorry to see you go — Music Player Account Deleted";
  const html = wrapEmailLayout(
    subject,
    `
      <p style="margin:0 0 8px 0;font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#F87171;">
        Account Closed
      </p>
      <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#FFFFFF;">
        Sorry to see you go, ${username}
      </h1>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#A1A1AA;">
        Your <strong style="color:#F4F4F5;">Music Player</strong> account (${toEmail}) has been permanently deleted as requested.
      </p>

      <div style="margin:20px 0;padding:16px;background-color:#09090B;border:1px solid #27272A;border-radius:12px;font-size:13px;color:#D4D4D8;line-height:1.6;">
        <strong style="color:#FFFFFF;">Album Status:</strong><br/>
        ${
          deletedAlbums
            ? "As requested, all of the albums and UUIDs you created have also been permanently removed from our database."
            : "Per your selection, the albums you created were left behind so existing UUID links and NFC tags can continue playing them."
        }
      </div>

      <p style="margin:0;font-size:13px;line-height:1.6;color:#A1A1AA;">
        Thank you for being part of Music Player. You are always welcome to create a new account anytime in the future.
      </p>
    `,
  );

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    html,
  });
}
