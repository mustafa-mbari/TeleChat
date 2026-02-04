export default function Home() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          🤖 Telegram → Notion Bot
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
          Save links from Telegram to your Notion database
        </p>
        <div style={{
          background: '#f5f5f5',
          padding: '2rem',
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <h2 style={{ marginTop: 0 }}>Features:</h2>
          <ul style={{ lineHeight: '1.8' }}>
            <li>📎 Save URLs with categories</li>
            <li>🔍 Search saved links</li>
            <li>📋 List recent links</li>
            <li>🗑️ Delete links</li>
            <li>🔒 User authentication</li>
            <li>⏱️ Rate limiting</li>
            <li>✅ Duplicate URL detection</li>
          </ul>
        </div>
        <p style={{ marginTop: '2rem', color: '#999' }}>
          Webhook endpoint: <code>/api/telegram</code>
        </p>
      </div>
    </div>
  );
}
