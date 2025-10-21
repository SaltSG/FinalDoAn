import { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState<string>('Đang kiểm tra...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data.status ?? 'ok'))
      .catch(() => setHealth('error'));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Study Tracker</h1>
      <p>API health: {health}</p>
    </div>
  );
}


