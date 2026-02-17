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
          // Read as text and submit as markdown
          const text = await uploadFile.text();
          result = await api.createDocument(brandSlug, {
            title: title || uploadFile.name.replace(/\.[^.]+$/, ''),
            format,
            markdownContent: text,
          });
        } else {
          // Submit as file upload for conversion
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

    // For text files, also load content into textarea
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['md', 'txt', 'markdown'].includes(ext || '')) {
      const reader = new FileReader();
      reader.onload = () => setMarkdown(reader.result as string);
      reader.readAsText(file);
    }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14 };

  return (
    <div>
      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <JobStatus jobId={jobId} onComplete={onGenerated} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Format</label>
          <div style={{ display: 'flex', gap: 16 }}>
            <label><input type="radio" checked={format === 'report'} onChange={() => setFormat('report')} /> Report (A4)</label>
            <label><input type="radio" checked={format === 'slides'} onChange={() => setFormat('slides')} /> Slides (16:9)</label>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} placeholder="Q1 Report" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Content</label>
          <textarea
            value={markdown}
            onChange={(e) => { setMarkdown(e.target.value); setUploadFile(null); }}
            rows={15}
            style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
            placeholder="# My Report&#10;&#10;## Section 1&#10;&#10;Content here..."
          />
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ cursor: 'pointer', color: '#007bff', fontSize: 13 }}>
              Upload file (.md, .txt, .docx, .pdf, .pptx)
              <input
                type="file"
                accept=".md,.txt,.markdown,.docx,.pdf,.pptx"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            {uploadFile && (
              <span style={{ fontSize: 13, color: '#666' }}>
                {uploadFile.name}
                <button type="button" onClick={() => { setUploadFile(null); }} style={{
                  background: 'none', border: 'none', color: '#d9534f', cursor: 'pointer', marginLeft: 4,
                }}>x</button>
              </span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !!jobId}
          style={{
            background: '#1a1a2e',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: 4,
            cursor: (submitting || !!jobId) ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {submitting ? 'Generating...' : 'Generate'}
        </button>
      </form>
    </div>
  );
}
