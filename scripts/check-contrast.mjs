// Resolves the token CSS for each theme and checks WCAG contrast on the pairs that matter.
// Text pairs need 4.5:1. Interface components (borders, icons) need 3:1.
import { readFileSync } from 'node:fs'

const dir = 'src/shared/design-system/tokens/'
const prim = readFileSync(dir + 'primitive.css', 'utf8')
const sem = readFileSync(dir + 'semantic.css', 'utf8')
const comp = readFileSync(dir + 'component.css', 'utf8')

const parseVars = (css) => Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
const block = (css, selector) => {
  const i = css.indexOf(selector)
  if (i < 0) return ''
  return css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i))
}

const base = { ...parseVars(prim) }
const themes = {
  light: { ...base, ...parseVars(block(sem, ':root,\n:root[data-theme="light"]')), ...parseVars(comp) },
  dark: { ...base, ...parseVars(block(sem, ':root[data-theme="dark"]')), ...parseVars(comp) },
}
// component tokens are defined once and resolve against each theme
const resolve = (theme, name, depth = 0) => {
  let v = themes[theme][name]
  if (v === undefined) throw new Error(`Missing token ${name} in ${theme}`)
  const m = v.match(/^var\((--[\w-]+)\)$/)
  if (m && depth < 10) return resolve(theme, m[1], depth + 1)
  return v
}
const rgba = (c) => {
  if (c.startsWith('#')) {
    const h = c.slice(1)
    const f = h.length === 3 ? [...h].map((x) => x + x).join('') : h
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)).concat(1)
  }
  const m = c.match(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)/)
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]]
  throw new Error('Cannot parse ' + c)
}
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]))
const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const pairs = [
  // [foreground token, background token, minimum, label]
  ['--text', '--bg', 4.5, 'body text on page'],
  ['--text', '--surface', 4.5, 'body text on card'],
  ['--text-muted', '--bg', 4.5, 'muted text on page'],
  ['--text', '--canvas', 4.5, 'body text on canvas'],
  ['--text-muted', '--canvas', 4.5, 'muted text on canvas'],
  ['--text-subtle', '--search-fill', 4.5, 'search placeholder on fill'],
  ['--text', '--search-fill-focus', 4.5, 'search text on focused fill'],
  ['--text-subtle', '--canvas', 4.5, 'hint text on canvas'],
  ['--accent-text', '--canvas', 4.5, 'link on canvas'],
  ['--text-muted', '--surface-raised', 4.5, 'muted text on toast'],
  ['--text-subtle', '--bg', 4.5, 'hint text on page'],
  ['--accent-contrast', '--accent', 4.5, 'primary button label'],
  ['--accent-contrast', '--accent-hover', 4.5, 'primary button label (hover)'],
  ['--accent-text', '--bg', 4.5, 'link on page'],
  ['--critical', '--bg', 4.5, 'error text on page'],
  ['--critical', '--critical-soft', 4.5, 'error icon on tint'],
  ['--success', '--success-soft', 4.5, 'success icon on tint'],
  ['--warning', '--warning-soft', 4.5, 'warning icon on tint'],
  ['--info', '--info-soft', 4.5, 'info icon on tint'],
  ['--field-border', '--field-bg', 3, 'input border'],
  ['--focus-ring', '--bg', 3, 'focus ring'],
  ['--accent', '--bg', 3, 'accent against page'],
]
let failed = 0
for (const theme of ['light', 'dark']) {
  for (const [fg, bg, min, label] of pairs) {
    // Tinted backgrounds are translucent, so composite them over the toast surface they sit on.
    const surface = rgba(resolve(theme, '--surface-raised')).slice(0, 3)
    const bRaw = rgba(resolve(theme, bg))
    const b = over(bRaw, surface)
    const f = over(rgba(resolve(theme, fg)), b)
    const r = ratio(f, b)
    const ok = r >= min
    if (!ok) failed++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${theme.padEnd(5)} ${r.toFixed(2).padStart(5)} (min ${min})  ${label}`)
  }
}
console.log(failed ? `\n${failed} pair(s) below the minimum` : '\nAll pairs meet the minimum')
process.exit(failed ? 1 : 0)
