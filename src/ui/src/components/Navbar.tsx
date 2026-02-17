import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/brands/new', label: 'New Brand', icon: 'M12 4v16m8-8H4' },
  { to: '/logs', label: 'System Logs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
];

function SvgIcon({ path }: { path: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function Navbar() {
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 260,
      background: 'var(--color-primary)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <Link to="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '28px 24px 24px',
        textDecoration: 'none',
        color: '#fff',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: 18,
          color: 'var(--color-primary)',
        }}>
          DF
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            Documents Forger
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            fontWeight: 400,
            letterSpacing: '0.02em',
          }}>
            Brand Design System
          </div>
        </div>
      </Link>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 16px 8px' }} />

      {/* Navigation items */}
      <div style={{ flex: 1, padding: '8px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', padding: '8px 12px 6px', marginBottom: 2 }}>
          Navigation
        </div>
        {NAV_ITEMS.map(item => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'rgba(212,175,55,0.15)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13.5,
                transition: 'all var(--transition)',
                marginBottom: 2,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }
              }}
            >
              <SvgIcon path={item.icon} />
              {item.label}
              {isActive && (
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                  marginLeft: 'auto',
                }} />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
      }}>
        Documents Forger v1.0
      </div>
    </nav>
  );
}
