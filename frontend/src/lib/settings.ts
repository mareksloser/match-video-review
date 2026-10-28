import type { AdminSetting, PublicSettings } from './types';

/**
 * Mirror of backend SettingsRegistry: used before /settings/public arrives (no flash of
 * empty title) and by the in-browser demo.
 */
export const DEFAULT_SETTINGS: PublicSettings = {
  siteTitle: 'Match Video Review',
  clubName: 'SK Baník Libušín',
  accentColor: '#1fbf75',
  defaultTheme: 'system',
  publicGallery: true,
  maintenanceEnabled: false,
  maintenanceMessage: 'Probíhá údržba aplikace. Zkuste to prosím za chvíli.',
};

export const SETTING_META: Record<keyof PublicSettings, Pick<AdminSetting, 'kind' | 'options' | 'maxLength'>> = {
  siteTitle: { kind: 'string', options: [], maxLength: 80 },
  clubName: { kind: 'string', options: [], maxLength: 80 },
  accentColor: { kind: 'color', options: [], maxLength: null },
  defaultTheme: { kind: 'enum', options: ['system', 'light', 'dark'], maxLength: null },
  publicGallery: { kind: 'bool', options: [], maxLength: null },
  maintenanceEnabled: { kind: 'bool', options: [], maxLength: null },
  maintenanceMessage: { kind: 'text', options: [], maxLength: 500 },
};
