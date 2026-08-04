let lastAnswer = '';
let lastQuestion = '';
let cameraStream = null;

const DEFAULT_API_BASE_URL = (typeof window !== 'undefined' && window.__BACKEND_URL__)
  ? window.__BACKEND_URL__
  : 'http://127.0.0.1:3000';

const API_BASE_URL = DEFAULT_API_BASE_URL.replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function testBackendUrl() {
  return `${API_BASE_URL}/test`;
}

async function openCamera() {
  const video = document.getElementById('cameraStream');
  const button = document.querySelector('.camera-btn');
  if (!video) return;

  if (cameraStream) {
    await capturePhoto();
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = cameraStream;
    video.style.display = 'block';
    await video.play();
    if (button) button.textContent = '📸 Capture Photo';
  } catch (err) {
    console.log('Camera error:', err);
    await addMessage('ai', 'Camera access was denied.');
  }
}

async function capturePhoto() {
  const video = document.getElementById('cameraStream');
  const canvas = document.getElementById('cameraCapture');
  const button = document.querySelector('.camera-btn');

  if (!video || !canvas) return;
  if (!cameraStream) {
    await openCamera();
    return;
  }

  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(async (blob) => {
    if (!blob) return;

    const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
    await sendPhoto(file);

    if (button) button.textContent = '📷 Take Photo';
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    video.style.display = 'none';
  }, 'image/png');
}

async function addMessage(sender, text) {
  const messages = document.getElementById('messages');
  if (!messages) return;

  const msg = document.createElement('div');
  msg.className = 'msg ' + sender;
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

function renderWork(steps) {
  const output = document.getElementById('workOutput');
  if (!output) return;

  if (!Array.isArray(steps) || steps.length === 0) {
    output.textContent = 'No work steps are available yet.';
    return;
  }

  output.innerHTML = steps.map((step) => `<p class="work-step">${step}</p>`).join('');

  if (typeof MathJax !== 'undefined' && typeof MathJax.typeset === 'function') {
    MathJax.typeset();
  }
}

async function testBackend() {
  const statusEl = document.getElementById('backendStatus');
  if (statusEl) {
    statusEl.textContent = 'Testing backend...';
  }

  try {
    const res = await fetch(testBackendUrl(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    if (statusEl) {
      statusEl.textContent = `Backend status: ${JSON.stringify(data)}`;
    }
  } catch (e) {
    if (statusEl) {
      statusEl.textContent = 'Backend test failed. Check that the server is running.';
    }
  }
}

async function showWork() {
  const output = document.getElementById('workOutput');
  if (!output) return;

  if (!lastQuestion) {
    output.textContent = 'Ask a question first, then I can show the work.';
    return;
  }

  output.textContent = 'Generating steps...';

  try {
    const res = await fetch(apiUrl('/show-work'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: lastQuestion })
    });

    const data = await res.json();
    renderWork(data.steps || []);
  } catch (e) {
    output.textContent = 'Sorry, I could not load the work steps right now.';
  }
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  lastQuestion = text;
  await addMessage('user', text);
  input.value = '';

  await addMessage('ai', 'Thinking about your question...');

  try {
    const res = await fetch(apiUrl('/math-tutor'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text })
    });

    if (!res.ok) {
      console.log('Backend error:', res.status, res.statusText);
      await addMessage('ai', 'The tutor server returned an error.');
      return;
    }

    const data = await res.json();
    lastAnswer = data.answer;
    await addMessage('ai', data.answer || 'I had trouble answering that. Try rephrasing?');
  } catch (e) {
    console.log('Fetch error:', e);
    await addMessage('ai', `Oops, something went wrong talking to the AI server. ${e.message || ''}`.trim());
  }
}

async function sendPhoto(file = null) {
  const input = document.getElementById('photoInput');
  const selectedFile = file || input?.files?.[0];
  if (!selectedFile) return;

  await addMessage('user', '📸 Sent a photo… analyzing it now.');

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const res = await fetch(apiUrl('/solve-image'), {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    lastQuestion = data.question || 'Uploaded image';
    lastAnswer = data.answer;
    await addMessage('ai', data.answer || 'I couldn’t read the problem clearly.');
    renderWork(data.steps || []);
  } catch (err) {
    await addMessage('ai', 'Error reading the image.');
    console.log(err);
  }
}

document.getElementById('userInput')?.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  }
});
