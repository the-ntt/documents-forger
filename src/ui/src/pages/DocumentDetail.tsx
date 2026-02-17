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

  if (loading) return <p>Loading...</p>;
  if (error || !doc) return <p style={{ color: '#d9534f' }}>{error || 'Document not found'}</p>;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/" style={{ color: '#007bff', fontSize: 13 }}>Dashboard</Link>
        <span style={{ color: '#999', margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 13, color: '#666' }}>{doc.title || 'Untitled Document'}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>{doc.title || 'Untitled Document'}</h1>
        <span style={{
          background: doc.status === 'ready' ? '#5cb85c' : '#999',
          color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12,
        }}>{doc.status}</span>
        <span style={{ fontSize: 13, color: '#666' }}>[{doc.format}]</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {doc.pdf_path && (
          <a
            href={api.getDownloadUrl(doc.id)}
            style={{
              background: '#1a1a2e', color: '#fff', padding: '8px 16px',
              borderRadius: 4, textDecoration: 'none', fontSize: 14,
            }}
          >
            Download PDF
          </a>
        )}
        {(doc.rendered_html || doc.edited_html) && (
          <a
            href={api.getDocxDownloadUrl(doc.id)}
            style={{
              background: '#0275d8', color: '#fff', padding: '8px 16px',
              borderRadius: 4, textDecoration: 'none', fontSize: 14,
            }}
          >
            Download Word
          </a>
        )}
        <button
          onClick={handleReRender}
          disabled={reRendering}
          style={{
            background: '#6c757d', color: '#fff', border: 'none', padding: '8px 16px',
            borderRadius: 4, cursor: reRendering ? 'not-allowed' : 'pointer', fontSize: 14,
          }}
        >
          {reRendering ? 'Re-rendering...' : 'Re-render PDF'}
        </button>
      </div>

      {doc.status === 'ready' && (doc.rendered_html || doc.edited_html) && (
        <div>
          <h3 style={{ marginBottom: 8 }}>Edit Document</h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
            Click on any text to edit. Changes auto-save after 1.5 seconds.
          </p>
          <DocumentViewer documentId={doc.id} />
        </div>
      )}

      {doc.status !== 'ready' && (
        <div style={{ background: '#cce5ff', border: '1px solid #b8daff', borderRadius: 4, padding: 12 }}>
          Document is being processed ({doc.status})...
        </div>
      )}
    </div>
  );
}
