import { useState } from 'react';
import { api } from '../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  brandSlug: string;
  onComplete: () => void;
}

export default function ConversationPanel({ brandSlug, onComplete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [roundNumber, setRoundNumber] = useState(0);
  const [maxRounds, setMaxRounds] = useState(5);
  const [isComplete, setIsComplete] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const result = await api.sendConversationMessage(brandSlug, userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      setRoundNumber(result.roundNumber);
      setMaxRounds(result.maxRounds);

      if (result.isComplete) {
        setIsComplete(true);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 4, marginTop: 16 }}>
      <div style={{
        background: '#f8f9fa', padding: '8px 12px', borderBottom: '1px solid #dee2e6',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <strong>Design System Feedback</strong>
        <span style={{ fontSize: 12, color: '#666' }}>
          Question {roundNumber} of {maxRounds}
        </span>
      </div>

      <div style={{
        padding: 12, maxHeight: 400, overflowY: 'auto',
        minHeight: 200, background: '#fff',
      }}>
        {messages.length === 0 && (
          <p style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Describe what you'd like to change about the design system...
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 8,
          }}>
            <div style={{
              background: msg.role === 'user' ? '#1a1a2e' : '#e9ecef',
              color: msg.role === 'user' ? '#fff' : '#212529',
              padding: '8px 12px',
              borderRadius: 12,
              maxWidth: '80%',
              fontSize: 14,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
            <div style={{
              background: '#e9ecef', padding: '8px 12px', borderRadius: 12,
              fontSize: 14, color: '#666',
            }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      {isComplete ? (
        <div style={{ padding: 12, background: '#d4edda', borderTop: '1px solid #c3e6cb' }}>
          <p style={{ margin: 0, marginBottom: 8, fontSize: 14 }}>
            Design system updated based on your feedback.
          </p>
          <button
            onClick={onComplete}
            style={{
              background: '#28a745', color: '#fff', border: 'none', padding: '8px 16px',
              borderRadius: 4, cursor: 'pointer', fontSize: 14,
            }}
          >
            Back to Review
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: 8, padding: 12,
          borderTop: '1px solid #dee2e6', background: '#f8f9fa',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your feedback..."
            disabled={sending}
            style={{
              flex: 1, padding: '8px 12px', border: '1px solid #ddd',
              borderRadius: 4, fontSize: 14,
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              background: '#1a1a2e', color: '#fff', border: 'none', padding: '8px 16px',
              borderRadius: 4, cursor: (sending || !input.trim()) ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 600,
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
