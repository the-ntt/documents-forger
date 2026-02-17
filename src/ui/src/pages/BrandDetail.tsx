import { useState, useEffect, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBrand } from '../hooks/useBrand';
import { useDocuments } from '../hooks/useDocument';
import { useJob } from '../hooks/useJob';
import { useJobProgress } from '../hooks/useJobProgress';
import DesignSystemPreview from '../components/DesignSystemPreview';
import ProgressLog from '../components/ProgressLog';
import ReviewPanel from '../components/ReviewPanel';
import { api } from '../api/client';

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16, border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 16px', background: '#f8f9fa', border: 'none', cursor: 'pointer',
          fontSize: 15, fontWeight: 600, color: '#333',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 12, color: '#999' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: 0 }}>{children}</div>}
    </div>
  );
}

export default function BrandDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { brand, loading, error, refresh } = useBrand(slug);
  const { documents, refresh: refreshDocs } = useDocuments(slug);
  const [tab, setTab] = useState<'overview' | 'documents' | 'prompts'>('overview');
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  const isProcessing = brand && ['extracting', 'extracted', 'generating_templates', 'pending'].includes(brand.status);
  const isAwaitingReview = brand?.status === 'awaiting_review';

  // F1: Get the latest job ID for progress polling
  const latestJobId = brand?.latestJob?.id || null;
  const { progressLog, isActive: progressActive } = useJobProgress(isProcessing ? latestJobId : null);

  // Auto-poll brand status when processing
  useEffect(() => {
    if (!isProcessing) return;
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [isProcessing, refresh]);

  useJob(pollingJobId);

  if (loading) return <p>Loading...</p>;
  if (error || !brand) return <p style={{ color: '#d9534f' }}>{error || 'Brand not found'}</p>;

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f0ad4e', extracting: '#5bc0de', extracted: '#5bc0de',
    awaiting_review: '#f0ad4e',
    generating_templates: '#5bc0de', ready: '#5cb85c', failed: '#d9534f',
  };

  const hasDesignSystem = brand.assets?.some((a) => a.asset_type === 'design_system');
  const hasReportTemplate = brand.assets?.some((a) => a.asset_type === 'report_template');
  const hasSlidesTemplate = brand.assets?.some((a) => a.asset_type === 'slides_template');

  const handleRegenerate = async () => {
    try {
      const { jobId } = await api.regenerateTemplates(brand.slug);
      setPollingJobId(jobId);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleReExtract = async () => {
    if (brand.status !== 'failed' && !confirm('Re-fetch brand guidelines from the source? This will overwrite existing design system and templates.')) return;
    try {
      const { jobId } = await api.reExtract(brand.slug);
      setPollingJobId(jobId);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Permanently delete brand "${brand.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteBrand(brand.slug);
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const tabStyle = (active: boolean) => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: active ? '2px solid #1a1a2e' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <h1>{brand.name}</h1>
        <span style={{
          background: STATUS_COLORS[brand.status] || '#999',
          color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12,
        }}>{brand.status}</span>
      </div>
      <p style={{ color: '#666', marginBottom: 16 }}>/{brand.slug} &middot; {brand.source_type}: {brand.source_url || 'PDF'}</p>

      {isProcessing && (
        <div style={{ marginBottom: 16 }}>
          <ProgressLog entries={progressLog} isActive={progressActive} />
        </div>
      )}

      {brand.status === 'failed' && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#721c24' }}>Extraction Failed</div>
          <p style={{ color: '#721c24', margin: '0 0 12px 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>
            {brand.error_message || 'An unknown error occurred during extraction.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleReExtract} style={{
              background: '#0275d8', color: '#fff', border: 'none', padding: '8px 16px',
              borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              Retry with Same Source
            </button>
            <button onClick={handleDelete} style={{
              background: '#6c757d', color: '#fff', border: 'none', padding: '8px 16px',
              borderRadius: 4, cursor: 'pointer', fontSize: 13,
            }}>
              Delete &amp; Start Over
            </button>
          </div>
        </div>
      )}
      {brand.error_message && brand.status !== 'failed' && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: 12, marginBottom: 16 }}>
          {brand.error_message}
        </div>
      )}

      <div style={{ borderBottom: '1px solid #ddd', marginBottom: 24 }}>
        <button style={tabStyle(tab === 'overview')} onClick={() => setTab('overview')}>Overview</button>
        <button style={tabStyle(tab === 'documents')} onClick={() => setTab('documents')}>Documents</button>
        <button style={tabStyle(tab === 'prompts')} onClick={() => setTab('prompts')}>Prompts</button>
      </div>

      {tab === 'overview' && (
        <div>
          {isAwaitingReview && (
            <ReviewPanel brand={brand} onApproved={(jobId) => {
              setPollingJobId(jobId);
              refresh();
            }} />
          )}

          {!isProcessing && !isAwaitingReview && hasDesignSystem && (
            <CollapsibleSection title="Design System">
              <DesignSystemPreview brandSlug={brand.slug} assetType="design_system" />
            </CollapsibleSection>
          )}
          {!isProcessing && hasReportTemplate && (
            <CollapsibleSection title="Report Template" defaultOpen={false}>
              <DesignSystemPreview brandSlug={brand.slug} assetType="report_template" />
            </CollapsibleSection>
          )}
          {!isProcessing && hasSlidesTemplate && (
            <CollapsibleSection title="Slides Template" defaultOpen={false}>
              <DesignSystemPreview brandSlug={brand.slug} assetType="slides_template" />
            </CollapsibleSection>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {brand.status === 'ready' && (
              <button onClick={handleRegenerate} style={{
                background: '#6c757d', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
              }}>
                Regenerate Templates
              </button>
            )}
            {!isProcessing && (
              <button onClick={handleReExtract} style={{
                background: '#0275d8', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
              }}>
                Re-fetch Brand Guidelines
              </button>
            )}
            <button onClick={handleDelete} style={{
              background: '#d9534f', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
            }}>
              Delete Brand
            </button>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>Documents</h3>
            {brand.status === 'ready' && (
              <Link
                to={`/brands/${brand.slug}/documents/new`}
                style={{ background: '#1a1a2e', color: '#fff', padding: '8px 16px', borderRadius: 4, textDecoration: 'none', fontSize: 14 }}
              >
                Generate Document
              </Link>
            )}
          </div>
          {documents.length === 0 && <p style={{ color: '#999' }}>No documents yet.</p>}
          {documents.map((d) => (
            <div key={d.id} style={{ background: '#fff', padding: 12, borderRadius: 4, marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Link to={`/documents/${d.id}`} style={{ color: '#007bff', textDecoration: 'none' }}>
                  {d.title || '(untitled)'} [{d.format}]
                </Link>
                <span style={{ color: d.status === 'ready' ? '#5cb85c' : '#999' }}>{d.status}</span>
              </div>
              {d.status === 'ready' && d.pdf_path && (
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <a href={api.getDownloadUrl(d.id)} style={{ fontSize: 13, color: '#007bff' }}>Download PDF</a>
                  <a href={api.getDocxDownloadUrl(d.id)} style={{ fontSize: 13, color: '#007bff' }}>Download Word</a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'prompts' && (
        <div>
          <p style={{ color: '#666' }}>Prompt management is available via the CLI or API.</p>
          <pre style={{ background: '#f8f9fa', padding: 12, borderRadius: 4, fontSize: 13 }}>
{`brandforge prompt:show --type=extraction --brand=${brand.slug}
brandforge prompt:set --type=extraction --file=./my-prompt.txt --brand=${brand.slug}`}
          </pre>
        </div>
      )}
    </div>
  );
}
