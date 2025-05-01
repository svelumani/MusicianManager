import { storage } from '../storage';
import { Settings } from '@shared/schema';

/**
 * Get settings by type
 * @param type The settings type
 * @returns The settings data
 */
export async function getSettings(type: string): Promise<Settings | undefined> {
  return storage.getSettings(type);
}

/**
 * Save settings by type
 * @param type The settings type
 * @param data The settings data
 * @returns The updated settings
 */
export async function saveSettings(type: string, data: any): Promise<Settings | undefined> {
  const existingSettings = await storage.getSettings(type);
  
  if (!existingSettings) {
    return storage.createSettings(type, data);
  }
  
  return storage.updateSettings(type, data);
}

/**
 * Get email settings
 * @returns The email settings
 */
export async function getEmailSettings(): Promise<any> {
  const settings = await getSettings('email');
  return settings;
}

/**
 * Save email settings
 * @param data The email settings data
 * @returns The updated email settings
 */
export async function saveEmailSettings(data: any): Promise<Settings | undefined> {
  return saveSettings('email', data);
}

/**
 * Check if email is enabled
 * @returns True if email is enabled, false otherwise
 */
export async function isEmailEnabled(): Promise<boolean> {
  const settings = await getEmailSettings();
  return settings?.data?.enabled === true;
}

/**
 * Get email sender information
 * @returns The email sender information
 */
export async function getEmailSenderInfo(): Promise<{ from: string; replyTo?: string } | undefined> {
  const settings = await getEmailSettings();
  
  if (!settings?.data?.enabled || !settings?.data?.from) {
    return undefined;
  }
  
  return {
    from: settings.data.from,
    replyTo: settings.data.replyTo
  };
}