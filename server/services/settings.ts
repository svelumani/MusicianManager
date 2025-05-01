import { storage } from '../storage';

// Settings types
const SETTING_TYPES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  SYSTEM: 'system'
};

/**
 * Get settings by type
 * @param type The settings type
 * @returns The settings data
 */
export async function getSettings(type: string) {
  const settings = await storage.getSettings(type);
  return settings ? settings.data : null;
}

/**
 * Save settings by type
 * @param type The settings type
 * @param data The settings data
 * @returns The updated settings
 */
export async function saveSettings(type: string, data: any) {
  return storage.updateSettings(type, data);
}

/**
 * Get email settings
 * @returns The email settings
 */
export async function getEmailSettings() {
  return getSettings(SETTING_TYPES.EMAIL);
}

/**
 * Save email settings
 * @param data The email settings data
 * @returns The updated email settings
 */
export async function saveEmailSettings(data: any) {
  return saveSettings(SETTING_TYPES.EMAIL, data);
}

/**
 * Check if email is enabled
 * @returns True if email is enabled, false otherwise
 */
export async function isEmailEnabled() {
  const settings = await getEmailSettings() as { enabled?: boolean } | null;
  return settings && settings.enabled === true;
}

/**
 * Get email sender information
 * @returns The email sender information
 */
export async function getEmailSenderInfo() {
  const settings = await getEmailSettings() as { from?: string, replyTo?: string } | null;
  if (!settings) {
    return {
      from: '',
      replyTo: ''
    };
  }
  
  return {
    from: settings.from || '',
    replyTo: settings.replyTo || settings.from || ''
  };
}