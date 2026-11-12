import Icon from '../icons/Icon.jsx'
import IconButton from '../primitives/IconButton.jsx'
import { useTheme } from './ThemeProvider.jsx'

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  const dark = resolved === 'dark'
  return (
    <IconButton label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
      <Icon name={dark ? 'sun' : 'moon'} size={20} />
    </IconButton>
  )
}
