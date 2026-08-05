const BACKEND = (typeof window !== 'undefined' && window.__BACKEND_URL__)
  ? String(window.__BACKEND_URL__).replace(/\/$/, '')
  : window.location.origin;

function backendUrl(path) {
  return `${BACKEND}${path.startsWith('/') ? path : `/${path}`}`;
}

function addMessage(role, text) {
  const box = document.getElementById('chatBox');
  if (!box) return null;

  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  addMessage('user', text);
  input.value = '';

  addMessage('ai', 'Thinking...');

  try {
    const res = await fetch(backendUrl('/math-tutor'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text })
    });

    const data = await res.json();
    addMessage('ai', data.answer || "I couldn't solve that.");
  } catch (err) {
    addMessage('ai', 'Connection failed.');
  }
}

async function openCamera() {
  const video = document.getElementById('cameraStream');
  if (!video) return;

  try {
    video.style.display = 'block';
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.onclick = () => capturePhoto(video, stream);
  } catch (err) {
    addMessage('ai', 'Camera access was denied.');
  }
}

function capturePhoto(video, stream) {
  const canvas = document.getElementById('cameraCapture');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);

  stream.getTracks().forEach((t) => t.stop());
  video.style.display = 'none';

  canvas.toBlob((blob) => {
    if (blob) sendImage(blob);
  });
}

function uploadPhoto() {
  const input = document.getElementById('photoUpload');
  const file = input?.files?.[0];
  if (file) sendImage(file);
}

async function sendImage(imageBlob) {
  addMessage('user', '📸 Sent a photo... analyzing it now.');

  const formData = new FormData();
  formData.append('image', imageBlob);

  try {
    const res = await fetch(backendUrl('/solve-image'), {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    addMessage('ai', data.answer || "I couldn't read the image.");
  } catch (err) {
    addMessage('ai', 'Connection failed.');
  }
}

async function testBackend() {
  const statusEl = document.getElementById('backendStatus');
  if (!statusEl) return;

  statusEl.textContent = 'Testing backend...';
  try {
    const res = await fetch(backendUrl('/test'), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    const data = await res.json();
    statusEl.textContent = `Backend status: ${JSON.stringify(data)}`;
  } catch (err) {
    statusEl.textContent = 'Backend test failed. Check that the server is running.';
  }
}

function showWork() {
  addMessage('ai', 'Show work is not configured in this script yet.');
}

document.getElementById('userInput')?.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('chatBox');
  if (box && box.children.length === 0) {
    addMessage('ai', 'Hi! What math problem can I help you with today?');
  }
});
