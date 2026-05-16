import { describe, it, expect, beforeEach } from 'vitest';
import i18n, { getLanguage, setLanguage, SUPPORTED_LANGUAGES } from './i18n';

/**
 * Q.1 / Q.2 / Q.3 — vérifications du module i18n :
 *  - les langues supportées sont bien fr et en
 *  - setLanguage met à jour i18n.language
 *  - les clés clés (nav.home / nav.login) sont traduites dans les deux langues
 *
 * Le test s'exécute en environnement Node : les branches localStorage /
 * document.documentElement.lang sont gardées par des optional chaining et
 * ne plantent pas en absence de window.
 */

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('fr');
  });

  it('exposes fr and en as supported languages', () => {
    expect(SUPPORTED_LANGUAGES).toContain('fr');
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toHaveLength(2);
  });

  it('returns the current language from getLanguage', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    setLanguage('fr');
    expect(getLanguage()).toBe('fr');
  });

  it('ignores unsupported languages', () => {
    setLanguage('en');
    setLanguage('xx');
    expect(getLanguage()).toBe('en');
  });

  it('translates the navigation keys in both languages', () => {
    setLanguage('fr');
    expect(i18n.t('nav.home')).toBe('Accueil');
    expect(i18n.t('nav.login')).toBe('Se connecter');

    setLanguage('en');
    expect(i18n.t('nav.home')).toBe('Home');
    expect(i18n.t('nav.login')).toBe('Log in');
  });

  it('translates shared common keys', () => {
    setLanguage('en');
    expect(i18n.t('common.copy')).toBe('Copy');
    expect(i18n.t('dashboard.exportCsv')).toBe('Export CSV');
  });
});
