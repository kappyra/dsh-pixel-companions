# Разработка

[English](../development.md) | [中文](../zh/development.md) | Русский | [Tiếng Việt](../vi/development.md) | [日本語](../ja/development.md) | [한국어](../ko/development.md)

## Структура проекта

```text
package.json              bundle manifest: dsh.bundle.patch + dsh.client
cordis.patch.yml          inserts the ui-pixel-companions row
index.js                  Host half (empty apply; the Client module does the work)
client.js                 generated browser bundle (committed, ~94 KiB)
icon.svg                  plugin inventory icon
locale/*.json             meta.title / meta.description, six languages
src/client/index.ts       registers the slot entries (overlay, bridge, Settings row)
src/client/Pet.tsx        exports Companion (draggable overlay, settings panel)
                          and CompanionBridge (hidden composer-slot entry)
src/client/bridge.ts      companion facts store and publisher/subscriber hooks
src/client/prefs.ts       shared client-local preferences store (usePrefs/updatePrefs/updatePrefsSoon)
src/client/SizeSettingsRow.tsx  Settings → General companion-size row
src/client/signals.ts     pure projections: live bits, streams, report/detail text, scale clamp
src/client/asset-url.ts   resolves asset-route references through require.asset
src/client/state.ts       SCENES + deriveScene + observed-fact types
src/client/text.ts        LANGUAGES, SCENE_LABELS, UI_TEXT, languageFromTag
src/client/desktop.ts     optional localhost bridge to the desktop window
src/client/assets.generated.ts  generated asset-route refs (committed, ~11 KiB)
assets/girl/*.webp|png    canonical art (pack v2 style, 15 scenes + 18 reactions)
assets/whale/*.webp|png   canonical v3 matte art (15 scenes + 18 reactions)
assets/whale/roaming.*    optional desk-free movement asset for Deepy
source-art/*.gif          pre-v3 sources for tools/build_assets.py (do not rerun)
tools/build-assets.mjs    assets/ -> content-hashed refs in assets.generated.ts
tools/build-client.mjs    src/client/index.ts -> client.js
tools/build_assets.py     legacy pre-v3 generator (see the caution below)
tests/state.test.ts       scene rules (8 tests)
tests/signals.test.ts     live bits, streams, report/detail helpers, scale clamp (8 tests)
tests/text.test.ts        translation completeness (4 tests)
demo/                     offline preview page and stills (regenerated from v3 art)
desktop/companion.py      standalone GTK 3 desktop window + localhost bridge
desktop/requirements.txt  PyGObject>=3.42, Pillow>=10
desktop/run.sh            launcher (python3 desktop/companion.py)
desktop/README.md         short desktop quickstart
```

## Команды

```sh
npm install              # esbuild (dev only)
npm run build            # build the asset manifest, then bundle client.js
npm run assets           # regenerate only src/client/assets.generated.ts
npm test                 # node --experimental-strip-types --test tests/*.test.ts
npm run check:docs       # links + structure across all six languages
python3 -m py_compile desktop/companion.py   # syntax-check the desktop half
python3 desktop/companion.py --self-test     # headless desktop acceptance test
```

`npm run build` — это два шага, и каждый можно запустить отдельно:

- `node tools/build-assets.mjs` сканирует `assets/` и переписывает
  `src/client/assets.generated.ts` (около 5 KiB) ссылками на маршрут ассетов плагина вида
  `plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`. В запросе
  стоят первые 8 шестнадцатеричных символов SHA-1 файла, поэтому изменённый спрайт получает
  новый URL. Шаг падает, если у какого-то персонажа или сцены нет ни `.webp`, ни `.png`.
- `node tools/build-client.mjs` собирает TypeScript с помощью esbuild, оставляет `react`
  внешним, оборачивает результат в
  `window.__ModuleLoader__.load({ id: "dsh-pixel-companions", factory })` и пишет `client.js`
  (около 72 KiB). Проверка разбора с esbuild `--check` (`node --check`) входит в сборку.

`npm run assets` — это только первый шаг; используйте его, когда нужно обновить лишь ссылки.

## Как устроен браузерный бандл

Harness загружает каждый браузерный плагин через загрузчик модулей страницы:

```js
window.__ModuleLoader__.load({
  id: 'dsh-pixel-companions',      // must equal the package name
  factory(require) {
    // compiled CommonJS module; require('react') resolves from the page's module table
    return module.exports           // { inject, apply }
  },
});
```

Из-за этого `react` никогда не попадает в бандл: скомпилированный код вызывает
`require('react')`, и загрузчик отвечает из vendor-бандла оболочки (React 18.3.1 в проверенном
выпуске). Сборка второго React сломала бы хуки.

## Как доставляются спрайты

Спрайты **не встраиваются** в бандл. `package.json` экспортирует `"./assets/*": "./assets/*"`, поэтому маршрут ассетов Harness отдаёт собственную графику пакета по адресу
`plugins/dsh-pixel-companions/assets/<character>/<scene>.<webp|png>?v=<sha1-8>`.

- `src/client/assets.generated.ts` хранит эти ссылки, а не байты изображений.
- `src/client/asset-url.ts` разрешает ссылку через помощник загрузчика `require.asset(...)`,
  когда он есть, и иначе откатывается к сырой ссылке относительно документа.
- Браузер загружает спрайт по требованию для текущего персонажа и сцены (и для другой сцены при
  её смене), а не разбирает 62 встроенных изображения при загрузке.
- Каждый URL неизменяем благодаря хешу содержимого, поэтому браузер может кешировать его
  надолго; запрос `?v=<sha1-8>` сбрасывает этот кеш всякий раз, когда файл меняется.

Закоммиченный JS-бандл остаётся около 72 KiB; графика поставляется обычными файлами в
`assets/`. Именно `npm run build` после изменения графики обновляет манифест и бандл.

## Как работают элементы слотов

`src/client/index.ts` внедряет три элемента:

| Слот | Элемент | Регистрация |
| --- | --- | --- |
| `conversation.input.dock` | `CompanionBridge` (рендерит `null`) | `{ name: 'conversation.input.dock', id: 'kappy-pixel-companions.bridge', order: 80 }` |
| `shell.overlay` | `Companion` (перетаскиваемый overlay) | `{ name: 'shell.overlay', id: 'kappy-pixel-companions', order: 50 }` |
| `settings.general.item` | `SizeSettingsRow` (Настройки → Общие) | `{ name: 'settings.general.item', id: 'pixel-companions-size', order: 40 }` |

`conversation.input.dock` — единственный слот, который получает props уровня сессии — `SessionSnapshot`,
`InputState`, снимок Chat и действия полосы ввода, поэтому `CompanionBridge` публикует эти
факты (плюс флаг ожидающего взаимодействия из `useSessionStatus`) в модульное хранилище в
`src/client/bridge.ts`. Bridge поверхностно сравнивает свои факты и публикует их, только когда
какое-то поле изменилось; активность пользователя, например набор текста, обновляет таймер
простоя (не чаще одного раза в 5 с при наборе черновика), не меняя сцену. Он также один раз на
готовый узел ассистента извлекает полный текст ответа в `CompanionFacts.detail` (не более
8000 символов) и замораживает и `report`, и `detail`, пока идёт ход, публикуя их при остановке;
`detail` остаётся на странице и никогда не отправляется через bridge рабочего стола. При
размонтировании `useDisconnectOnUnmount` публикует `connected: false` и сохраняет последние
факты; тогда overlay переходит к поведению idle/sleeping.

`shell.overlay` охватывает весь фрейм, поэтому `Companion` может парить поверх всех колонок
на каждой странице. Он читает хранилище через `useCompanionFacts()`, тоже подписывается на
`useSessionStatus` (чтобы ожидающее подтверждение было видно и вне диалога), выводит сцену с
помощью `deriveScene` и рисует спрайт в перетащенной позиции. Слой overlay пропускает клики;
указатель получают только спрайт, его кнопка с шестерёнкой и панель настроек. Часы с шагом 1 с и
опрос/пульс здоровья рабочего стола останавливаются, пока вкладка скрыта, а отчёт о завершении
объявляется через `role="status"` / `aria-live="polite"`.

`settings.general.item` — штатный список общих настроек хоста. `SizeSettingsRow` рендерит только
элементы размера компаньона (заголовок, описание, слайдер, кнопки −/+, живое показание и пресеты
50/100/150/200 %). Он использует тот же `src/client/prefs.ts` (`usePrefs` / `updatePrefs` /
`updatePrefsSoon`), что и панель компаньона, поэтому любая поверхность сразу обновляет другую, и обе
сохраняются в `localStorage` под ключом `kappy.pixel-companions.ui.v1` с дебаунсом 180 мс и
сбросом по `pagehide`.

Частые перетаскивания слайдера вызывают `updatePrefsSoon`, который объединяет обновления
максимум до одного на кадр анимации (`requestAnimationFrame`, запасной таймаут 16 мс); клики по
пресетам и кнопкам −/+ используют `updatePrefs`, который пропускает пустые патчи. Overlay
заново ограничивает сохранённую позицию, только когда масштабированный спрайт действительно
выходит за пределы области просмотра, сетка предпросмотра сцен и карточка предпросмотра
рабочего стола обёрнуты в `React.memo`, а зеркалирование на рабочий стол дебаунсится примерно до
140 мс.

## Редактирование поведения

- Правила сцен: `src/client/state.ts`, тесты в `tests/state.test.ts`.
- Чистые проекции снимка Chat и отчёта: `src/client/signals.ts`, тесты в
  `tests/signals.test.ts`.
- Подписи, текст настроек и список шести языков: `src/client/text.ts`, тесты в
  `tests/text.test.ts`.
- Разметка overlay, перетаскивание указателем, панель настроек, стили: `src/client/Pet.tsx`.
- Хранилище фактов, сравнение черновиков и жизненный цикл bridge: `src/client/bridge.ts`.
- Общие клиентские локальные настройки (`usePrefs` / `updatePrefs` / `updatePrefsSoon`):
  `src/client/prefs.ts`.
- Строка размера в «Настройки → Общие»: `src/client/SizeSettingsRow.tsx`.
- Разрешение маршрута ассетов: `src/client/asset-url.ts`.
- Опциональный bridge рабочего стола (`useDesktopBridge`, порт, тайминги опроса и пульса):
  `src/client/desktop.ts`.
- Окно на рабочем столе, меню по правому клику, настройки и HTTP-bridge: `desktop/companion.py`.
- Регистрация слотов и id модуля: `src/client/index.ts`.

После изменения: `npm run build`, затем перезагрузите страницу. Если профиль использует установку
через `link:`, пересобранный `client.js` отдаётся напрямую, и транспорт HMR подменяет его.
Настройки и перетащенная `position` живут в `localStorage` под `kappy.pixel-companions.ui.v1`;
очистите этот ключ, чтобы воспроизвести состояние первого запуска. Когда `position` равен
`null`, автоматическое место — правый нижний угол, в 96 px от правого края и в 150 px от нижнего
края окна, и оно заново ограничивается при изменении размера; **«Сбросить позицию»** возвращает
`position` в `null`.

## Редактирование графики

`assets/` — источник истины, и сейчас там обновление графики v3: 15 спрайтов сцен на персонажа
(анимированный WebP + статичный PNG, 192×128 RGBA с прозрачностью) плюс опциональная
визуализация движения `assets/whale/roaming.{webp,png}` для Deepy. Пересобирайте манифест и бандл
только обычной сборкой:

1. Замените или добавьте `assets/<character>/<scene>.webp` (анимированный) и
   `assets/<character>/<scene>.png` (статичный), оба 192×128 с прозрачным фоном.
2. Запустите `npm run build` — `tools/build-assets.mjs` перепишет ссылки с хешем содержимого, а
   `tools/build-client.mjs` пересоберёт `client.js`.
3. Закоммитьте `assets/`, пересобранный `src/client/assets.generated.ts` и `client.js`.

Не правьте `src/client/assets.generated.ts` и `client.js` вручную; ими владеет сборка.

Поскольку спрайты отдаются маршрутом ассетов, а не встраиваются, закоммиченный `client.js`
остаётся около 72 KiB; изображения загружаются по сцене из пакета и кешируются надолго. Хеш
`?v=<sha1-8>` меняется вместе с содержимым файла, поэтому браузеры подхватывают новую графику без
переименования.

**Осторожно:** `tools/build_assets.py` и восемь GIF в `source-art/` воспроизводят
**прежнюю, до-v3** генерацию графики. После обновления v3 источник истины — `assets/`, поэтому
запуск этого генератора откатил бы графику. Не запускайте его, если не собираетесь откатывать;
обычные изменения идут только через `npm run build`.

## Тесты

`npm test` запускает каждый `tests/*.test.ts` тестовым раннером Node:

- `tests/state.test.ts` — 8 тестов для `deriveScene` и правил сцен.
- `tests/signals.test.ts` — 8 тестов для `liveBits`, `streamOf`, `cleanReport`, `lastResponse`,
  `lastAssistantNode`, `assistantText`, ограничения `MAX_DETAIL` и обработки диапазона в
  `clampScale`.
- `tests/text.test.ts` — 4 теста: у каждой сцены есть подпись на всех шести языках, каждая строка
  интерфейса присутствует на всех шести языках, подписи сцен различаются, и `languageFromTag`
  сопоставляет теги и откатывается к английскому.

Всего 20 тестов. Половина для рабочего стола сохраняет собственный headless `--self-test` (92 декодирования
анимаций в масштабах 0.5, 1.0 и 2.0, 31 декодирование статичных изображений, 260 проверок).

## Упаковка

```sh
npm pack --dry-run     # inspect the published file list
npm pack               # dsh-pixel-companions-0.1.0.tgz
```

`files` включает собранный `client.js`, `assets/`, исходники, инструменты, demo, desktop, docs
(английские и `docs/zh/`), `README.md`, `README.zh.md` и шесть файлов `locale/*.json`; в него не
входят `source-art/`, `node_modules/` и артефакты одних только тестов. Дерево `assets/` должно
поставляться: маршрут ассетов отдаёт его из установленного пакета. Tarball ставится командой
`dsh plugin --profile web add <tgz>`.

## Чек-лист релиза

1. `npm run build` и `npm test` (20 тестов).
2. `python3 -m py_compile desktop/companion.py` и `python3 desktop/companion.py --self-test`.
3. `npm pack --dry-run`: присутствуют `client.js`, `assets/**`, `locale/*.json` (шесть языков),
   `icon.svg`, `README.md`, `README.zh.md`, `docs/**`, `desktop/**`, `LICENSE`,
   `ASSETS_NOTICE.md`.
4. Установите tarball или `link:`-копию в профиль `web` и перезагрузите. Убедитесь, что компаньон
   появляется на странице диалога, в настройках и на странице плагинов, а его спрайты грузятся с
   маршрута ассетов (без 404 в панели сети).
5. Перетащите компаньона, перезагрузите страницу и убедитесь, что позиция восстановилась;
   измените размер окна и убедитесь, что ограничение держится; воспользуйтесь **«Сбросить
   позицию»**.
6. Откройте панель настроек и проверьте шесть языков, анимацию вкл/выкл, показ вкл/выкл,
   слайдер **«Размер»** и пресеты 50/100/150/200 %, предпросмотр 15 сцен, закрытие по Escape и
   оба режима темы. Откройте **«Настройки → Общие»** и убедитесь, что строка **«Размер
   компаньона»** показывает тот же элемент и остаётся синхронной с панелью.
7. Опциональное окно на рабочем столе: запустите `python3 desktop/companion.py`, отметьте
   **«Окно на рабочем столе»**, убедитесь, что строка читается как **«Подключено»**, окно
   зеркалирует сцену, а меню по правому клику (персонаж, анимация, размер, всегда поверх, сброс,
   скрыть, выход) работает.
8. Поднимите `version` в `package.json`; закоммитьте `package.json`, пересобранный `client.js`,
   `src/client/assets.generated.ts` и изменённые документы вместе с ними.
