import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function BrandOnboardingForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const addUrl = () => setUrls([...urls, '']);
  const removeUrl = (i: number) => setUrls(urls.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, value: string) => {
    const updated = [...urls];
    updated[i] = value;
    setUrls(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPdfFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const validUrls = urls.filter(u => u.trim());

      if (validUrls.length === 0 && pdfFiles.length === 0) {
        setError('At least one URL or PDF file is required');
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('slug', slug);
      formData.append('urls', JSON.stringify(validUrls));
      formData.append('sourceType', validUrls.length > 0 ? 'url' : 'pdf');

      if (validUrls.length > 0) {
        formData.append('sourceUrl', validUrls[0]);
      }

      for (const file of pdfFiles) {
        formData.append('pdfs', file);
      }

      await api.createBrand(formData);
      navigate(`/brands/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create brand');
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 13,
    color: 'var(--color-text)',
    fontFamily: 'var(--font-heading)',
  };

  const hintStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginTop: 4,
  };

  return (
    <form onSubmit={handleSubmit} style={{
      maxWidth: 560,
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: 32,
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {error && (
        <div style={{
          background: 'var(--color-danger-soft)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          marginBottom: 20,
          color: 'var(--color-danger)',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Brand Name</label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          style={inputStyle}
          placeholder="e.g. Acme Corporation"
          onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
        />
        <p style={hintStyle}>The display name for this brand.</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          style={inputStyle}
          placeholder="acme-corp"
          onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
        />
        <p style={hintStyle}>Auto-generated URL-friendly identifier. Used in file paths and API endpoints.</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Website URLs</label>
        <p style={{ ...hintStyle, marginTop: 0, marginBottom: 8 }}>
          Enter homepage or brand guideline page URLs. We'll extract colors, fonts, and visual identity from these pages.
        </p>
        {urls.map((url, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
              style={inputStyle}
              placeholder="https://example.com"
              type="url"
              onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
            />
            {urls.length > 1 && (
              <button type="button" onClick={() => removeUrl(i)} style={{
                background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                padding: '0 10px', cursor: 'pointer', color: 'var(--color-danger)', fontSize: 14,
                transition: 'all var(--transition)',
              }}>
                &times;
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addUrl} style={{
          background: 'none', border: '1px dashed var(--color-accent)',
          color: 'var(--color-accent)',
          borderRadius: 'var(--radius-md)', padding: '6px 14px', cursor: 'pointer',
          fontSize: 12, marginTop: 4, fontWeight: 500,
          transition: 'all var(--transition)',
        }}>
          + Add another URL
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>PDF Brand Guidelines</label>
        <p style={{ ...hintStyle, marginTop: 0, marginBottom: 8 }}>
          Optionally upload PDF files containing brand guidelines, style guides, or design specifications.
        </p>
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '20px 16px',
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
          fontSize: 13,
          transition: 'all var(--transition)',
          background: 'var(--color-bg)',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          {pdfFiles.length > 0 ? pdfFiles.map(f => f.name).join(', ') : 'Click to upload PDF files'}
          <input
            type="file"
            multiple
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%',
          background: submitting ? 'var(--color-text-muted)' : 'var(--color-accent)',
          color: submitting ? '#fff' : 'var(--color-primary)',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 'var(--radius-md)',
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
          letterSpacing: '0.01em',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all var(--transition)',
        }}
      >
        {submitting ? 'Creating Brand...' : 'Create Brand'}
      </button>
    </form>
  );
}
