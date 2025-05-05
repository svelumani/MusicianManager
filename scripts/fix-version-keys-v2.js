/**
 * Script to fix VERSION_KEYS inconsistencies in routes.ts
 * 
 * This fixes the issue where the server is using VERSION_KEYS.PLANNERS_SLOTS 
 * instead of VERSION_KEYS.PLANNER_SLOTS, etc.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to routes.ts file
const routesPath = path.join(__dirname, '..', 'server', 'routes.ts');

// Read the file
let routesContent = fs.readFileSync(routesPath, 'utf8');

// Define replacements
const replacements = [
  { from: 'VERSION_KEYS.PLANNERS_SLOTS', to: 'VERSION_KEYS.PLANNER_SLOTS' },
  { from: 'VERSION_KEYS.PLANNERS_ASSIGNMENTS', to: 'VERSION_KEYS.PLANNER_ASSIGNMENTS' },
  { from: 'VERSION_KEYS.MONTHLY_CONTRACTS_INVOICES', to: 'VERSION_KEYS.MONTHLY_INVOICES' },
];

// Apply replacements
let changesMade = 0;
for (const { from, to } of replacements) {
  const regex = new RegExp(from, 'g');
  const oldContent = routesContent;
  routesContent = routesContent.replace(regex, to);
  
  const changesInThisPass = (oldContent.match(regex) || []).length;
  changesMade += changesInThisPass;
  
  console.log(`Replaced ${changesInThisPass} instances of "${from}" with "${to}"`);
}

// Write the file back
fs.writeFileSync(routesPath, routesContent);

console.log(`\nFixed ${changesMade} inconsistencies in routes.ts`);