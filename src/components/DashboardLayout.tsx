import { Sidebar } from './Sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF8' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, paddingBottom: 40 }}>
        {children}
      </main>
    </div>
  );
}
