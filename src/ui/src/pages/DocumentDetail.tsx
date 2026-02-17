import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Document as DocType } from '../api/client';
import DocumentViewer from '../components/DocumentViewer';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reRendering, setReRendering] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const d = await api.getDocument(id);
        setDoc(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleReRender = async () => {
    if (!id) return;
    setReRendering(true);
    try {
      await api.reRenderDocument(id);
      const d = await api.getDocument(id);
      setDoc(d);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Re-render failed');
    } finally {
      setReRendering(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 64 }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
      }} />
    </div>
  );

  if (error || !doc) return (
    <div style={{ background: 'var(--color-danger-soft)', borderRadius: 'var(--radius-md)', padding: 16, color: 'var(--color-danger)' }}>
      {error || 'Document not found'}
    </div>
  );

  const btnStyle = (bg: string, color: string, border?: string): React.CSSProperties => ({
    background: bg, color, border: border || 'none',
    padding: '9px 18px', borderRadius: 'var(--radius-md)',
    textDecoration: 'none', fontSize: 13, fontWeight: 600,
    fontFamily: 'var(--font-heading)', cursor: 'pointer',
    transition: 'all var(--transition)', boxShadow: 'var(--shadow-sm)',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  });

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13 }}>
        <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{doc.title || 'Untitled Document'}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>{doc.title || 'Untitled Document'}</h1>
        <span style={{
          background: doc.status === 'ready' ? 'var(--color-success-soft)' : 'var(--color-bg)',
          color: doc.status === 'ready' ? 'var(--color-success)' : 'var(--color-text-muted)',
          padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        }}>
          {doc.status}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '3px 10px', background: 'var(--color-bg)', borderRadius: 20 }}>
          {doc.format}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, marginTop: 16 }}>
        {doc.pdf_path && (
          <a href={api.getDownloadUrl(doc.id)} style={btnStyle('var(--color-accent)', 'var(--color-primary)')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download PDF
          </a>
        )}
        {(doc.rendered_html || doc.edited_html) && (
          <a href={api.getDocxDownloadUrl(doc.id)} style={btnStyle('var(--color-primary)', '#fff')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />
            </svg>
            Download Word
          </a>
        )}
        <button
          onClick={handleReRender}
          disabled={reRendering}
          style={btnStyle('var(--color-bg)', 'var(--color-text-secondary)', '1px solid var(--color-border)')}
        >
          {reRendering ? (
            <>
              <div style={{ width: 14, height: 14, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Re-rendering...
            </>
          ) : 'Re-render PDF'}
        </button>
      </div>

      {/* Document viewer */}
      {doc.status === 'ready' && (doc.rendered_html || doc.edited_html) && (
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12,
          }}>
            <h3 style={{ fontSize: 16, margin: 0, fontFamily: 'var(--font-heading)' }}>Document Editor</h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Click on any text to edit inline. Changes auto-save after 1.5 seconds.
            </span>
          </div>
          <DocumentViewer documentId={doc.id} />
        </div>
      )}

      {doc.status !== 'ready' && (
        <div style={{
          background: 'var(--color-info-soft)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 20, height: 20, border: '2px solid rgba(59,130,246,0.3)',
            borderTopColor: 'var(--color-info)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: 'var(--color-info)', fontSize: 14, fontWeight: 500 }}>
            Document is being processed ({doc.status})...
          </span>
        </div>
      )}
    </div>
  );
}
