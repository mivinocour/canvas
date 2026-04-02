import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      to,
      inviterName,
      spaceName,
      invitationLink,
      role
    } = req.body;

    if (!to || !inviterName || !spaceName || !invitationLink) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const subject = `${inviterName} invited you to collaborate on ${spaceName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're Invited!</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">You're Invited! 🎉</h1>
          </div>

          <div style="background: #f8fafc; padding: 25px; border-radius: 10px; border-left: 4px solid #667eea; margin-bottom: 25px;">
            <p style="margin: 0; font-size: 18px; color: #374151;">
              <strong>${inviterName}</strong> has invited you to collaborate on
              <strong style="color: #667eea;">${spaceName}</strong>
            </p>
          </div>

          <div style="background: white; padding: 25px; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 25px;">
            <h3 style="margin-top: 0; color: #374151;">Your Role:</h3>
            <div style="display: inline-block; background: ${role === 'editor' ? '#10b981' : '#3b82f6'}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; text-transform: capitalize;">
              ${role}
            </div>
            <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
              ${role === 'editor' ? '• Can view and edit widgets' : '• Can view widgets (read-only)'}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}"
               style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.3s;">
              Accept Invitation →
            </a>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h4 style="margin-top: 0; color: #374151;">What happens next?</h4>
            <ul style="color: #6b7280; padding-left: 20px;">
              <li>Click the button above to accept the invitation</li>
              <li>Sign in or create an account if you don't have one</li>
              <li>Start collaborating on shared widgets!</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">
              This invitation was sent by ${inviterName}. If you weren't expecting this email, you can safely ignore it.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
              <a href="${invitationLink}" style="color: #667eea; text-decoration: none;">
                ${invitationLink}
              </a>
            </p>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Canvas <invitations@resend.dev>', // Will need to change this to your verified domain
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      success: true,
      messageId: data.id,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      error: 'Failed to send invitation email',
      details: error.message
    });
  }
}