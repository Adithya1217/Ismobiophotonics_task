import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { useOnline } from '../hooks';
import { BrandMark, Icon } from './ui';

export default function Layout() {
  const { user, logout } = useAuth();
  const online = useOnline();
  return (
    <>
      {!online && <div className="banner" role="alert">You're offline. Changes will work again once you reconnect.</div>}
      <div className="app">
        <aside className="sidebar">
          <NavLink to="/" className="brand"><BrandMark />TASKFLOW</NavLink>
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end><Icon name="dashboard" />Dashboard</NavLink>
            <NavLink to="/projects"><Icon name="folder" />Projects</NavLink>
          </nav>
          <div className="user">
            <span>{user?.name}</span>
            <button className="btn sm" onClick={logout}><Icon name="logout" size={14} />Log out</button>
          </div>
        </aside>
        <main className="main"><Outlet /></main>
      </div>
    </>
  );
}
