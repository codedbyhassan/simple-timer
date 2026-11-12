import Logo from '../brand/Logo.jsx'
import ThemeToggle from '../theme/ThemeToggle.jsx'
import mark from '../brand/mark-white.png'
import './authlayout.css'

export default function AuthLayout({ children }) {
  return (
    <div className="hms-auth">
      <main className="hms-auth__side">
        <div className="hms-auth__top"><ThemeToggle /></div>
        <div className="hms-auth__center">
          <div className="hms-auth__card">
            <Logo width={196} />
            <div className="hms-auth__content">{children}</div>
          </div>
        </div>
        <footer className="hms-auth__footer">© {new Date().getFullYear()} Ascend Technologies</footer>
      </main>
      <aside className="hms-auth__panel" aria-hidden="true">
        <img className="hms-auth__mark" src={mark} alt="" />
      </aside>
    </div>
  )
}
