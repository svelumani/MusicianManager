import { MailService } from '@sendgrid/mail';
import { getEmailSettings, isEmailEnabled, getEmailSenderInfo } from './settings';

// Initialize SendGrid mail service
const mailService = new MailService();

/**
 * Initialize the SendGrid API with the API key from settings
 * @returns True if successfully initialized, false otherwise
 */
async function initializeSendGrid() {
  const settings = await getEmailSettings() as { apiKey?: string } | null;
  if (!settings || !settings.apiKey) {
    console.error('SendGrid API key not found in settings');
    return false;
  }
  
  try {
    mailService.setApiKey(settings.apiKey);
    return true;
  } catch (error) {
    console.error('Error initializing SendGrid:', error);
    return false;
  }
}

/**
 * Send an email
 * @param to Recipient email or list of emails
 * @param subject Email subject
 * @param content Email content
 * @param isHtml Whether the content is HTML (default: true)
 * @returns True if email sent successfully, false otherwise
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  content: string,
  isHtml: boolean = true
): Promise<boolean> {
  // Check if email is enabled
  const enabled = await isEmailEnabled();
  if (!enabled) {
    console.log('Email is disabled in settings. Not sending email.');
    return false;
  }
  
  // Initialize SendGrid if needed
  const initialized = await initializeSendGrid();
  if (!initialized) {
    return false;
  }
  
  // Get sender information
  const { from, replyTo } = await getEmailSenderInfo();
  if (!from) {
    console.error('Sender email not found in settings');
    return false;
  }
  
  try {
    // Prepare email
    const msg: any = {
      to,
      from,
      subject,
      replyTo: replyTo || undefined,
    };
    
    // Set content based on format
    if (isHtml) {
      msg.html = content;
    } else {
      msg.text = content;
    }
    
    // Send email
    await mailService.send(msg);
    console.log(`Email sent to ${Array.isArray(to) ? to.join(', ') : to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send a musician assignment notification email
 * @param musicianEmail Musician's email address
 * @param musicianName Musician's name
 * @param assignmentDetails Assignment details array
 * @returns True if email sent successfully, false otherwise
 */
export async function sendMusicianAssignmentEmail(
  musicianEmail: string,
  musicianName: string,
  assignmentDetails: {
    date: string;
    venue: string;
    startTime: string;
    endTime: string;
    fee: number;
  }[]
): Promise<boolean> {
  if (!assignmentDetails || assignmentDetails.length === 0) {
    console.error('No assignment details provided for email');
    return false;
  }
  
  const subject = 'Your Music Performance Schedule';
  
  // Generate HTML content
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #2c5282; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background-color: #f7fafc; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Your Performance Schedule</h1>
          <p>Hello ${musicianName},</p>
          <p>We are pleased to confirm your upcoming performance(s) as follows:</p>
          
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
              ${assignmentDetails.map(detail => `
                <tr>
                  <td>${detail.date}</td>
                  <td>${detail.venue}</td>
                  <td>${detail.startTime} - ${detail.endTime}</td>
                  <td>$${detail.fee.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p>Please confirm your availability for these assignments by replying to this email.</p>
          <p>If you have any questions or need to make any changes, please contact us immediately.</p>
          
          <p>Thank you for being part of our music program!</p>
          
          <div class="footer">
            <p>This is an automated message from the VAMP Musician Management Platform.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return sendEmail(musicianEmail, subject, htmlContent, true);
}