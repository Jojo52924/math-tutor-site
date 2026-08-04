const DEFAULT_API_BASE_URL = (typeof window !== 'undefined' && window.__BACKEND_URL__)
  ? window.__BACKEND_URL__
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://127.0.0.1:3000'
    : (typeof window !== 'undefined' && window.location.origin) || 'http://127.0.0.1:3000';

const API_BASE_URL = DEFAULT_API_BASE_URL.replace(/\/$/, '');

function testBackendUrl() {
  return `${API_BASE_URL}/test`;
}

async function subscribe(priceId) {
  const res = await fetch(`${API_BASE_URL}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId })
  });

  const data = await res.json();
  window.location = data.url;
}
