import { Router } from 'express';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { 
  monthlyContracts, 
  monthlyContractMusicians, 
  monthlyContractDates,
  musicians,
  contractTemplates,
} from '../../shared/schema';
import { isAuthenticated } from '../auth';
import { IStorage } from '../storage';

// Helper function to get month name from month number
function getMonthName(month?: number): string {
  if (!month || month < 1 || month > 12) return 'Unknown';
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return months[month - 1];
}

export default function setupMonthlyContractRoutes(apiRouter: Router, storage: IStorage) {
  // Preview Monthly Contract
  apiRouter.get("/monthly-contracts/:contractId/preview", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      
      // Get the contract
      const contract = await storage.getMonthlyContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      console.log("Contract data for preview:", JSON.stringify(contract, null, 2));
      
      // Get the contract template
      const templateId = contract.templateId;
      if (!templateId) {
        return res.status(400).json({ message: "Contract has no template ID" });
      }
      
      const template = await storage.getContractTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Contract template not found" });
      }
      
      // Get all musicians for this contract
      const contractMusicians = await storage.getMonthlyContractMusicians(contractId);
      
      // For each musician, get their details and dates
      const musicians = await Promise.all(
        contractMusicians.map(async (cm: any) => {
          const musician = await storage.getMusician(cm.musicianId);
          const dates = await storage.getMonthlyContractDates(cm.id);
          
          // Get musician type info
          let musicianTypeName = "Musician";
          if (musician && musician.typeId) {
            const musicianType = await storage.getMusicianType(musician.typeId);
            if (musicianType) {
              musicianTypeName = musicianType.title || musicianType.name || "Musician";
            }
          }
          
          return {
            id: cm.id,
            musician: {
              id: musician?.id || 0,
              name: musician?.name || "Unknown Musician",
              email: musician?.email || "",
              type: musicianTypeName
            },
            dates: dates.map((date: any) => ({
              date: date.date,
              fee: date.fee || 0,
              notes: date.notes || ""
            }))
          };
        })
      );
      
      // Prepare HTML response
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      
      const monthName = monthNames[contract.month - 1];
      
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${contract.name || `Monthly Contract - ${monthName} ${contract.year}`}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }
          .contract-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .contract-info {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 25px 0 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }
          .musician-section {
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .musician-name {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 250px;
            margin-top: 50px;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="contract-title">${contract.name || `Monthly Contract - ${monthName} ${contract.year}`}</div>
        </div>
        
        <div class="contract-info">
          <p><strong>Contract ID:</strong> ${contract.id}</p>
          <p><strong>Period:</strong> ${monthName} ${contract.year}</p>
          <p><strong>Status:</strong> ${contract.status?.toUpperCase() || 'DRAFT'}</p>
          <p><strong>Created Date:</strong> ${new Date(contract.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div class="terms-section">
          <div class="section-title">Contract Terms</div>
          <div>${template.content || 'No terms specified in the contract template.'}</div>
        </div>
        
        <div class="musicians-section">
          <div class="section-title">Assigned Musicians</div>
          ${musicians.map(musician => `
            <div class="musician-section">
              <div class="musician-name">${musician.musician.name} (${musician.musician.type})</div>
              
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fee</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${musician.dates.map(date => `
                    <tr>
                      <td>${new Date(date.date).toLocaleDateString()}</td>
                      <td>${formatMoney(date.fee || 0)}</td>
                      <td>${date.notes || '-'}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td colspan="1"><strong>Total:</strong></td>
                    <td><strong>${formatMoney(musician.dates.reduce((sum, date) => sum + (date.fee || 0), 0))}</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `).join('')}
        </div>
        
        <div class="signature-section">
          <div>
            <div class="signature-line">Company Representative</div>
          </div>
          <div>
            <div class="signature-line">Musician Signature</div>
          </div>
        </div>
      </body>
      </html>
      `;
      
      // Set content type to HTML
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error generating monthly contract preview:", error);
      // Return a friendly HTML error page
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error Previewing Contract</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              line-height: 1.6;
            }
            .error-container {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 30px;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            h1 {
              color: #d32f2f;
            }
            .error-details {
              margin-top: 20px;
              text-align: left;
              background-color: #f1f1f1;
              padding: 15px;
              border-radius: 5px;
              font-family: monospace;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Error Previewing Contract</h1>
            <p>Sorry, we encountered a problem while trying to generate the contract preview.</p>
            <p>Please try again later or contact support if the problem persists.</p>
            <div class="error-details">
              <strong>Error details:</strong><br>
              ${error.message || 'Unknown error'}
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(500).send(errorHtml);
    }
  });
  
  // View Musician Responses for a Contract
  apiRouter.get("/monthly-contracts/:contractId/musicians/:musicianContractId/responses", isAuthenticated, async (req, res) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const musicianContractId = parseInt(req.params.musicianContractId);
      
      // Get the contract musician
      const contractMusician = await storage.getMonthlyContractMusician(musicianContractId);
      if (!contractMusician || contractMusician.contractId !== contractId) {
        return res.status(404).json({ message: "Musician contract not found" });
      }
      
      // Get the musician
      const musician = await storage.getMusician(contractMusician.musicianId);
      
      // Get musician type info
      let musicianTypeName = "Musician";
      if (musician && musician.typeId) {
        const musicianType = await storage.getMusicianType(musician.typeId);
        if (musicianType) {
          musicianTypeName = musicianType.title || musicianType.name || "Musician";
        }
      }
      
      // Get the dates
      const dates = await storage.getMonthlyContractDates(musicianContractId);
      
      // Prepare HTML response
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Musician Contract Responses</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
          }
          .page-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .response-info {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 25px 0 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }
          .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: bold;
          }
          .status-accepted {
            background-color: #e8f5e9;
            color: #2e7d32;
          }
          .status-rejected {
            background-color: #ffebee;
            color: #c62828;
          }
          .status-pending {
            background-color: #fff8e1;
            color: #f57f17;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .notes {
            white-space: pre-wrap;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="page-title">Musician Contract Response</div>
        </div>
        
        <div class="response-info">
          <h2>${musician?.name || 'Musician'}</h2>
          <p><strong>Instrument/Type:</strong> ${musicianTypeName}</p>
          <p><strong>Email:</strong> ${musician?.email || 'No email provided'}</p>
          <p>
            <strong>Status:</strong> 
            <span class="status status-${contractMusician.status === 'accepted' ? 'accepted' : contractMusician.status === 'rejected' ? 'rejected' : 'pending'}">
              ${contractMusician.status?.toUpperCase() || 'PENDING'}
            </span>
          </p>
          ${contractMusician.respondedAt ? `<p><strong>Response Date:</strong> ${new Date(contractMusician.respondedAt).toLocaleString()}</p>` : ''}
          ${contractMusician.notes ? `
            <div class="notes">
              <strong>Notes/Comments:</strong><br>
              ${contractMusician.notes}
            </div>
          ` : ''}
        </div>
        
        <div class="section-title">Assigned Dates</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Fee</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${dates.map(date => `
              <tr>
                <td>${new Date(date.date).toLocaleDateString()}</td>
                <td>${formatMoney(date.fee || 0)}</td>
                <td>${date.notes || '-'}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="1"><strong>Total:</strong></td>
              <td><strong>${formatMoney(dates.reduce((sum, date) => sum + (date.fee || 0), 0))}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
      `;
      
      // Set content type to HTML
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error generating musician response view:", error);
      // Return a friendly HTML error page
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error Viewing Responses</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              line-height: 1.6;
            }
            .error-container {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 30px;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            h1 {
              color: #d32f2f;
            }
            .error-details {
              margin-top: 20px;
              text-align: left;
              background-color: #f1f1f1;
              padding: 15px;
              border-radius: 5px;
              font-family: monospace;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Error Viewing Responses</h1>
            <p>Sorry, we encountered a problem while trying to view the musician's responses.</p>
            <p>Please try again later or contact support if the problem persists.</p>
            <div class="error-details">
              <strong>Error details:</strong><br>
              ${error.message || 'Unknown error'}
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.status(500).send(errorHtml);
    }
  });
}

// Helper function for formatting currency
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2 
  }).format(amount);
}