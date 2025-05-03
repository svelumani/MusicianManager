/**
 * Script to push schema changes to the database
 * This bypasses the interactive prompts from drizzle-kit
 */
import { execSync } from 'child_process';

try {
  console.log('Pushing schema changes to the database...');
  
  // Push schema changes with "yes" input piped to the command
  execSync('echo "y" | npx drizzle-kit push', { 
    stdio: ['pipe', 'inherit', 'inherit']
  });
  
  console.log('Schema changes applied successfully!');
} catch (error) {
  console.error('Error applying schema changes:', error);
  process.exit(1);
}