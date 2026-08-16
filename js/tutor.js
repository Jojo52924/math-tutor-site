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

function drawGraph(xValues, yValues, connectPoints = false) {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: connectPoints ? 'line' : 'scatter',
    data: {
      labels: xValues,
      datasets: [{
        label: 'Graph',
        data: xValues.map((x, index) => ({ x, y: yValues[index] })),
        borderColor: '#4a6cff',
        backgroundColor: '#4a6cff',
        pointRadius: 5,
        fill: false,
        showLine: connectPoints
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          min: -10,
          max: 10,
          ticks: {
            stepSize: 1,
            color: 'white'
          },
          grid: {
            color: '#444',
            lineWidth: 1
          },
          title: {
            display: true,
            text: 'x',
            color: 'white',
            font: { size: 14 }
          }
        },
        y: {
          min: -10,
          max: 10,
          ticks: {
            stepSize: 1,
            color: 'white'
          },
          grid: {
            color: '#444',
            lineWidth: 1
          },
          title: {
            display: true,
            text: 'y',
            color: 'white',
            font: { size: 14 }
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function graphInput() {
  const input = document.getElementById('graphInput');
  const status = document.getElementById('graphStatus');
  const resultEl = document.getElementById('calcResult');

  if (!input || !status) return;

  const value = input.value.trim();
  if (!value) {
    status.textContent = 'Enter a function using x or a point like (2,5).';
    if (resultEl) resultEl.textContent = '';
    return;
  }

  if (resultEl) resultEl.textContent = '';

  const pointMatches = value.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/g);
  if (pointMatches) {
    const points = pointMatches.map((match) => {
      const [x, y] = match.replace('(', '').replace(')', '').split(',');
      return {
        x: Math.max(-10, Math.min(10, Number(x))),
        y: Math.max(-10, Math.min(10, Number(y)))
      };
    });

    drawGraph(
      points.map((point) => point.x),
      points.map((point) => point.y),
      true
    );
    status.textContent = `Plotting ${points.map(({ x, y }) => `(${x}, ${y})`).join(', ')}`;
    return;
  }

  if (/[xX]/.test(value)) {
    plotFunction(value);
    return;
  }

  try {
    const evaluated = math.evaluate(value);
    if (resultEl) resultEl.textContent = `= ${evaluated}`;
    status.textContent = 'Calculated value';
  } catch (error) {
    if (resultEl) resultEl.textContent = 'Invalid expression';
    status.textContent = 'That expression is not valid for graphing.';
  }
}

function plotFunction(expression) {
  const status = document.getElementById('graphStatus');
  const canvas = document.getElementById('graphCanvas');

  if (!status || !canvas) return;

  try {
    if (typeof math === 'undefined') {
      throw new Error('Math parser unavailable');
    }

    const compiled = math.compile(expression);

    const points = [];
    for (let x = -6; x <= 6; x += 0.1) {
      const y = compiled.evaluate({ x });
      if (typeof y === 'number' && Number.isFinite(y)) {
        points.push([x, y]);
      }
    }

    if (!points.length) {
      throw new Error('No valid points found');
    }

    drawGraph(points.map(([x]) => x), points.map(([, y]) => y), true);
    status.textContent = `Showing ${expression}`;
  } catch (err) {
    if (chart) {
      chart.destroy();
      chart = undefined;
    }
    status.textContent = 'That expression is not valid for graphing.';
  }
}

function plotPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return;

  const status = document.getElementById('graphStatus');
  const canvas = document.getElementById('graphCanvas');

  if (!status || !canvas) return;

  const formatted = points.map((p) => `(${p.x}, ${p.y})`).join(', ');

  drawGraph(points.map(({ x }) => x), points.map(({ y }) => y), false);
  status.textContent = `Plotting ${formatted}`;
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
