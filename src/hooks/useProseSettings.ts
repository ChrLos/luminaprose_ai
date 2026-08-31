import { useState, useEffect, useCallback } from 'react';
import { ThemeId, TypographySettings, ThemeConfig, DEFAULT_TYPOGRAPHY_SETTINGS, APP_STORAGE_KEYS } from '../types';
import { THEMES } from '../utils/themes';

export function useProseSettings() {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEYS.THEME_ID);
      if (saved && THEMES[saved as ThemeId]) {
        return saved as ThemeId;
      }
    } catch (e) {
      console.warn('Failed to parse themeId from localStorage:', e);
    }
    return 'linen';
  });

  const [settings, setSettings] = useState<TypographySettings>(() => {
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEYS.PROSE_SETTINGS);
      if (saved) {
        return { ...DEFAULT_TYPOGRAPHY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse typography settings from localStorage:', e);
    }
    return DEFAULT_TYPOGRAPHY_SETTINGS;
  });

  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(APP_STORAGE_KEYS.ZOOM_LEVEL);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 75 && val <= 175) return val;
      }
    } catch (e) {
      console.warn('Failed to parse zoomLevel from localStorage:', e);
    }
    return 100;
  });

  // Save themeId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(APP_STORAGE_KEYS.THEME_ID, themeId);
    } catch (e) {
      console.warn('Failed to save themeId:', e);
    }
  }, [themeId]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(APP_STORAGE_KEYS.PROSE_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, [settings]);

  // Save zoomLevel to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(APP_STORAGE_KEYS.ZOOM_LEVEL, zoomLevel.toString());
    } catch (e) {
      console.warn('Failed to save zoomLevel:', e);
    }
  }, [zoomLevel]);

  const updateSetting = useCallback(<K extends keyof TypographySettings>(key: K, value: TypographySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_TYPOGRAPHY_SETTINGS);
  }, []);

  const currentTheme: ThemeConfig = THEMES[themeId] || THEMES.linen;

  return {
    themeId,
    setThemeId,
    currentTheme,
    settings,
    setSettings,
    updateSetting,
    resetSettings,
    zoomLevel,
    setZoomLevel,
  };
}
