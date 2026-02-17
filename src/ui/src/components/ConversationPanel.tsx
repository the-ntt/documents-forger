import { useState, useRef, useEffect } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

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

  const progressWidth = maxRounds > 0 ? `${(roundNumber / maxRounds) * 100}%` : '0%';

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      marginTop: 16,
      overflow: 'hidden',
      background: 'var(--color-surface)',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span style={{ fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: 14 }}>Design System Feedback</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Round {roundNumber} of {maxRounds}
          </span>
          <div style={{ width: 60, height: 4, background: 'var(--color-border-light)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--color-accent)', width: progressWidth, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        padding: 20, maxHeight: 400, overflowY: 'auto',
        minHeight: 200, background: 'var(--color-bg)',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.2" strokeLinecap="round" style={{ marginBottom: 12, opacity: 0.5 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, maxWidth: 300, margin: '0 auto', lineHeight: 1.6 }}>
              Describe what you'd like to change. For example: "Make the primary color darker" or "Switch to a serif heading font."
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 10,
            animation: 'fadeIn 0.2s ease-out',
          }}>
            <div style={{
              background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
              padding: '10px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              maxWidth: '80%',
              fontSize: 13,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              boxShadow: 'var(--shadow-sm)',
              border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              padding: '10px 16px', borderRadius: '16px 16px 16px 4px',
              fontSize: 13, color: 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)',
                animation: 'pulse 1s infinite',
              }} />
              AI is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isComplete ? (
        <div style={{
          padding: '16px 20px',
          background: 'var(--color-success-soft)',
          borderTop: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-success)', fontWeight: 500 }}>
            Design system updated based on your feedback.
          </p>
          <button
            onClick={onComplete}
            style={{
              background: 'var(--color-success)', color: '#fff', border: 'none',
              padding: '8px 18px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-heading)',
            }}
          >
            Back to Review
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: 8, padding: '14px 20px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your feedback..."
            disabled={sending}
            style={{
              flex: 1, padding: '10px 14px', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', fontSize: 13, outline: 'none',
              background: 'var(--color-bg)', transition: 'border-color var(--transition)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              background: (sending || !input.trim()) ? 'var(--color-border)' : 'var(--color-accent)',
              color: (sending || !input.trim()) ? 'var(--color-text-muted)' : 'var(--color-primary)',
              border: 'none', padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              cursor: (sending || !input.trim()) ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-heading)',
              transition: 'all var(--transition)',
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
