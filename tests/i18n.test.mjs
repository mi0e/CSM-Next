import assert from 'node:assert/strict'
import test from 'node:test'

const { createTranslator } = await import('../src/assets/js/shared/i18n.js')

test('createTranslator interpolates and falls back by language', () => {
  const dictionaries = {
    zh: { hello: '你好 {name}', onlyZh: '仅中文' },
    en: { hello: 'Hello {name}' }
  }
  let lang = 'zh'
  const t = createTranslator(dictionaries, () => lang)
  assert.equal(t('hello', { name: 'CSM' }), '你好 CSM')
  lang = 'en'
  assert.equal(t('hello', { name: 'CSM' }), 'Hello CSM')
  assert.equal(t('onlyZh'), '仅中文')
  assert.equal(t('missing'), 'missing')
})
