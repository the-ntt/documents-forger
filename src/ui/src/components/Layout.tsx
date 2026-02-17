import React from 'react';
import Navbar from './Navbar';
import WhatsAppButton from './WhatsAppButton';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <main style={{
        flex: 1,
        marginLeft: 260,
        padding: '32px 40px',
        maxWidth: 1400,
        minHeight: '100vh',
      }}>
        {children}
      </main>
      <WhatsAppButton />
    </div>
  );
}
