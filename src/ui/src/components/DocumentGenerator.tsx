import { useState, FormEvent } from 'react';
import { api } from '../api/client';
import JobStatus from './JobStatus';

export default function DocumentGenerator({ brandSlug, onGenerated }: { brandSlug: string; onGenerated?: () => void }) {
  const [format, setFormat] = useState<'report' | 'slides'>('report');
  const [title, setTitle] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let result;

      if (uploadFile) {
        const ext = uploadFile.name.split('.').pop()?.toLowerCase();
        const isTextFile = ['md', 'txt', 'markdown'].includes(ext || '');

        if (isTextFile) {
          const text = await uploadFile.text();
          result = await api.createDocument(brandSlug, {
            title: title || uploadFile.name.replace(/\.[^.]+$/, ''),
            format,
            markdownContent: text,
          });
        } else {
          result = await api.createDocumentFromFile(brandSlug, {
            title: title || undefined,
            format,
            file: uploadFile,
          });
        }
      } else {
        if (!markdown.trim()) {
          setError('Please enter markdown content or upload a file');
          setSubmitting(false);
          return;
        }
        result = await api.createDocument(brandSlug, {
          title: title || undefined,
          format,
          markdownContent: markdown,
        });
      }

      setJobId(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['md', 'txt', 'markdown'].includes(ext || '')) {
      const reader = new FileReader();
      reader.onload = () => setMarkdown(reader.result as string);
      reader.readAsText(file);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    fontSize: 14, background: 'var(--color-surface)', color: 'var(--color-text)',
    outline: 'none', transition: 'border-color var(--transition), box-shadow var(--transition)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontWeight: 600,
    fontSize: 13, color: 'var(--color-text)', fontFamily: 'var(--font-heading)',
  };

  const hintStyle: React.CSSProperties = {
    fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4,
  };

  return (
    <div style={{
      maxWidth: 640, background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)', padding: 32,
      border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)',
    }}>
      {error && (
        <div style={{
          background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 20,
          color: 'var(--color-danger)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <JobStatus jobId={jobId} onComplete={onGenerated} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Format</label>
          <p style={{ ...hintStyle, marginTop: 0, marginBottom: 10 }}>
            Choose the document layout. Reports use A4 portrait, slides use 16:9 landscape.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['report', 'slides'] as const).map(f => (
              <label key={f} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: format === f ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: format === f ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                fontWeight: format === f ? 600 : 400, fontSize: 13,
                transition: 'all var(--transition)',
              }}>
                <input type="radio" checked={format === f} onChange={() => setFormat(f)} style={{ display: 'none' }} />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={format === f ? 'var(--color-accent)' : 'var(--color-text-muted)'} strokeWidth="1.8" strokeLinecap="round">
                  {f === 'report'
                    ? <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />
                    : <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2z M2 12h20" />
                  }
                </svg>
                {f === 'report' ? 'Report (A4)' : 'Slides (16:9)'}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Title <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span></label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            style={inputStyle} placeholder="Q1 Business Report"
            onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
          />
          <p style={hintStyle}>Give your document a descriptive name for easy identification later.</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Content</label>
          <p style={{ ...hintStyle, marginTop: 0, marginBottom: 8 }}>
            Enter your content in Markdown format, or upload a file (.md, .txt, .docx, .pdf, .pptx).
          </p>
          <textarea
            value={markdown}
            onChange={(e) => { setMarkdown(e.target.value); setUploadFile(null); }}
            rows={12}
            style={{
              ...inputStyle, fontFamily: 'var(--font-mono)', resize: 'vertical',
              fontSize: 13, lineHeight: 1.6,
            }}
            placeholder="# My Report&#10;&#10;## Section 1&#10;&#10;Your content here..."
            onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
          />
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{
              cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--color-accent)', transition: 'all var(--transition)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Upload file
              <input type="file" accept=".md,.txt,.markdown,.docx,.pdf,.pptx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            {uploadFile && (
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {uploadFile.name}
                <button type="button" onClick={() => setUploadFile(null)} style={{
                  background: 'none', border: 'none', color: 'var(--color-danger)',
                  cursor: 'pointer', fontSize: 14, padding: 0,
                }}>
                  &times;
                </button>
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !!jobId}
          style={{
            width: '100%',
            background: (submitting || !!jobId) ? 'var(--color-text-muted)' : 'var(--color-accent)',
            color: (submitting || !!jobId) ? '#fff' : 'var(--color-primary)',
            border: 'none', padding: '12px 24px',
            borderRadius: 'var(--radius-md)',
            cursor: (submitting || !!jobId) ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)',
            boxShadow: 'var(--shadow-sm)', transition: 'all var(--transition)',
          }}
        >
          {submitting ? 'Generating...' : 'Generate Document'}
        </button>
      </form>
    </div>
  );
}
