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

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: 4,
    fontSize: 14,
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Brand Name</label>
        <input value={name} onChange={(e) => handleNameChange(e.target.value)} required style={inputStyle} placeholder="My Brand" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Slug</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required style={inputStyle} placeholder="my-brand" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Website URLs</label>
        {urls.map((url, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            <input
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
              style={inputStyle}
              placeholder="https://example.com"
              type="url"
            />
            {urls.length > 1 && (
              <button type="button" onClick={() => removeUrl(i)} style={{
                background: 'none', border: '1px solid #ddd', borderRadius: 4,
                padding: '4px 8px', cursor: 'pointer', color: '#d9534f',
              }}>
                X
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addUrl} style={{
          background: 'none', border: '1px dashed #007bff', color: '#007bff',
          borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 13, marginTop: 4,
        }}>
          + Add URL
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>PDF Brand Guidelines</label>
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileChange}
          style={{ fontSize: 14 }}
        />
        {pdfFiles.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 13, color: '#666' }}>
            {pdfFiles.map(f => f.name).join(', ')}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: '#1a1a2e',
          color: '#fff',
          border: 'none',
          padding: '10px 24px',
          borderRadius: 4,
          cursor: submitting ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {submitting ? 'Creating...' : 'Create Brand'}
      </button>
    </form>
  );
}
