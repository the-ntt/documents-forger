import { Link } from 'react-router-dom';
import { useBrands } from '../hooks/useBrand';
import BrandCard from '../components/BrandCard';

export default function Dashboard() {
  const { brands, loading, error } = useBrands();

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>Brands</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Manage your brand design systems and generate branded documents.
          </p>
        </div>
        <Link
          to="/brands/new"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-primary)',
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--color-accent-hover)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--color-accent)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 4v16m8-8H4" />
          </svg>
          New Brand
        </Link>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <div style={{
            width: 32, height: 32, border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading brands...</p>
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)', padding: 16, color: 'var(--color-danger)',
        }}>
          {error}
        </div>
      )}

      {!loading && brands.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '2px dashed var(--color-border)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--color-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p style={{ fontSize: 17, fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: 6 }}>No brands yet</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
            Create your first brand by providing a website URL or uploading brand guidelines. We'll extract the complete design system automatically.
          </p>
          <Link
            to="/brands/new"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--color-accent)', color: 'var(--color-primary)',
              padding: '10px 24px', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}
          >
            Create Your First Brand
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {brands.map((b) => <BrandCard key={b.id} brand={b} />)}
      </div>
    </div>
  );
}
