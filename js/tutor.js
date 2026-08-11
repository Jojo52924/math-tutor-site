const BACKEND = (typeof window !== 'undefined' && window.__BACKEND_URL__)
  ? String(window.__BACKEND_URL__).replace(/\/$/, '')
  : window.location.origin;

function backendUrl(path) {
  return `${BACKEND}${path.startsWith('/') ? path : `/${path}`}`;
}

async function askTutor() {
  const question = document.getElementById("question").value;

  const response = await fetch("/tutor-offline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });

  const data = await response.json();

  document.getElementById("output").innerHTML = `
    <strong>Answer:</strong> ${data.answer}<br><br>
    <strong>Steps:</strong><br>${data.steps.join("<br>")}
  `;
}

async function solveEquation() {
  const equation = document.getElementById("question").value;

  const response = await fetch("/solve-equation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ equation })
  });

  const data = await response.json();

  if (data.error) {
    document.getElementById("output").innerText = data.error;
  } else {
    document.getElementById("output").innerText =
      `${data.equation} → x = ${JSON.stringify(data.solution)}`;
  }
}

async function solveProblem() {
  const problem = document.getElementById("question").value;

  const response = await fetch("/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem })
  });

  const data = await response.json();

  if (data.error) {
    document.getElementById("output").innerText = data.error;
  } else {
    document.getElementById("output").innerText = `${data.problem} = ${data.answer}`;
  }
}

function addMessage(text, sender = "ai") {
  const chatBox = document.getElementById("chatBox");

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerText = text;

  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function createGraphSvgPath(points, width, height) {
  if (!points.length) return "";

  const padding = 24;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const scaleX = graphWidth / 12;
  const scaleY = graphHeight / 12;

  return points
    .map(([x, y], index) => {
      const px = centerX + x * scaleX;
      const py = centerY - y * scaleY;
      return `${index === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`;
    })
    .join(' ');
}

function plotGraph() {
  const input = document.getElementById('graphInput');
  const svg = document.getElementById('graphCanvas');
  const status = document.getElementById('graphStatus');

  if (!svg || !input || !status) return;

  const expression = input.value.trim();
  if (!expression) {
    status.textContent = 'Enter a function using x to see a graph.';
    svg.innerHTML = '';
    return;
  }

  try {
    const normalized = expression.replace(/\^/g, '**');
    const fn = new Function('x', `return ${normalized}`);

    const points = [];
    const width = 320;
    const height = 220;
    const padding = 24;
    const centerX = width / 2;
    const centerY = height / 2;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    const scaleX = graphWidth / 12;
    const scaleY = graphHeight / 12;

    for (let i = 0; i <= 240; i += 1) {
      const x = -6 + (i / 240) * 12;
      const y = fn(x);
      if (Number.isFinite(y)) {
        points.push([x, y]);
      }
    }

    svg.innerHTML = '';
    const axis = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', padding);
    xAxis.setAttribute('x2', width - padding);
    xAxis.setAttribute('y1', centerY);
    xAxis.setAttribute('y2', centerY);
    xAxis.setAttribute('stroke', '#94a3b8');
    xAxis.setAttribute('stroke-width', '1');

    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', centerX);
    yAxis.setAttribute('x2', centerX);
    yAxis.setAttribute('y1', padding);
    yAxis.setAttribute('y2', height - padding);
    yAxis.setAttribute('stroke', '#94a3b8');
    yAxis.setAttribute('stroke-width', '1');

    axis.appendChild(xAxis);
    axis.appendChild(yAxis);
    svg.appendChild(axis);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', createGraphSvgPath(points, width, height));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#2563eb');
    path.setAttribute('stroke-width', '2.5');
    svg.appendChild(path);

    status.textContent = `Showing ${expression}`;
  } catch (err) {
    svg.innerHTML = '';
    status.textContent = 'That expression is not valid for graphing.';
  }
}

function resetGraph() {
  const input = document.getElementById('graphInput');
  const svg = document.getElementById('graphCanvas');
  const status = document.getElementById('graphStatus');

  if (input) input.value = '';
  if (svg) svg.innerHTML = '';
  if (status) status.textContent = 'Enter a function using x to see a graph.';
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  if (!input) return;

  const userInput = input.value.trim();
  if (!userInput) return;

  addMessage(userInput, 'user');
  input.value = '';

  addMessage('Thinking...', 'ai');

  try {
    const res = await fetch('/tutor-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userInput })
    });

    const data = await res.json();

    const chatBox = document.getElementById('chatBox');
    if (chatBox && chatBox.lastChild) {
      chatBox.removeChild(chatBox.lastChild);
    }

    addMessage(data.answer, 'ai');
  } catch (err) {
    const chatBox = document.getElementById('chatBox');
    if (chatBox && chatBox.lastChild) {
      chatBox.removeChild(chatBox.lastChild);
    }
    addMessage('Connection failed.', 'ai');
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
    addMessage('Camera access was denied.', 'ai');
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
  addMessage('📸 Sent a photo... analyzing it now.', 'user');

  const formData = new FormData();
  formData.append('image', imageBlob);

  try {
    const res = await fetch(backendUrl('/solve-image'), {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    addMessage(data.answer || "I couldn't read the image.", 'ai');
  } catch (err) {
    addMessage('Connection failed.', 'ai');
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
  addMessage('Show work is not configured in this script yet.', 'ai');
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
    addMessage('Hi! What math problem can I help you with today?', 'ai');
  }
});
