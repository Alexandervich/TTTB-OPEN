import { useEffect, useState } from 'react'
import './App.css'
import { navigate } from './navigation.js'
import CharacterFormPage from './pages/CharacterFormPage.jsx'
import ClassEditorPage from './pages/ClassEditorPage.jsx'
import CharacterListPage from './pages/CharacterListPage.jsx'

const NAV_ITEMS = [
  { path: '/characters', label: 'Characters', icon: 'bi-list-nested-nav-menu' },
  { path: '/classes', label: 'Class Editor', icon: 'bi-house-door-fill-nav-menu' },
  { path: '/character/create', label: 'Character Creator', icon: 'bi-house-door-fill-nav-menu' },
]

function HomePage() {
  return (
    <div className="gothic-hero">
      <h1>Tod und Teufel Toolbox</h1>
      <p className="lede">
        Tritt ein, Wanderer. Schmiede deinen Helden im Schatten und halte
        seine Legende im Buch der Verdammten fest.
      </p>
      <button className="btn btn-primary" type="button" onClick={() => navigate('/character/create')}>
        Charakter erschaffen
      </button>
    </div>
  )
}

function NotFoundPage() {
  return (
    <>
      <h1>Not Found</h1>
      <p role="alert">Sorry, there&apos;s nothing at this address.</p>
    </>
  )
}

function renderRoute(path) {
  const editMatch = /^\/character\/edit\/([^/]+)$/.exec(path)
  if (editMatch) return <CharacterFormPage id={decodeURIComponent(editMatch[1])} />

  switch (path) {
    case '/':
      return <HomePage />
    case '/characters':
      return <CharacterListPage />
    case '/classes':
      return <ClassEditorPage />
    case '/character/create':
      return <CharacterFormPage />
    default:
      return <NotFoundPage />
  }
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleNavClick = (event, targetPath) => {
    event.preventDefault()
    navigate(targetPath)
    setIsMenuOpen(false)
  }

  return (
    <div className="page">
      <aside className="sidebar">
        <div className="top-row ps-3 navbar navbar-dark">
          <div className="container-fluid">
            <a className="navbar-brand" href="/" onClick={(event) => handleNavClick(event, '/')}>
              TTTB
            </a>
          </div>
        </div>

        <input
          type="checkbox"
          title="Navigation menu"
          className="navbar-toggler"
          checked={isMenuOpen}
          onChange={(event) => setIsMenuOpen(event.target.checked)}
        />

        <div className="nav-scrollable">
          <nav className="nav flex-column">
            {NAV_ITEMS.map((item) => (
              <div className="nav-item px-3" key={item.path}>
                <a
                  className={`nav-link ${path === item.path ? 'active' : ''}`}
                  href={item.path}
                  onClick={(event) => handleNavClick(event, item.path)}
                >
                  <span className={`bi ${item.icon}`} aria-hidden="true"></span>{item.label}
                </a>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <main>
        <div className="top-row px-4">
          <a href="https://learn.microsoft.com/aspnet/core/" target="_blank" rel="noreferrer">
            About
          </a>
        </div>

        <article className="content px-4">{renderRoute(path)}</article>
      </main>
    </div>
  )
}

export default App
