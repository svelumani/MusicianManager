import { storage } from "../storage";

// Settings constants
const SETTINGS_TYPES = {
  EMAIL: 'email',
};

// Default settings
const DEFAULT_SETTINGS = {
  [SETTINGS_TYPES.EMAIL]: {
    emailEnabled: false,
    sendgridApiKey: '',
    senderEmail: '',
    senderName: 'VAMP Music',
  },
};

// Get settings by type
export async function getSettings(type: string) {
  try {
    const settings = await storage.getSettings(type);
    if (!settings) {
      // Return default settings if none exist
      return DEFAULT_SETTINGS[type as keyof typeof DEFAULT_SETTINGS] || {};
    }
    return settings.data;
  } catch (error) {
    console.error(`Error fetching ${type} settings:`, error);
    return DEFAULT_SETTINGS[type as keyof typeof DEFAULT_SETTINGS] || {};
  }
}

// Save settings
export async function saveSettings(type: string, data: any) {
  try {
    const existingSettings = await storage.getSettings(type);
    
    if (existingSettings) {
      // Update existing settings
      return await storage.updateSettings(type, data);
    } else {
      // Create new settings
      return await storage.createSettings(type, data);
    }
  } catch (error) {
    console.error(`Error saving ${type} settings:`, error);
    throw error;
  }
}

// Email-specific settings functions
export async function getEmailSettings() {
  return getSettings(SETTINGS_TYPES.EMAIL);
}

export async function saveEmailSettings(data: any) {
  return saveSettings(SETTINGS_TYPES.EMAIL, data);
}

export async function isEmailEnabled() {
  const settings = await getEmailSettings();
  return !!settings.emailEnabled && !!settings.sendgridApiKey && !!settings.senderEmail;
}

export async function getEmailSenderInfo() {
  const settings = await getEmailSettings();
  return {
    email: settings.senderEmail || '',
    name: settings.senderName || 'VAMP Music',
  };
}