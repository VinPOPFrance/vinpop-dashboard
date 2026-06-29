'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/business-overview', label: 'Business Overview', icon: '◆' },
  { href: '/', label: 'Overview', icon: '▦' },
  { href: '/funnel', label: 'Funnel', icon: '▽' },
  { href: '/shopify-products-summary', label: 'Shopify Products', icon: '▣' },
  { href: '/shopify-funnel-basic', label: 'Shopify Funnel', icon: '◇' },
  { href: '/startup-pack-analysis', label: 'Startup Packs', icon: '◐' },
  { href: '/stock-movement-summary', label: 'Stock Movement', icon: '▤' },
  { href: '/acquisition-economics-basic', label: 'Acquisition Basic', icon: '◎' },
  { href: '/meta', label: 'Meta Ads', icon: '◈' },
  { href: '/ratings', label: 'Ratings', icon: '★' },
  { href: '/actions', label: 'Actions', icon: '◉' },
  { href: '/todo', label: 'To-do List', icon: '☑' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#FFFFFF',
      borderRight: '1px solid #E8E6E1',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid #E8E6E1',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            background: '#722F37',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
          }}>V</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>VinPop</div>
            <div style={{ fontSize: 11, color: '#9B9B9B' }}>Business Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#9B9B9B', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px 8px' }}>
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 7,
                textDecoration: 'none',
                color: isActive ? '#722F37' : '#6B6B6B',
                background: isActive ? '#F8F0F1' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13.5,
                marginBottom: 1,
                transition: 'all 0.1s',
              }}
            >
              <span style={{ fontSize: 13, opacity: 0.8 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div style={{ borderTop: '1px solid #E8E6E1', marginTop: 12, paddingTop: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 7,
              color: '#C0C0C0',
              fontSize: 13.5,
              cursor: 'not-allowed',
            }}
          >
            <span style={{ fontSize: 13 }}>⚙</span>
            Settings
            <span style={{ marginLeft: 'auto', fontSize: 10, background: '#F5F4F0', color: '#9B9B9B', padding: '1px 6px', borderRadius: 10 }}>Soon</span>
          </div>

          <form action="/api/logout" method="POST" style={{ marginTop: 4 }}>
            <button
              type="submit"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 7,
                border: '1px solid #F1DBDE',
                background: '#FFF6F7',
                color: '#722F37',
                fontSize: 13.5,
                cursor: 'pointer',
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 13 }}>⇠</span>
              Logout
            </button>
          </form>
        </div>
      </nav>

      {/* Sync status */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #E8E6E1',
        fontSize: 11,
        color: '#9B9B9B',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B45309', display: 'inline-block' }} />
          Last sync: yesterday 03:00
        </div>
      </div>
    </aside>
  );
}
