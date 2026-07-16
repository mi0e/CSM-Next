/**
 * Tiny i18n helper shared by theme pages.
 * dictionaries: { zh: { key: '...' }, en: { key: '...' } }
 * getLanguage: () => 'zh' | 'en' | ...
 */
export function createTranslator(dictionaries, getLanguage) {
  return function t(key, values = {}) {
    const lang = typeof getLanguage === 'function' ? getLanguage() : getLanguage
    let text = dictionaries[lang]?.[key] ?? dictionaries.en?.[key] ?? dictionaries.zh?.[key] ?? key
    for (const [name, value] of Object.entries(values || {})) {
      text = String(text).replaceAll(`{${name}}`, String(value))
    }
    return text
  }
}
