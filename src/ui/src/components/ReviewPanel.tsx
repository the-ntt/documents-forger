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
        background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4,
        padding: 12, marginBottom: 16,
      }}>
        Review your design system below. When satisfied, click "Looks Good" to generate templates, or "I Want to Modify" to provide feedback.
      </div>

      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 4, padding: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Design System Preview</h3>
        <DesignSystemPreview brandSlug={brand.slug} assetType="design_system" />
      </div>

      {!showConversation && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleApprove}
            disabled={approving}
            style={{
              background: '#28a745', color: '#fff', border: 'none', padding: '10px 24px',
              borderRadius: 4, cursor: approving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
            {approving ? 'Approving...' : 'Looks Good — Generate Templates'}
          </button>
          <button
            onClick={() => setShowConversation(true)}
            style={{
              background: '#6c757d', color: '#fff', border: 'none', padding: '10px 24px',
              borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
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
