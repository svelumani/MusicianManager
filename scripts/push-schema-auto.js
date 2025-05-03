/**
 * Script to push schema changes to the database
 * This bypasses the interactive prompts from drizzle-kit with multiple 'y' responses
 */
import { execSync } from 'child_process';

try {
  console.log('Pushing schema changes to the database...');
  
  // Push schema changes with multiple "yes" inputs piped to the command
  // This handles cases where there might be multiple prompts
  execSync('yes y | npx drizzle-kit push', { 
    stdio: ['pipe', 'inherit', 'inherit']
  });
  
  console.log('Schema changes applied successfully!');
} catch (error) {
  console.error('Error applying schema changes:', error);
  process.exit(1);
}