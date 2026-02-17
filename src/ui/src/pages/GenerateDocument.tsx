import { useParams, Link } from 'react-router-dom';
import { useBrand } from '../hooks/useBrand';
import DocumentGenerator from '../components/DocumentGenerator';

export default function GenerateDocument() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, loading } = useBrand(slug);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 64 }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
      }} />
    </div>
  );

  if (!brand) return (
    <div style={{ background: 'var(--color-danger-soft)', borderRadius: 'var(--radius-md)', padding: 16, color: 'var(--color-danger)' }}>
      Brand not found
    </div>
  );

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13 }}>
        <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>/</span>
        <Link to={`/brands/${brand.slug}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>{brand.name}</Link>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>Generate Document</span>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Generate Document</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          Create a branded document for <strong>{brand.name}</strong>. Paste markdown content or upload a file — we'll apply the brand's design system automatically.
        </p>
      </div>
      <DocumentGenerator brandSlug={brand.slug} />
    </div>
  );
}
