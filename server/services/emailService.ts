import sgMail from '@sendgrid/mail';
import { EmailTemplate } from '../../shared/schema';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY environment variable is not set. Email sending will not work.');
}

interface EmailData {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html: string;
}

interface ContractEmailParams {
  musicianName: string;
  musicianEmail: string;
  senderName: string;
  senderEmail: string;
  contractId: number;
  responseUrl: string;
  month: string;
  year: number;
  totalAmount?: number;
  performances?: {
    date: string;
    venue: string;
    startTime: string;
    fee: number;
  }[];
}

/**
 * Sends an email using SendGrid
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Cannot send email: SENDGRID_API_KEY is not set');
    return false;
  }

  try {
    await sgMail.send(emailData);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Sends a contract email to a musician
 */
export async function sendContractEmail(params: ContractEmailParams, template?: EmailTemplate): Promise<boolean> {
  // Prepare the email content
  const contractLink = `${params.responseUrl}?id=${params.contractId}&token=TOKEN_PLACEHOLDER`;
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Default template if none provided
  const defaultHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Performance Contract: ${params.month} ${params.year}</h2>
      
      <p>Hello ${params.musicianName},</p>
      
      <p>You have been scheduled to perform in ${params.month} ${params.year}. Please review and sign your contract using the link below.</p>
      
      ${params.performances && params.performances.length > 0 ? `
        <div style="margin: 20px 0; border: 1px solid #eaeaea; border-radius: 3px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eaeaea;">Date</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eaeaea;">Venue</th>
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #eaeaea;">Time</th>
                <th style="padding: 10px; text-align: right; border-bottom: 1px solid #eaeaea;">Fee</th>
              </tr>
            </thead>
            <tbody>
              ${params.performances.map(performance => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eaeaea;">${performance.date}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eaeaea;">${performance.venue}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eaeaea;">${performance.startTime}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eaeaea;">${formatCurrency(performance.fee)}</td>
                </tr>
              `).join('')}
            </tbody>
            ${params.totalAmount ? `
              <tfoot>
                <tr style="background-color: #f8f9fa;">
                  <td colspan="3" style="padding: 10px; font-weight: bold;">Total</td>
                  <td style="padding: 10px; text-align: right; font-weight: bold;">${formatCurrency(params.totalAmount)}</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      ` : ''}
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${contractLink}" style="display: inline-block; background-color: #4a90e2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View and Sign Contract</a>
      </div>
      
      <p>If you have any questions, please contact ${params.senderName} at ${params.senderEmail}.</p>
      
      <p>Thank you,<br>
      ${params.senderName}</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #666; text-align: center;">
        This email was sent by the Musician Management Platform.
      </div>
    </div>
  `;

  // Use the provided template or default
  const html = template?.html || defaultHtml;
  
  // Email data
  const emailData: EmailData = {
    to: params.musicianEmail,
    from: params.senderEmail,
    subject: `Performance Contract for ${params.month} ${params.year}`,
    html: html,
    text: `Hello ${params.musicianName}, You have been scheduled to perform in ${params.month} ${params.year}. Please review and sign your contract: ${contractLink}`
  };

  return await sendEmail(emailData);
}

/**
 * Sends a contract status update email to the admin
 */
export async function sendContractStatusUpdateEmail(
  adminEmail: string, 
  musicianName: string, 
  contractId: number, 
  status: 'signed' | 'rejected', 
  comments?: string
): Promise<boolean> {
  const emailData: EmailData = {
    to: adminEmail,
    from: adminEmail, // Can be changed to a no-reply address
    subject: `Contract #${contractId} ${status === 'signed' ? 'Signed' : 'Rejected'} by ${musicianName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: ${status === 'signed' ? '#2e7d32' : '#d32f2f'}; text-align: center; margin-bottom: 20px;">
          Contract ${status === 'signed' ? 'Signed' : 'Rejected'}
        </h2>
        
        <p>Hello,</p>
        
        <p>
          This is an automatic notification that <strong>${musicianName}</strong> has 
          <strong>${status === 'signed' ? 'signed' : 'rejected'}</strong> contract #${contractId}.
        </p>
        
        ${comments ? `
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            <strong>Comments:</strong>
            <p style="margin-top: 5px;">${comments}</p>
          </div>
        ` : ''}
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="/contracts/${contractId}" style="display: inline-block; background-color: #4a90e2; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Contract Details
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; font-size: 12px; color: #666; text-align: center;">
          This email was sent by the Musician Management Platform.
        </div>
      </div>
    `
  };

  return await sendEmail(emailData);
}

export default {
  sendEmail,
  sendContractEmail,
  sendContractStatusUpdateEmail
};