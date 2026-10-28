import { useEffect } from 'react';
import { useSettingsValues } from './queries';
import { hexToRgb, inkFor, rgbTriplet } from '@/lib/color';

/**
 * Applies site settings to the document: title, accent color (both themes) and a forced theme.
 * Inline styles on <html> win over the theme rules in index.css.
 */
export function SettingsEffects() {
  const { siteTitle, accentColor, accentInk, defaultTheme } = useSettingsValues();

  useEffect(() => {
    document.title = siteTitle;
  }, [siteTitle]);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = hexToRgb(accentColor);
    if (!rgb) return;
    root.style.setProperty('--pitch', rgbTriplet(rgb));
    root.style.setProperty('--pitch-ink', rgbTriplet(inkFor(rgb, accentInk)));
    return () => {
      root.style.removeProperty('--pitch');
      root.style.removeProperty('--pitch-ink');
    };
  }, [accentColor, accentInk]);

  useEffect(() => {
    const root = document.documentElement;
    if (defaultTheme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', defaultTheme);
  }, [defaultTheme]);

  return null;
}
