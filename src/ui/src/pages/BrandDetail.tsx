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

function CollapsibleSection({ title, defaultOpen = true, children, badge }: { title: string; defaultOpen?: boolean; children: ReactNode; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      marginBottom: 16,
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: open ? 'var(--color-surface)' : 'var(--color-bg)',
          border: 'none', borderBottom: open ? '1px solid var(--color-border-light)' : 'none',
          cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
          fontFamily: 'var(--font-heading)', transition: 'all var(--transition)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{title}</span>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px',
              borderRadius: 20, background: 'var(--color-accent-soft)', color: 'var(--color-accent)',
              fontFamily: 'var(--font-body)',
            }}>
              {badge}
            </span>
          )}
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'transform var(--transition)', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'var(--color-warning-soft)', color: 'var(--color-warning)', label: 'Pending' },
  extracting: { bg: 'var(--color-info-soft)', color: 'var(--color-info)', label: 'Extracting' },
  extracted: { bg: 'var(--color-info-soft)', color: 'var(--color-info)', label: 'Extracted' },
  awaiting_review: { bg: 'var(--color-accent-soft)', color: 'var(--color-accent)', label: 'Awaiting Review' },
  generating_templates: { bg: 'var(--color-info-soft)', color: 'var(--color-info)', label: 'Generating' },
  ready: { bg: 'var(--color-success-soft)', color: 'var(--color-success)', label: 'Ready' },
  failed: { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)', label: 'Failed' },
};

export default function BrandDetail() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { brand, loading, error, refresh } = useBrand(slug);
  const { documents, refresh: refreshDocs } = useDocuments(slug);
  const [tab, setTab] = useState<'overview' | 'documents' | 'prompts'>('overview');
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  const isProcessing = brand && ['extracting', 'extracted', 'generating_templates', 'pending'].includes(brand.status);
  const isAwaitingReview = brand?.status === 'awaiting_review';

  const latestJobId = brand?.latestJob?.id || null;
  const { progressLog, isActive: progressActive } = useJobProgress(isProcessing ? latestJobId : null);

  useEffect(() => {
    if (!isProcessing) return;
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [isProcessing, refresh]);

  useJob(pollingJobId);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 64 }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
      }} />
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading brand...</p>
    </div>
  );

  if (error || !brand) return (
    <div style={{ background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: 16, color: 'var(--color-danger)' }}>
      {error || 'Brand not found'}
    </div>
  );

  const status = STATUS_CONFIG[brand.status] || { bg: '#f1f5f9', color: '#64748b', label: brand.status };
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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
    fontFamily: 'var(--font-heading)',
    transition: 'all var(--transition)',
    letterSpacing: '0.01em',
  });

  const btnPrimary: React.CSSProperties = {
    background: 'var(--color-accent)', color: 'var(--color-primary)',
    border: 'none', padding: '9px 18px', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-heading)',
    transition: 'all var(--transition)', boxShadow: 'var(--shadow-sm)',
  };

  const btnSecondary: React.CSSProperties = {
    background: 'var(--color-bg)', color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)', padding: '9px 18px', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    transition: 'all var(--transition)',
  };

  const btnDanger: React.CSSProperties = {
    background: 'var(--color-danger-soft)', color: 'var(--color-danger)',
    border: '1px solid rgba(239,68,68,0.2)', padding: '9px 18px', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    transition: 'all var(--transition)',
  };

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13 }}>
        <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{brand.name}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, color: 'var(--color-accent)',
        }}>
          {brand.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 26, margin: 0 }}>{brand.name}</h1>
            <span style={{
              background: status.bg, color: status.color,
              padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            }}>
              {status.label}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
            /{brand.slug} &middot; {brand.source_type}: {brand.source_url || 'PDF'}
          </p>
        </div>
      </div>

      {/* Progress log */}
      {isProcessing && (
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <ProgressLog entries={progressLog} isActive={progressActive} />
        </div>
      )}

      {/* Failed state */}
      {brand.status === 'failed' && (
        <div style={{
          background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-lg)', padding: 20, marginTop: 16, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-danger)', fontFamily: 'var(--font-heading)', fontSize: 15 }}>
            Extraction Failed
          </div>
          <p style={{ color: 'var(--color-danger)', margin: '0 0 14px 0', fontSize: 13, whiteSpace: 'pre-wrap', opacity: 0.85 }}>
            {brand.error_message || 'An unknown error occurred during extraction. Try again or use a different source.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleReExtract} style={btnPrimary}>Retry Extraction</button>
            <button onClick={handleDelete} style={btnDanger}>Delete Brand</button>
          </div>
        </div>
      )}

      {brand.error_message && brand.status !== 'failed' && (
        <div style={{
          background: 'var(--color-warning-soft)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--radius-md)', padding: 14, marginTop: 16, marginBottom: 16, fontSize: 13,
          color: '#92400e',
        }}>
          {brand.error_message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--color-border)', marginTop: 24, marginBottom: 24 }}>
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
            <CollapsibleSection title="Design System" badge="AI Generated">
              <DesignSystemPreview brandSlug={brand.slug} assetType="design_system" />
            </CollapsibleSection>
          )}
          {!isProcessing && hasReportTemplate && (
            <CollapsibleSection title="Report Template" defaultOpen={false} badge="A4">
              <DesignSystemPreview brandSlug={brand.slug} assetType="report_template" />
            </CollapsibleSection>
          )}
          {!isProcessing && hasSlidesTemplate && (
            <CollapsibleSection title="Slides Template" defaultOpen={false} badge="16:9">
              <DesignSystemPreview brandSlug={brand.slug} assetType="slides_template" />
            </CollapsibleSection>
          )}

          {!isProcessing && !isAwaitingReview && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              {brand.status === 'ready' && (
                <button onClick={handleRegenerate} style={btnSecondary}>Regenerate Templates</button>
              )}
              <button onClick={handleReExtract} style={btnSecondary}>Re-fetch Guidelines</button>
              <button onClick={handleDelete} style={btnDanger}>Delete Brand</button>
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>Documents</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
                Generate branded reports and presentations from your content.
              </p>
            </div>
            {brand.status === 'ready' && (
              <Link
                to={`/brands/${brand.slug}/documents/new`}
                style={{
                  ...btnPrimary,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 4v16m8-8H4" />
                </svg>
                Generate Document
              </Link>
            )}
          </div>

          {documents.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
              border: '2px dashed var(--color-border)',
            }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                No documents yet. {brand.status === 'ready' ? 'Click "Generate Document" to create your first branded document.' : 'Complete brand setup first to start generating documents.'}
              </p>
            </div>
          )}

          {documents.map((d) => (
            <div key={d.id} style={{
              background: 'var(--color-surface)', padding: '16px 20px', borderRadius: 'var(--radius-md)',
              marginBottom: 8, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)',
              transition: 'all var(--transition)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/documents/${d.id}`} style={{
                  color: 'var(--color-text)', textDecoration: 'none', fontWeight: 600,
                  fontSize: 14, fontFamily: 'var(--font-heading)',
                }}>
                  {d.title || '(Untitled)'} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: 12 }}>[{d.format}]</span>
                </Link>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                  background: d.status === 'ready' ? 'var(--color-success-soft)' : 'var(--color-bg)',
                  color: d.status === 'ready' ? 'var(--color-success)' : 'var(--color-text-muted)',
                }}>
                  {d.status}
                </span>
              </div>
              {d.status === 'ready' && d.pdf_path && (
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <a href={api.getDownloadUrl(d.id)} style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                    Download PDF
                  </a>
                  <a href={api.getDocxDownloadUrl(d.id)} style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                    Download Word
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'prompts' && (
        <div style={{
          background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ fontSize: 16, margin: '0 0 8px', fontFamily: 'var(--font-heading)' }}>Custom Prompts</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 16 }}>
            Customize the AI prompts used for extraction and template generation via the CLI or API.
          </p>
          <pre style={{
            background: 'var(--color-primary)', color: 'var(--color-accent)',
            padding: 16, borderRadius: 'var(--radius-md)', fontSize: 12,
            fontFamily: 'var(--font-mono)', lineHeight: 1.7, overflow: 'auto',
          }}>
{`# View the current extraction prompt
brandforge prompt:show --type=extraction --brand=${brand.slug}

# Set a custom prompt from file
brandforge prompt:set --type=extraction --file=./my-prompt.txt --brand=${brand.slug}`}
          </pre>
        </div>
      )}
    </div>
  );
}
