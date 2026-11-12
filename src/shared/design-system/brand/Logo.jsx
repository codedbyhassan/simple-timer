import navy from './logo-navy.png'
import white from './logo-white.png'
import './logo.css'

// Both images are rendered and CSS shows the one that matches the theme, so there is no flash on load.
export default function Logo({ width = 200 }) {
  return (
    <span className="hms-logo" style={{ width }}>
      <img className="hms-logo__light" src={navy} alt="Ascend HMS by Ascend Technologies" />
      <img className="hms-logo__dark" src={white} alt="" aria-hidden="true" />
    </span>
  )
}
