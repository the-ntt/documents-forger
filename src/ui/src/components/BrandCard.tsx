import { Link } from 'react-router-dom';
import { Brand } from '../api/client';

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'var(--color-warning-soft)', color: 'var(--color-warning)', label: 'Pending' },
  extracting: { bg: 'var(--color-info-soft)', color: 'var(--color-info)', label: 'Extracting' },
  extracted: { bg: 'var(--color-info-soft)', color: 'var(--color-info)', label: 'Extracted' },
  awaiting_review: { bg: 'var(--color-accent-soft)', color: 'var(--color-accent)', label: 'Review' },
  generating_templates: { bg: 'var(--color-info-soft)', color: 'var(--color-info)', label: 'Generating' },
  ready: { bg: 'var(--color-success-soft)', color: 'var(--color-success)', label: 'Ready' },
  failed: { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)', label: 'Failed' },
};

export default function BrandCard({ brand }: { brand: Brand }) {
  const status = STATUS_CONFIG[brand.status] || { bg: '#f1f5f9', color: '#64748b', label: brand.status };

  return (
    <Link
      to={`/brands/${brand.slug}`}
      style={{
        display: 'block',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        transition: 'all var(--transition)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        e.currentTarget.style.borderColor = 'var(--color-accent)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--color-accent)',
        }}>
          {brand.name.substring(0, 2).toUpperCase()}
        </div>
        <span style={{
          background: status.bg,
          color: status.color,
          padding: '3px 10px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}>
          {status.label}
        </span>
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>
        {brand.name}
      </h3>
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 12 }}>
        /{brand.slug}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--color-border-light)' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          {new Date(brand.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        {brand.document_count !== undefined && (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500 }}>
            {brand.document_count} {brand.document_count === 1 ? 'document' : 'documents'}
          </span>
        )}
      </div>
    </Link>
  );
}
