import { useState } from 'react';
import { api, Brand } from '../api/client';
import DesignSystemPreview from './DesignSystemPreview';
import ConversationPanel from './ConversationPanel';

interface Props {
  brand: Brand;
  onApproved: (jobId: string) => void;
}

export default function ReviewPanel({ brand, onApproved }: Props) {
  const [showConversation, setShowConversation] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setApproving(true);
    setError('');
    try {
      const result = await api.approveBrand(brand.slug);
      onApproved(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        background: 'var(--color-accent-soft)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, fontFamily: 'var(--font-heading)', marginBottom: 4, color: 'var(--color-text)' }}>
            Review Your Design System
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Our AI has extracted your brand's design tokens. Review the preview below. If it looks good, approve it to generate document templates. If something needs adjusting, click "Modify" to provide specific feedback.
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 16,
          color: 'var(--color-danger)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{
        marginBottom: 20, background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--color-border-light)',
          fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14,
        }}>
          Design System Preview
        </div>
        <DesignSystemPreview brandSlug={brand.slug} assetType="design_system" />
      </div>

      {!showConversation && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleApprove}
            disabled={approving}
            style={{
              background: 'var(--color-success)',
              color: '#fff',
              border: 'none',
              padding: '11px 24px',
              borderRadius: 'var(--radius-md)',
              cursor: approving ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-heading)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {approving ? 'Approving...' : 'Looks Good - Generate Templates'}
          </button>
          <button
            onClick={() => setShowConversation(true)}
            style={{
              background: 'var(--color-bg)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              padding: '11px 24px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-heading)',
              transition: 'all var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            I Want to Modify
          </button>
        </div>
      )}

      {showConversation && (
        <ConversationPanel
          brandSlug={brand.slug}
          onComplete={() => {
            setShowConversation(false);
          }}
        />
      )}
    </div>
  );
}
