import sgMail from '@sendgrid/mail';
import { getSettings } from './settings';

/**
 * Interface for musician assignment
 */
interface MusicianAssignment {
  date: string;
  venue: string;
  startTime: string;
  endTime: string;
  fee: number;
}

/**
 * Initialize SendGrid with the API key
 * @param apiKey The SendGrid API key
 */
export function initializeSendGrid(apiKey: string): void {
  if (!apiKey) {
    console.warn('SendGrid API key is not provided');
    return;
  }
  
  try {
    sgMail.setApiKey(apiKey);
  } catch (error) {
    console.error('Error initializing SendGrid:', error);
  }
}

/**
 * Check if SendGrid is configured
 * @returns True if SendGrid is configured, false otherwise
 */
export async function isSendGridConfigured(): Promise<boolean> {
  try {
    const emailSettings = await getSettings('email') as any;
    return !!(emailSettings?.data?.enabled && emailSettings?.data?.apiKey && emailSettings?.data?.from);
  } catch (error) {
    console.error('Error checking SendGrid configuration:', error);
    return false;
  }
}

/**
 * Format a list of assignments to HTML
 * @param assignments List of musician assignments
 * @returns Formatted HTML string
 */
function formatAssignmentsToHtml(assignments: MusicianAssignment[]): string {
  if (!assignments || assignments.length === 0) {
    return '<p>No assignments scheduled.</p>';
  }

  let tableHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Venue</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Time</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Fee</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalFee = 0;
  assignments.forEach((assignment) => {
    tableHtml += `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${assignment.date}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${assignment.venue}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${assignment.startTime} - ${assignment.endTime}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${assignment.fee.toFixed(2)}</td>
      </tr>
    `;
    totalFee += assignment.fee;
  });

  tableHtml += `
      <tr style="background-color: #f2f2f2; font-weight: bold;">
        <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total:</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${totalFee.toFixed(2)}</td>
      </tr>
      </tbody>
    </table>
  `;

  return tableHtml;
}

/**
 * Format a list of assignments to plain text
 * @param assignments List of musician assignments
 * @returns Formatted plain text string
 */
function formatAssignmentsToText(assignments: MusicianAssignment[]): string {
  if (!assignments || assignments.length === 0) {
    return 'No assignments scheduled.';
  }

  let text = 'Your Monthly Assignments:\n\n';
  let totalFee = 0;

  assignments.forEach((assignment) => {
    text += `Date: ${assignment.date}\n`;
    text += `Venue: ${assignment.venue}\n`;
    text += `Time: ${assignment.startTime} - ${assignment.endTime}\n`;
    text += `Fee: $${assignment.fee.toFixed(2)}\n\n`;
    totalFee += assignment.fee;
  });

  text += `Total Fee: $${totalFee.toFixed(2)}\n`;
  return text;
}

/**
 * Send an email with musician assignments
 * @param to Email recipient
 * @param musicianName Name of the musician
 * @param assignments List of assignments
 * @returns True if email sent successfully, false otherwise
 */
export async function sendMusicianAssignmentEmail(
  to: string,
  musicianName: string,
  assignments: MusicianAssignment[]
): Promise<boolean> {
  try {
    // Check if SendGrid is configured
    const emailSettings = await getSettings('email');
    if (!emailSettings?.data?.enabled || !emailSettings?.data?.apiKey || !emailSettings?.data?.from) {
      console.error('SendGrid is not properly configured');
      return false;
    }

    // Set API key
    initializeSendGrid(emailSettings.data.apiKey);

    // Prepare email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Your Monthly Performance Schedule</h2>
        
        <p>Dear ${musicianName},</p>
        
        <p>We are pleased to confirm your upcoming performances for this month. Please review the details below:</p>
        
        ${formatAssignmentsToHtml(assignments)}
        
        <p>If you have any questions or need to make changes, please contact us as soon as possible.</p>
        
        <p>Thank you for your continued collaboration!</p>
        
        <p>Best regards,<br>VAMP Management Team</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    `;

    const textContent = `
Dear ${musicianName},

We are pleased to confirm your upcoming performances for this month. Please review the details below:

${formatAssignmentsToText(assignments)}

If you have any questions or need to make changes, please contact us as soon as possible.

Thank you for your continued collaboration!

Best regards,
VAMP Management Team

This is an automated email. Please do not reply directly to this message.
    `;

    // Send email
    const msg = {
      to,
      from: emailSettings.data.from,
      subject: 'Your Monthly Performance Schedule',
      text: textContent,
      html: htmlContent,
    };

    // Add reply-to if configured
    if (emailSettings.data.replyTo) {
      msg['replyTo'] = emailSettings.data.replyTo;
    }

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending musician assignment email:', error);
    return false;
  }
}

/**
 * Send a batch of emails to multiple musicians
 * @param assignments Map of musician data to assignments
 * @returns Number of successfully sent emails
 */
export async function sendBatchAssignmentEmails(
  assignments: Map<{ id: number; name: string; email: string }, MusicianAssignment[]>
): Promise<number> {
  let successCount = 0;

  for (const [musician, musicianAssignments] of assignments.entries()) {
    if (!musician.email) {
      console.warn(`No email address found for musician ${musician.name} (ID: ${musician.id})`);
      continue;
    }

    const success = await sendMusicianAssignmentEmail(
      musician.email,
      musician.name,
      musicianAssignments
    );

    if (success) {
      successCount++;
    }
  }

  return successCount;
}