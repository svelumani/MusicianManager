import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key if available
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Function to check if SendGrid is configured
export function isSendGridConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

// Interface for email parameters
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

// Send a single email
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!isSendGridConfigured()) {
    console.warn('SendGrid API key not configured. Email not sent.');
    return false;
  }

  try {
    await sgMail.send({
      to: params.to,
      from: params.from, // This should be a verified sender in SendGrid
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Send musician assignment notification email
export async function sendMusicianAssignmentEmail(
  musicianEmail: string,
  musicianName: string,
  plannerMonth: string,
  assignments: any[],
  emailMessage: string,
  fromEmail: string = 'notifications@vamp-music.com'
): Promise<boolean> {
  if (!isSendGridConfigured()) {
    console.warn('SendGrid API key not configured. Assignment email not sent.');
    return false;
  }

  // Create HTML content for assignments
  const assignmentsHtml = assignments.map(assignment => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${assignment.date}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${assignment.venueName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${assignment.startTime} - ${assignment.endTime}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${assignment.fee}</td>
    </tr>
  `).join('');

  // Create text content for assignments
  const assignmentsText = assignments.map(assignment => 
    `Date: ${assignment.date}, Venue: ${assignment.venueName}, Time: ${assignment.startTime} - ${assignment.endTime}, Fee: $${assignment.fee}`
  ).join('\n');

  const totalFee = assignments.reduce((sum, assignment) => sum + assignment.fee, 0);

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #2c5282; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f9fafb; text-align: left; padding: 8px; border: 1px solid #ddd; }
          .total { font-weight: bold; margin-top: 10px; }
          .message { margin-bottom: 20px; white-space: pre-line; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>VAMP Monthly Assignments - ${plannerMonth}</h1>
          <p>Hello ${musicianName},</p>
          <div class="message">${emailMessage}</div>
          <h2>Your Scheduled Performances</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Venue</th>
                <th>Time</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              ${assignmentsHtml}
            </tbody>
          </table>
          <p class="total">Total Fee: $${totalFee}</p>
          <p>
            Please confirm your availability by replying to this email.
            If you have any questions or need to make changes, please contact us as soon as possible.
          </p>
          <p>Thank you,<br>The VAMP Team</p>
        </div>
      </body>
    </html>
  `;

  const text = `
    VAMP Monthly Assignments - ${plannerMonth}
    
    Hello ${musicianName},
    
    ${emailMessage}
    
    Your Scheduled Performances:
    ${assignmentsText}
    
    Total Fee: $${totalFee}
    
    Please confirm your availability by replying to this email.
    If you have any questions or need to make changes, please contact us as soon as possible.
    
    Thank you,
    The VAMP Team
  `;

  return sendEmail({
    to: musicianEmail,
    from: fromEmail,
    subject: `VAMP Assignments for ${plannerMonth}`,
    html,
    text
  });
}