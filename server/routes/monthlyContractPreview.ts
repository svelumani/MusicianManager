import express from 'express';
import { isAuthenticated } from '../auth';
import { storage } from '../storage';
import { format } from 'date-fns';

const router = express.Router();

// Preview monthly contract
router.get("/:id/preview", isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.id);
    if (isNaN(contractId)) {
      return res.status(400).json({ message: "Invalid contract ID" });
    }

    // Get the contract
    const contract = await storage.getMonthlyContract(contractId);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Get all musicians in the contract
    const assignments = await storage.getMonthlyContractMusicians(contractId);
    
    // Generate HTML for contract preview
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Contract Preview</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 40px;
              color: #333;
            }
            .contract-header {
              text-align: center;
              margin-bottom: 40px;
            }
            .contract-header h1 {
              color: #2563eb;
              margin-bottom: 10px;
            }
            .contract-info {
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h2 {
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
              color: #1e40af;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f1f5f9;
            }
            .signature-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line {
              border-top: 1px solid #000;
              width: 300px;
              margin-top: 50px;
              text-align: center;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 0.8em;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="contract-header">
            <h1>VAMP Productions</h1>
            <h2>Monthly Musician Agreement</h2>
            <p>Contract #${contract.id}</p>
          </div>
          
          <div class="contract-info">
            <p><strong>Month/Year:</strong> ${format(new Date(contract.year, contract.month - 1), 'MMMM yyyy')}</p>
            <p><strong>Status:</strong> ${contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}</p>
            <p><strong>Generated:</strong> ${contract.createdAt ? format(new Date(contract.createdAt), 'MMMM d, yyyy') : 'N/A'}</p>
            ${contract.sentAt ? `<p><strong>Sent:</strong> ${format(new Date(contract.sentAt), 'MMMM d, yyyy')}</p>` : ''}
          </div>
          
          <div class="section">
            <h2>Contract Description</h2>
            <p>${contract.description || 'No description provided.'}</p>
          </div>
          
          <div class="section">
            <h2>Musicians and Assignments</h2>
            ${assignments.length === 0 ? '<p>No musicians assigned to this contract.</p>' : `
              <table>
                <thead>
                  <tr>
                    <th>Musician</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${assignments.map(a => `
                    <tr>
                      <td>${a.musician?.name || 'Unknown'}</td>
                      <td>${a.musician?.type || 'N/A'}</td>
                      <td>${a.dateCount || 0} dates</td>
                      <td>${a.status?.charAt(0).toUpperCase() + a.status?.slice(1) || 'Pending'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
          
          <div class="section">
            <h2>Terms and Conditions</h2>
            <p>This agreement represents a binding contract between VAMP Productions and the musicians listed above for the performance dates specified.</p>
            <p>All performance details, including venue information, call times, and attire requirements will be provided separately for each engagement.</p>
            <p>Musicians are expected to arrive prepared and on time for all performances. Any unavoidable conflicts must be communicated as soon as possible.</p>
            <p>Payment will be processed according to the agreed rates for each performance date, typically within 14 days of the performance.</p>
          </div>
          
          <div class="signature-section">
            <div>
              <div class="signature-line">
                <p>VAMP Productions Representative</p>
              </div>
            </div>
            <div>
              <div class="signature-line">
                <p>Musician Signature</p>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>VAMP Productions | This is a preview of the contract and is not legally binding</p>
          </div>
        </body>
      </html>
    `;
    
    // Send the HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error("Error generating contract preview:", error);
    res.status(500).json({ message: "Failed to generate contract preview" });
  }
});

// Preview specific musician's contract
router.get("/:contractId/musicians/:musicianContractId/preview", isAuthenticated, async (req, res) => {
  try {
    const contractId = parseInt(req.params.contractId);
    const musicianContractId = parseInt(req.params.musicianContractId);
    
    if (isNaN(contractId) || isNaN(musicianContractId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Get the contract
    const contract = await storage.getMonthlyContract(contractId);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Get the specific musician assignment
    const assignments = await storage.getMonthlyContractMusicians(contractId);
    const musicianContract = assignments.find(a => a.id === musicianContractId);
    
    if (!musicianContract) {
      return res.status(404).json({ message: "Musician contract not found" });
    }
    
    // Get the musician's dates
    const dates = musicianContract.dates || [];
    
    // Calculate total fee
    const totalFee = dates.reduce((sum, date) => sum + parseFloat(date.fee.toString()), 0);

    // Generate HTML for contract preview
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Musician Contract Preview</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 40px;
              color: #333;
            }
            .contract-header {
              text-align: center;
              margin-bottom: 40px;
            }
            .contract-header h1 {
              color: #2563eb;
              margin-bottom: 10px;
            }
            .musician-info {
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 30px;
            }
            .section h2 {
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
              color: #1e40af;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f1f5f9;
            }
            .total-row {
              font-weight: bold;
              background-color: #f8fafc;
            }
            .signature-section {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line {
              border-top: 1px solid #000;
              width: 300px;
              margin-top: 50px;
              text-align: center;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 0.8em;
              color: #666;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              color: white;
              font-size: 0.85em;
            }
            .status-accepted {
              background-color: #22c55e;
            }
            .status-rejected {
              background-color: #ef4444;
            }
            .status-pending {
              background-color: #f59e0b;
            }
          </style>
        </head>
        <body>
          <div class="contract-header">
            <h1>VAMP Productions</h1>
            <h2>Musician Contract</h2>
            <p>Contract #${contract.id} - ${format(new Date(contract.year, contract.month - 1), 'MMMM yyyy')}</p>
          </div>
          
          <div class="musician-info">
            <h2>Musician Information</h2>
            <p><strong>Name:</strong> ${musicianContract.musician?.name || 'Unknown'}</p>
            <p><strong>Instrument:</strong> ${musicianContract.musician?.type || 'N/A'}</p>
            <p><strong>Email:</strong> ${musicianContract.musician?.email || 'N/A'}</p>
            <p><strong>Overall Status:</strong> 
              <span class="status-badge status-${musicianContract.status === 'accepted' ? 'accepted' : musicianContract.status === 'rejected' ? 'rejected' : 'pending'}">
                ${musicianContract.status?.charAt(0).toUpperCase() + musicianContract.status?.slice(1) || 'Pending'}
              </span>
            </p>
            ${musicianContract.responseDate ? `<p><strong>Response Date:</strong> ${format(new Date(musicianContract.responseDate), 'MMMM d, yyyy')}</p>` : ''}
          </div>
          
          <div class="section">
            <h2>Engagement Dates</h2>
            ${dates.length === 0 ? '<p>No dates assigned.</p>' : `
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${dates.map(date => `
                    <tr>
                      <td>${format(new Date(date.date), 'MMMM d, yyyy')}</td>
                      <td>$${parseFloat(date.fee.toString()).toFixed(2)}</td>
                      <td>
                        <span class="status-badge status-${date.status === 'accepted' ? 'accepted' : date.status === 'rejected' ? 'rejected' : 'pending'}">
                          ${date.status.charAt(0).toUpperCase() + date.status.slice(1)}
                        </span>
                      </td>
                      <td>${date.notes || 'None'}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td>Total</td>
                    <td>$${totalFee.toFixed(2)}</td>
                    <td colspan="2"></td>
                  </tr>
                </tbody>
              </table>
            `}
          </div>
          
          <div class="section">
            <h2>Contract Description</h2>
            <p>${contract.description || 'No description provided.'}</p>
          </div>
          
          <div class="section">
            <h2>Terms and Conditions</h2>
            <p>This agreement represents a binding contract between VAMP Productions and ${musicianContract.musician?.name || 'the musician'} for the performance dates specified above.</p>
            <p>All performance details, including venue information, call times, and attire requirements will be provided separately for each engagement.</p>
            <p>Musicians are expected to arrive prepared and on time for all performances. Any unavoidable conflicts must be communicated as soon as possible.</p>
            <p>Payment will be processed according to the agreed rates for each performance date, typically within 14 days of the performance.</p>
          </div>
          
          <div class="signature-section">
            <div>
              <div class="signature-line">
                <p>VAMP Productions Representative</p>
              </div>
            </div>
            <div>
              <div class="signature-line">
                <p>Musician Signature</p>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>VAMP Productions | This is a preview of the contract and is not legally binding</p>
          </div>
        </body>
      </html>
    `;
    
    // Send the HTML response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error("Error generating musician contract preview:", error);
    res.status(500).json({ message: "Failed to generate musician contract preview" });
  }
});

export default router;