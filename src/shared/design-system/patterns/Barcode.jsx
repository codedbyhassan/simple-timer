import { code39 } from '../data/barcode39.js'

// Scannable Code 39 barcode drawn as SVG. Quiet zones are included.
export default function Barcode({ value, height = 56, label }) {
  const { bars, width } = code39(value)
  const quiet = 10
  const total = width + quiet * 2
  return (
    <svg viewBox={`0 0 ${total} ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-label={label || `Barcode ${value}`} shapeRendering="crispEdges" style={{ display: 'block' }}>
      {bars.map((b, i) => <rect key={i} x={b.x + quiet} y="0" width={b.w} height={height} fill="currentColor" />)}
    </svg>
  )
}
