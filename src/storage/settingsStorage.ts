import { generalSettingTabs } from '../config/settings/general-settings';
import { saveToStorage, loadFromStorage } from './storage';

const defaultSettings: Record<string, any> = {};
generalSettingTabs.forEach(tab => {
    tab.settings.forEach(setting => {
        defaultSettings[setting.key] = setting.default;
    });
});



const SETTINGS_KEY = 'settings';


// Get the settings from local storage
const savedSettings = loadFromStorage(SETTINGS_KEY);

console.log(savedSettings);

// Merge them with the default settings
export const settings = Object.assign({}, defaultSettings, savedSettings);

export const saveSetting = (key: string, value: any) => {
    settings[key] = value;
    saveToStorage(SETTINGS_KEY, settings);
}

export const resetSettings = () => {
    saveToStorage(SETTINGS_KEY, defaultSettings);
}

export const resetSetting = (key: string) => {
    settings[key] = defaultSettings[key];
    saveToStorage(SETTINGS_KEY, settings);
}


