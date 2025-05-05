import { Musician, MonthlyContract, PlannerAssignment, PlannerSlot } from '@shared/schema';
import MailService from '@sendgrid/mail';

// Configure SendGrid if API key is present
if (process.env.SENDGRID_API_KEY) {
  MailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY environment variable is not set. Email sending will not work.');
}

const HOST_URL = process.env.HOST_URL || 'http://localhost:5000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@example.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

interface EmailTemplateData {
  musician: Musician;
  contract: MonthlyContract;
  assignments: Array<{
    assignment: PlannerAssignment;
    slot: PlannerSlot;
    venueName: string;
  }>;
  responseUrl: string;
}

/**
 * Sends a contract email to a musician
 * If SendGrid is not configured, logs the email content instead
 */
export async function sendContractEmail(data: EmailTemplateData): Promise<boolean> {
  try {
    const { musician, contract, assignments, responseUrl } = data;
    
    // Format month and year
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[contract.month - 1];
    
    // Create HTML content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3a4f66; border-bottom: 2px solid #eaeaea; padding-bottom: 10px;">
          Performance Contract for ${monthName} ${contract.year}
        </h1>
        
        <p>Hello ${musician.name},</p>
        
        <p>Your contract for performances in ${monthName} ${contract.year} is ready for review. 
        Please review the details below and confirm your availability.</p>
        
        <h2 style="color: #3a4f66; margin-top: 30px;">Performance Details</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Venue</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fee</th>
          </tr>
          ${assignments.map(({ slot, venueName, assignment }) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">
                ${new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                ${slot.startTime} - ${slot.endTime}
              </td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                ${venueName}
              </td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                $${assignment.actualFee || 0}
              </td>
            </tr>
          `).join('')}
          <tr style="background-color: #f2f2f2;">
            <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold;">
              Total:
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">
              $${assignments.reduce((sum, { assignment }) => sum + (assignment.actualFee || 0), 0)}
            </td>
          </tr>
        </table>
        
        ${contract.notes ? `
          <h2 style="color: #3a4f66;">Notes</h2>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #3a4f66; margin-bottom: 20px;">
            ${contract.notes}
          </div>
        ` : ''}
        
        <div style="margin: 30px 0;">
          <a href="${responseUrl}?action=sign" 
             style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: bold;">
            Accept Contract
          </a>
          
          <a href="${responseUrl}?action=reject" 
             style="display: inline-block; background-color: #f44336; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Decline Contract
          </a>
        </div>
        
        <p>
          If you have any questions or need to discuss the details, please reply to this email
          or contact our team directly.
        </p>
        
        <p>Thank you!</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #888; font-size: 12px;">
          <p>
            This contract is pending your acceptance. Your participation in these events is not confirmed
            until you accept the contract. If you decline, please provide a reason so we can make alternative arrangements.
          </p>
        </div>
      </div>
    `;
    
    // Create plain text version
    const text = `
Performance Contract for ${monthName} ${contract.year}

Hello ${musician.name},

Your contract for performances in ${monthName} ${contract.year} is ready for review. 
Please review the details below and confirm your availability.

Performance Details:
${assignments.map(({ slot, venueName, assignment }) => `
  * ${new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
    ${slot.startTime} - ${slot.endTime}
    Venue: ${venueName}
    Fee: $${assignment.actualFee || 0}
`).join('')}

Total: $${assignments.reduce((sum, { assignment }) => sum + (assignment.actualFee || 0), 0)}

${contract.notes ? `Notes: ${contract.notes}` : ''}

To respond to this contract, please visit: ${responseUrl}

Thank you!

This contract is pending your acceptance. Your participation in these events is not confirmed until you accept the contract.
    `;
    
    // If SendGrid is not configured, just log the email and return success
    if (!process.env.SENDGRID_API_KEY) {
      console.log('[MOCK EMAIL] Would have sent contract email:');
      console.log(`To: ${musician.email}`);
      console.log(`Subject: [Music Contract] ${monthName} ${contract.year} Performance Schedule`);
      console.log('Content:', text.substring(0, 200) + '...');
      return true;
    }
    
    // Otherwise send the actual email
    await MailService.send({
      to: musician.email,
      from: FROM_EMAIL,
      subject: `[Music Contract] ${monthName} ${contract.year} Performance Schedule`,
      text,
      html
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send contract email:', error);
    return false;
  }
}

/**
 * Sends a notification email when a musician responds to a contract
 * If SendGrid is not configured, logs the notification instead
 */
export async function sendContractResponseNotification(
  contract: MonthlyContract,
  musician: Musician,
  action: 'accept' | 'reject',
  notes?: string
): Promise<boolean> {
  try {
    // Format month and year
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[contract.month - 1];
    
    const contractUrl = `${HOST_URL}/monthly-contracts/${contract.id}`;
    
    // Create HTML content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3a4f66; border-bottom: 2px solid #eaeaea; padding-bottom: 10px;">
          Contract Response Notification
        </h1>
        
        <p>A musician has responded to a contract.</p>
        
        <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <p><strong>Contract:</strong> ${monthName} ${contract.year}</p>
          <p><strong>Musician:</strong> ${musician.name} (${musician.email})</p>
          <p><strong>Response:</strong> 
            <span style="color: ${action === 'accept' ? '#4CAF50' : '#f44336'}; font-weight: bold;">
              ${action === 'accept' ? 'ACCEPTED' : 'DECLINED'}
            </span>
          </p>
          ${notes ? `
            <p><strong>Notes:</strong></p>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #3a4f66;">
              ${notes}
            </div>
          ` : ''}
        </div>
        
        <p>
          <a href="${contractUrl}" 
             style="display: inline-block; background-color: #3a4f66; color: white; padding: 10px 20px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Contract Details
          </a>
        </p>
      </div>
    `;
    
    // Create plain text version
    const text = `
Contract Response Notification

A musician has responded to a contract.

Contract: ${monthName} ${contract.year}
Musician: ${musician.name} (${musician.email})
Response: ${action === 'accept' ? 'ACCEPTED' : 'DECLINED'}
${notes ? `Notes: ${notes}` : ''}

View Contract Details: ${contractUrl}
    `;
    
    // If SendGrid is not configured, just log the notification and return success
    if (!process.env.SENDGRID_API_KEY || !ADMIN_EMAIL) {
      console.log('[MOCK EMAIL] Would have sent contract response notification:');
      console.log(`To: ${ADMIN_EMAIL || 'admin@example.com'}`);
      console.log(`Subject: [Contract ${action === 'accept' ? 'Accepted' : 'Declined'}] ${musician.name} - ${monthName} ${contract.year}`);
      console.log(`Musician ${musician.name} has ${action === 'accept' ? 'ACCEPTED' : 'DECLINED'} the contract for ${monthName} ${contract.year}`);
      if (notes) {
        console.log(`Notes: ${notes}`);
      }
      return true;
    }
    
    // Send the actual email
    await MailService.send({
      to: ADMIN_EMAIL,
      from: FROM_EMAIL,
      subject: `[Contract ${action === 'accept' ? 'Accepted' : 'Declined'}] ${musician.name} - ${monthName} ${contract.year}`,
      text,
      html
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send contract response notification:', error);
    return false;
  }
}

// Export functions directly, do not use export default