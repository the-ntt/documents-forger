import { Link } from 'react-router-dom';
import { Brand } from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f0ad4e',
  extracting: '#5bc0de',
  extracted: '#5bc0de',
  generating_templates: '#5bc0de',
  ready: '#5cb85c',
  failed: '#d9534f',
};

export default function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link
      to={`/brands/${brand.slug}`}
      style={{
        display: 'block',
        background: '#fff',
        borderRadius: 8,
        padding: 20,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{brand.name}</h3>
        <span style={{
          background: STATUS_COLORS[brand.status] || '#999',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
        }}>{brand.status}</span>
      </div>
      <div style={{ color: '#666', fontSize: 14 }}>
        <span>/{brand.slug}</span>
        {brand.document_count !== undefined && (
          <span style={{ marginLeft: 12 }}>{brand.document_count} documents</span>
        )}
      </div>
      <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
        {new Date(brand.created_at).toLocaleDateString()}
      </div>
    </Link>
  );
}
