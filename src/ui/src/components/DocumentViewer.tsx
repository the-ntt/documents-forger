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
        // Debounce save
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

  if (loading) return <p>Loading document...</p>;
  if (error) return <p style={{ color: '#d9534f' }}>{error}</p>;
  if (!html) return <p>No rendered HTML available for this document.</p>;

  // Inject contentEditable script into the HTML
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
          fontSize: 12, color: saving ? '#007bff' : '#f0ad4e',
          marginBottom: 4, fontWeight: 600,
        }}>
          {saving ? 'Saving...' : 'Unsaved changes'}
        </div>
      )}
      <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
        <iframe
          ref={iframeRef}
          srcDoc={enhancedHtml}
          title="Document Editor"
          style={{ width: '100%', height: 600, border: 'none' }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}
