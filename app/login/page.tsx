import type { CSSProperties } from 'react';

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

const containerStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(circle at top left, #FFF7F5 0%, #FAFAF8 50%, #F4F0E9 100%)',
  padding: 24,
};

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 440,
  background: '#FFFFFF',
  border: '1px solid #E8E6E1',
  borderRadius: 16,
  boxShadow: '0 14px 40px rgba(114, 47, 55, 0.1)',
  padding: 28,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6B6B6B',
  display: 'block',
  marginBottom: 8,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #E8E6E1',
  borderRadius: 10,
  background: '#FAFAF8',
  color: '#1A1A1A',
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
};

const buttonStyle: CSSProperties = {
  width: '100%',
  marginTop: 16,
  border: 'none',
  borderRadius: 10,
  background: '#722F37',
  color: '#FFFFFF',
  padding: '10px 14px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

function getErrorMessage(error: string | undefined): string | null {
  if (error === 'invalid') {
    return 'Incorrect password. Please try again.';
  }

  if (error === 'config') {
    return 'Dashboard password is not configured on the server.';
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = getValue(params.error);
  const nextPath = getValue(params.next) ?? '/';
  const errorMessage = getErrorMessage(error);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: '#722F37',
              color: '#FFFFFF',
              borderRadius: 9,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
            }}
          >
            V
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>VinPop Dashboard</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9B9B9B' }}>Internal access only</p>
          </div>
        </div>

        <h1 style={{ margin: 0, fontSize: 22, color: '#1A1A1A' }}>Sign in</h1>
        <p style={{ margin: '6px 0 18px', color: '#6B6B6B', fontSize: 13 }}>
          Enter the dashboard password to continue.
        </p>

        {errorMessage ? (
          <p
            style={{
              margin: '0 0 14px',
              padding: '9px 10px',
              borderRadius: 8,
              background: '#FDECEA',
              color: '#C0392B',
              fontSize: 12,
              border: '1px solid #F4C9C5',
            }}
          >
            {errorMessage}
          </p>
        ) : null}

        <form method="POST" action="/api/login">
          <input type="hidden" name="next" value={nextPath} />
          <label htmlFor="password" style={labelStyle}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>
            Access dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
