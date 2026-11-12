// Code 39 encoder. n = narrow, w = wide. Each character is 5 bars and 4 spaces (9 elements), 3 of them wide.
const TABLE = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn',
  G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww',
  M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn',
  S: 'nnwnnnwwn', T: 'nnnnwnwwn', U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn', Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
}

export const isCode39 = (text) => [...text.toUpperCase()].every((c) => c in TABLE && c !== '*')

// Returns { bars: [{ x, w }], width } in module units (narrow = 1, wide = 3), including start and stop characters.
export function code39(text, { narrow = 1, wide = 3, gap = 1 } = {}) {
  const value = `*${text.toUpperCase()}*`
  const bars = []
  let x = 0
  for (let c = 0; c < value.length; c++) {
    const pattern = TABLE[value[c]]
    if (!pattern) throw new Error(`Character not supported by Code 39: ${value[c]}`)
    for (let i = 0; i < 9; i++) {
      const w = (pattern[i] === 'w' ? wide : narrow)
      if (i % 2 === 0) bars.push({ x, w })
      x += w
    }
    if (c < value.length - 1) x += gap * narrow
  }
  return { bars, width: x }
}
