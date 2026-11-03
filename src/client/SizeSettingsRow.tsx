/**
 * Settings → General row for the companion size.
 *
 * Shares the same client-local preferences as the companion's own gear popover,
 * so either place changes the size immediately on both.
 */
import * as React from 'react'
import { updatePrefs, updatePrefsSoon, usePrefs } from './prefs.ts'
import { MAX_SCALE, MIN_SCALE, SIZE_PRESETS, SCALE_STEP, clampScale } from './signals.ts'
import { UI_TEXT } from './text.ts'

const SETTINGS_STYLES = `
.pxc-set-row{display:flex;flex-direction:column;gap:10px;padding:14px 0;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}
.pxc-set-head{display:flex;flex-direction:column;gap:3px}
.pxc-set-title{font-size:13px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary,#111111)}
.pxc-set-desc{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#666666)}
.pxc-set-controls{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.pxc-set-btn{width:22px;height:22px;display:grid;place-items:center;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));background:transparent;color:var(--dsw-alias-label-primary,#111111);font:inherit;font-size:13px;line-height:1;border-radius:7px}
.pxc-set-btn:hover{color:var(--dsw-alias-brand-primary,#4d6bfe)}
.pxc-set-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:2px}
.pxc-set-range{flex:1 1 150px;min-width:120px;max-width:300px;cursor:pointer;accent-color:var(--dsw-alias-brand-primary,#4d6bfe)}
.pxc-set-value{min-width:40px;text-align:right;font-size:12px;color:var(--dsw-alias-label-secondary,#666666);font-variant-numeric:tabular-nums}
.pxc-set-presets{display:flex;flex-wrap:wrap;gap:4px}
.pxc-set-preset{cursor:pointer;border:1px solid transparent;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05));color:var(--dsw-alias-label-secondary,#666666);font:inherit;font-size:11px;line-height:20px;height:22px;padding:0 8px;border-radius:7px}
.pxc-set-preset:hover{color:var(--dsw-alias-label-primary,#111111)}
.pxc-set-preset.is-on{border-color:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-label-primary,#111111);font-weight:600}
.pxc-set-preset:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d6bfe);outline-offset:1px}
@media(prefers-reduced-motion:reduce){.pxc-set-btn,.pxc-set-preset{transition:none}}
`

/** One Settings → General row: title, description, slider, presets. */
export function SizeSettingsRow(_props: Record<string, unknown>) {
  const prefs = usePrefs()
  const copy = UI_TEXT[prefs.language]
  const percent = Math.round(prefs.scale * 100)
  const setScale = (value: number) => updatePrefs({ scale: clampScale(value) })

  return (
    <div className="pxc-set-row">
      <style>{SETTINGS_STYLES}</style>
      <div className="pxc-set-head">
        <div className="pxc-set-title">{copy.sizeTitle}</div>
        <div className="pxc-set-desc">{copy.sizeDescription}</div>
      </div>
      <div className="pxc-set-controls">
        <button type="button" className="pxc-set-btn" aria-label={copy.smaller} onClick={() => setScale(prefs.scale - SCALE_STEP)}>
          −
        </button>
        <input
          className="pxc-set-range"
          type="range"
          min={Math.round(MIN_SCALE * 100)}
          max={Math.round(MAX_SCALE * 100)}
          step={Math.round(SCALE_STEP * 100)}
          value={percent}
          aria-label={copy.sizeTitle}
          aria-valuetext={`${percent}%`}
          onChange={(event) => updatePrefsSoon({ scale: clampScale(Number(event.currentTarget.value) / 100) })}
        />
        <button type="button" className="pxc-set-btn" aria-label={copy.bigger} onClick={() => setScale(prefs.scale + SCALE_STEP)}>
          +
        </button>
        <span className="pxc-set-value">{percent}%</span>
        <div className="pxc-set-presets" role="group" aria-label={copy.sizeTitle}>
          {SIZE_PRESETS.map((preset) => {
            const active = percent === preset
            return (
              <button
                key={preset}
                type="button"
                className={'pxc-set-preset' + (active ? ' is-on' : '')}
                aria-pressed={active}
                onClick={() => setScale(preset / 100)}
              >
                {preset}%
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
