import { Link } from 'react-router-dom';
import { useBrands } from '../hooks/useBrand';
import BrandCard from '../components/BrandCard';

export default function Dashboard() {
  const { brands, loading, error } = useBrands();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Brands</h1>
        <Link
          to="/brands/new"
          style={{
            background: '#1a1a2e',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 4,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          New Brand
        </Link>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#d9534f' }}>{error}</p>}

      {!loading && brands.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No brands yet</p>
          <p>Create your first brand to get started.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {brands.map((b) => <BrandCard key={b.id} brand={b} />)}
      </div>
    </div>
  );
}
