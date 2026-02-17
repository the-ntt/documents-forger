import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{
      background: '#1a1a2e',
      color: '#fff',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
    }}>
      <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 20 }}>
        BrandForge
      </Link>
      <Link to="/" style={{ color: '#ccc', textDecoration: 'none' }}>Dashboard</Link>
      <Link to="/brands/new" style={{ color: '#ccc', textDecoration: 'none' }}>New Brand</Link>
      <Link to="/logs" style={{ color: '#ccc', textDecoration: 'none' }}>Logs</Link>
    </nav>
  );
}
