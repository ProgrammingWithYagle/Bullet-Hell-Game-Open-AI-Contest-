import {loadProfile,PROFILE_KEY} from './profile.ts';
import catalog from '../../content/catalog.json';

/** Run before startup detection; an automatic suggestion is not a saved choice. */
export function hasLanguagePreference(store: Pick<Storage,'getItem'|'setItem'>) {
  try {
    if (store.getItem(PROFILE_KEY) !== null) {
      try { return Boolean(loadProfile(store).locale); } catch {}
    }
    const chosen = store.getItem('ga-language');
    return catalog.locales.some(item => item.id === chosen);
  } catch { return false; }
}
