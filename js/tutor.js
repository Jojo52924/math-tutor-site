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

let chart;

function drawGraph(points, options = {}) {
  const canvas = document.getElementById('graphCanvas');
  const status = document.getElementById('graphStatus');

  if (!canvas || !status) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (chart) {
    chart.destroy();
  }

  const isScatter = Boolean(options.pointOnly);
  const labels = points.map(([x]) => x);
  const values = isScatter
    ? points.map(([x, y]) => ({ x, y }))
    : points.map(([, y]) => y);

  chart = new Chart(ctx, {
    type: isScatter ? 'scatter' : 'line',
    data: {
      labels,
      datasets: [{
        label: options.statusText || 'Graph',
        data: values,
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        pointRadius: isScatter ? 5 : 0,
        borderWidth: 2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          min: -10,
          max: 10,
          ticks: {
            stepSize: 1,
            color: '#1e293b'
          },
          grid: {
            color: '#cbd5e1'
          }
        },
        y: {
          min: -10,
          max: 10,
          ticks: {
            stepSize: 1,
            color: '#1e293b'
          },
          grid: {
            color: '#cbd5e1'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });

  status.textContent = options.statusText || 'Showing graph';
}

function graphInput() {
  const input = document.getElementById('graphInput');
  const status = document.getElementById('graphStatus');

  if (!input || !status) return;

  const value = input.value.trim();
  if (!value) {
    status.textContent = 'Enter a function using x or a point like (2,5).';
    return;
  }

  const pointMatch = value.match(/^\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/);
  if (pointMatch) {
    plotPoints([{ x: Number(pointMatch[1]), y: Number(pointMatch[2]) }]);
    return;
  }

  plotFunction(value);
}

function plotFunction(expression) {
  const status = document.getElementById('graphStatus');
  const svg = document.getElementById('graphCanvas');

  if (!status || !svg) return;

  try {
    const normalized = expression.replace(/\^/g, '**');
    const fn = new Function('x', `return ${normalized}`);

    const points = [];
    for (let x = -6; x <= 6; x += 0.1) {
      const y = fn(x);
      if (Number.isFinite(y)) {
        points.push([x, y]);
      }
    }

    if (!points.length) {
      throw new Error('No valid points found');
    }

    drawGraph(points, { statusText: `Showing ${expression}` });
  } catch (err) {
    svg.innerHTML = '';
    status.textContent = 'That expression is not valid for graphing.';
  }
}

function plotPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return;

  const status = document.getElementById('graphStatus');
  const canvas = document.getElementById('graphCanvas');

  if (!status || !canvas) return;

  const formatted = points.map((p) => `(${p.x}, ${p.y})`).join(', ');

  const chartPoints = points.map(({ x, y }) => ({ x, y }));

  if (chart) {
    chart.destroy();
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Point',
        data: chartPoints,
        pointRadius: 5,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#2563eb'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          min: -6,
          max: 6,
          ticks: {
            stepSize: 1
          }
        },
        y: {
          min: -6,
          max: 6,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });

  status.textContent = `Plotting ${formatted}`;
}

function plotGraph() {
  const input = document.getElementById('graphInput');
  const canvas = document.getElementById('graphCanvas');
  const status = document.getElementById('graphStatus');

  if (!canvas || !input || !status) return;

  const expression = input.value.trim();
  if (!expression) {
    status.textContent = 'Enter a function using x to see a graph.';
    if (chart) chart.destroy();
    return;
  }

  try {
    const normalized = expression.replace(/\^/g, '**');
    const fn = new Function('x', `return ${normalized}`);

    const points = [];
    for (let x = -6; x <= 6; x += 0.1) {
      const y = fn(x);
      if (Number.isFinite(y)) {
        points.push([x, y]);
      }
    }

    if (!points.length) {
      throw new Error('No valid points found');
    }

    drawGraph(points, { statusText: `Showing ${expression}` });
  } catch (err) {
    if (chart) chart.destroy();
    status.textContent = 'That expression is not valid for graphing.';
  }
}

function resetGraph() {
  const input = document.getElementById('graphInput');
  const canvas = document.getElementById('graphCanvas');
  const status = document.getElementById('graphStatus');

  if (input) input.value = '';
  if (chart) chart.destroy();
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
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

    if (data.answer !== undefined) {
      addMessage(`Answer: ${data.answer}`, 'ai');
    }

    if (Array.isArray(data.steps) && data.steps.length > 0) {
      addMessage(`Steps:\n${data.steps.join('\n')}`, 'ai');
    }
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
  addMessage('Thinking...', 'ai');

  const formData = new FormData();
  formData.append('image', imageBlob);

  try {
    const res = await fetch(backendUrl('/solve-image'), {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    const chatBox = document.getElementById('chatBox');
    if (chatBox && chatBox.lastChild) {
      chatBox.removeChild(chatBox.lastChild);
    }

    if (data.answer) {
      addMessage(data.answer, 'ai');

      if (Array.isArray(data.steps) && data.steps.length > 0) {
        addMessage(`Steps:\n${data.steps.join('\n')}`, 'ai');
      }
    } else if (data.error) {
      addMessage(data.error, 'ai');
    } else {
      addMessage("I couldn't solve that problem.", 'ai');
    }
  } catch (err) {
    const chatBox = document.getElementById('chatBox');
    if (chatBox && chatBox.lastChild) {
      chatBox.removeChild(chatBox.lastChild);
    }
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
