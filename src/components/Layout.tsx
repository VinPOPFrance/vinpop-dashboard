export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 12, color: '#9B9B9B', margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );
}

export function PageSection({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ padding: '0 32px', marginTop: 28 }}>
      {children}
    </section>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E8E6E1',
      borderRadius: 10,
      padding: '20px 22px',
      ...style,
    }}>
      {children}
    </div>
  );
}
