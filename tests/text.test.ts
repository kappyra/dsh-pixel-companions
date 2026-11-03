import test from 'node:test'
import assert from 'node:assert/strict'
import { SCENES } from '../src/client/state.ts'
import { LANGUAGES, REACTION_LINES, SCENE_LABELS, UI_TEXT, languageFromTag } from '../src/client/text.ts'
import { REACTION_IDS } from '../src/client/reactions.ts'

test('every scene has a non-empty caption in every language', () => {
  assert.equal(SCENES.length, 15)
  for (const scene of SCENES) {
    for (const language of LANGUAGES) {
      const caption = SCENE_LABELS[scene][language.id]
      assert.equal(typeof caption, 'string', `${scene}/${language.id}`)
      assert.ok(caption.trim().length > 0, `${scene}/${language.id} is empty`)
    }
  }
})

test('every UI string exists and is non-empty in every language', () => {
  const keys = Object.keys(UI_TEXT.en) as (keyof (typeof UI_TEXT)['en'])[]
  for (const language of LANGUAGES) {
    for (const key of keys) {
      const value = UI_TEXT[language.id][key]
      assert.equal(typeof value, 'string', `${language.id}/${key}`)
      assert.ok(value.trim().length > 0, `${language.id}/${key} is empty`)
    }
    assert.deepEqual(Object.keys(UI_TEXT[language.id]).sort(), [...keys].sort(), language.id)
  }
})

test('the captions are distinct per scene (no copy-paste)', () => {
  for (const language of LANGUAGES) {
    const labels = SCENES.map((scene) => SCENE_LABELS[scene][language.id])
    assert.equal(new Set(labels).size, labels.length, language.id)
  }
})

test('languageFromTag maps browser tags, unknown values fall back to English', () => {
  assert.equal(languageFromTag('ru-RU'), 'ru')
  assert.equal(languageFromTag('zh-Hans-CN'), 'zh')
  assert.equal(languageFromTag('vi'), 'vi')
  assert.equal(languageFromTag('ja-JP'), 'ja')
  assert.equal(languageFromTag('ko-KR'), 'ko')
  assert.equal(languageFromTag('en-GB'), 'en')
  assert.equal(languageFromTag('de-DE'), 'en')
  assert.equal(languageFromTag(undefined), 'en')
  assert.equal(languageFromTag(''), 'en')
})

test('every interaction has a short, distinct line in every language', () => {
  for (const language of LANGUAGES) {
    const lines = REACTION_IDS.map((reaction) => REACTION_LINES[language.id][reaction])
    for (const [index, reaction] of REACTION_IDS.entries()) {
      const line = lines[index]
      assert.equal(typeof line, 'string', `${language.id}/${reaction}`)
      assert.ok(line.trim().length > 0, `${language.id}/${reaction} is empty`)
      assert.ok(line.length <= 80, `${language.id}/${reaction} is too long`)
    }
    assert.equal(new Set(lines).size, lines.length, `${language.id} repeats a line`)
  }
})
