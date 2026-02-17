import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

interface Props {
  documentId: string;
}

export default function DocumentViewer({ documentId }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const loadHtml = async () => {
      try {
        const result = await api.getDocumentHtml(documentId);
        setHtml(result.html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load HTML');
      } finally {
        setLoading(false);
      }
    };
    loadHtml();
  }, [documentId]);

  const saveContent = useCallback(async (editedHtml: string) => {
    setSaving(true);
    try {
      await api.saveDocumentContent(documentId, editedHtml);
      setHasUnsaved(false);
    } catch {
      // Silently fail, will retry on next edit
    } finally {
      setSaving(false);
    }
  }, [documentId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'content-updated' && event.data.html) {
        setHasUnsaved(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveContent(event.data.html);
        }, 1500);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [saveContent]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{
        width: 24, height: 24, border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto',
      }} />
    </div>
  );

  if (error) return (
    <div style={{ background: 'var(--color-danger-soft)', borderRadius: 'var(--radius-md)', padding: 14, color: 'var(--color-danger)', fontSize: 13 }}>
      {error}
    </div>
  );

  if (!html) return (
    <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 20, color: 'var(--color-text-muted)', fontSize: 13, textAlign: 'center' }}>
      No rendered HTML available for this document.
    </div>
  );

  const editableScript = `
    <script>
      const editableSelectors = 'p, h1, h2, h3, h4, h5, h6, li, td, th, span, blockquote';
      document.querySelectorAll(editableSelectors).forEach(el => {
        el.style.cursor = 'text';
        el.addEventListener('click', function() {
          this.contentEditable = 'true';
          this.focus();
        });
        el.addEventListener('blur', function() {
          this.contentEditable = 'false';
          window.parent.postMessage({
            type: 'content-updated',
            html: document.documentElement.outerHTML
          }, '*');
        });
      });
    </script>
  `;

  const enhancedHtml = html.replace('</body>', `${editableScript}</body>`);

  return (
    <div>
      {(hasUnsaved || saving) && (
        <div style={{
          fontSize: 12,
          color: saving ? 'var(--color-info)' : 'var(--color-warning)',
          marginBottom: 8, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {saving ? (
            <>
              <div style={{ width: 10, height: 10, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-info)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Saving changes...
            </>
          ) : (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-warning)' }} />
              Unsaved changes
            </>
          )}
        </div>
      )}
      <div style={{
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
        overflow: 'hidden', background: '#fff', boxShadow: 'var(--shadow-md)',
      }}>
        <iframe
          ref={iframeRef}
          srcDoc={enhancedHtml}
          title="Document Editor"
          style={{ width: '100%', height: 700, border: 'none' }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
