const BACKEND = (typeof window !== 'undefined' && window.__BACKEND_URL__)
  ? String(window.__BACKEND_URL__).replace(/\/$/, '')
  : window.location.origin;

function backendUrl(path) {
  return `${BACKEND}${path.startsWith('/') ? path : `/${path}`}`;
}

function solveTrigEquation(input) {
  const equation = input.replace(/\s+/g, '').toLowerCase();
  const match = equation.match(/^(sin|cos|tan)\(x\)=(-?(?:\d+(?:\.\d+)?|pi)(?:\/(?:\d+(?:\.\d+)?|pi))?)$/);

  if (!match) return null;

  const func = match[1];
  const rawValue = match[2];
  let value;

  if (rawValue === 'pi') {
    value = Math.PI;
  } else if (rawValue.startsWith('pi/')) {
    value = Math.PI / Number(rawValue.slice(3));
  } else if (rawValue.includes('/')) {
    const [numerator, denominator] = rawValue.split('/').map(Number);
    value = numerator / denominator;
  } else {
    value = Number(rawValue);
  }

  if (!Number.isFinite(value)) return 'Invalid trig value.';

  const solutions = [];

  if (func === 'sin') {
    const base = Math.asin(value);
    if (Number.isNaN(base)) return `No real solutions for sin(x) = ${value}`;
    solutions.push(`x = ${base.toFixed(3)} + 2πk`);
    solutions.push(`x = ${(Math.PI - base).toFixed(3)} + 2πk`);
  } else if (func === 'cos') {
    const base = Math.acos(value);
    if (Number.isNaN(base)) return `No real solutions for cos(x) = ${value}`;
    solutions.push(`x = ${base.toFixed(3)} + 2πk`);
    solutions.push(`x = ${(-base).toFixed(3)} + 2πk`);
  } else {
    const base = Math.atan(value);
    solutions.push(`x = ${base.toFixed(3)} + πk`);
  }

  return `Trig solutions (in radians):\n${solutions.join('\n')}`;
}

function solveLogEquation(input) {
  const equation = input.replace(/\s+/g, '').toLowerCase();
  const match = equation.match(/^(ln|log(?:_\d+)?)\((x|x[+-]\d+(?:\.\d+)?)\)=(-?(?:\d+(?:\.\d+)?)(?:\/\d+(?:\.\d+)?)?)$/);

  if (!match) return null;

  const func = match[1];
  const inside = match[2];
  const rawValue = match[3];
  const value = rawValue.includes('/')
    ? rawValue.split('/').map(Number).reduce((numerator, denominator) => numerator / denominator)
    : Number(rawValue);

  const base = func === 'ln'
    ? Math.E
    : func.startsWith('log_')
      ? Number(func.slice(4))
      : 10;

  if (!Number.isFinite(value) || !Number.isFinite(base) || base <= 0 || base === 1) {
    return 'Please use a valid logarithm base and value.';
  }

  const solvedInside = Math.pow(base, value);
  if (!Number.isFinite(solvedInside)) return 'The logarithm result is too large to represent.';

  if (inside === 'x') return `x = ${solvedInside}`;

  const offset = Number(inside.slice(1));
  const solution = inside[1] === '+' ? solvedInside - offset : solvedInside + offset;
  return `x = ${solution}`;
}

function solveLimit(input) {
  const normalized = input.replace(/\s+/g, '');
  const match = normalized.match(/^(?:limit|lim)\(x->([^)]+)\)(.+)$/i);

  if (!match) {
    return 'Invalid limit format. Example: limit(x->2)x^2';
  }

  const target = Number(match[1]);
  const expression = match[2];

  if (!Number.isFinite(target)) {
    return 'Limit point must be a number.';
  }

  try {
    const result = math.evaluate(expression, { x: target });

    if (Number.isFinite(result)) {
      return `lim(x→${target}) ${expression} = ${result}`;
    }

    const left = math.evaluate(expression, { x: target - 0.0001 });
    const right = math.evaluate(expression, { x: target + 0.0001 });

    if (Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.001) {
      return `lim(x→${target}) ${expression} ≈ ${left.toFixed(6)}`;
    }

    return 'Limit does not appear to exist.';
  } catch (error) {
    return 'Unable to compute that limit.';
  }
}

function showOfflineResult(result) {
  const output = document.getElementById('output');
  if (output) output.innerText = result;
}

function derivative(expression) {
  const expr = expression.replace(/\s+/g, '').toLowerCase();

  if (/^x\^[0-9]+$/.test(expr)) {
    const exponent = Number(expr.split('^')[1]);
    return `${exponent}x^${exponent - 1}`;
  }

  if (/^[0-9]+x$/.test(expr)) {
    return `${Number(expr.replace('x', ''))}`;
  }

  if (!expr.includes('x')) return '0';
  if (expr === 'sin(x)') return 'cos(x)';
  if (expr === 'cos(x)') return '-sin(x)';
  if (expr === 'tan(x)') return 'sec(x)^2';
  if (expr === 'ln(x)') return '1/x';
  if (expr === 'e^x') return 'e^x';

  if (/^[0-9]+(?:\.[0-9]+)?\^x$/.test(expr)) {
    const base = Number(expr.split('^')[0]);
    return `${base}^x ln(${base})`;
  }

  if (expr === 'x*sin(x)') return 'sin(x) + x*cos(x)';
  if (expr === 'x*cos(x)') return 'cos(x) - x*sin(x)';

  if (/^x\/[0-9]+$/.test(expr)) {
    const constant = Number(expr.split('/')[1]);
    return `1/${constant}`;
  }

  return 'Sorry, I can only differentiate basic expressions like x^n, sin(x), ln(x), e^x, and simple products.';
}

function integral(expression) {
  const expr = expression.replace(/\s+/g, '').toLowerCase();

  if (/^x\^[0-9]+$/.test(expr)) {
    const exponent = Number(expr.split('^')[1]);
    return `x^${exponent + 1} / ${exponent + 1} + C`;
  }

  if (expr.match(/^[0-9]+x$/)) {
    const a = Number(expr.replace('x', ''));
    return `${a}x^2/2 + C`;
  }

  if (!expr.includes('x')) return `${expr}x + C`;
  if (expr === 'sin(x)') return '-cos(x) + C';
  if (expr === 'cos(x)') return 'sin(x) + C';
  if (expr === 'sec(x)^2' || expr === 'sec^2(x)') return 'tan(x) + C';
  if (expr === 'tan(x)') return '-ln|cos(x)| + C';
  if (expr === '1/x') return 'ln|x| + C';

  return 'Sorry, I can only integrate basic expressions like x^n, sin(x), cos(x), tan(x), and 1/x.';
}

function looksLikeIntegralExpression(expression) {
  const normalized = expression.replace(/\s+/g, '').toLowerCase();
  return /^(?:\d+(?:\.\d+)?|x\^[0-9]+|[0-9]+x|sin\(x\)|cos\(x\)|tan\(x\)|sec\(x\)\^2|sec\^2\(x\)|1\/x)$/.test(normalized);
}

function looksLikeDerivativeExpression(expression) {
  const normalized = expression.replace(/\s+/g, '').toLowerCase();
  return /^(?:\d+(?:\.\d+)?|x\^[0-9]+|[0-9]+x|sin\(x\)|cos\(x\)|tan\(x\)|ln\(x\)|e\^x|[0-9]+(?:\.[0-9]+)?\^x|x\/(?:[0-9]+)|x\*sin\(x\)|x\*cos\(x\))$/.test(normalized);
}

function getIntegralCommand(input) {
  const normalized = input.trim();
  const lower = normalized.toLowerCase();
  const isIntegralCommand = normalized.includes('∫')
    || lower.startsWith('int')
    || lower.includes('integrate');

  if (!isIntegralCommand) return null;

  const expression = normalized
    .replace(/∫/g, '')
    .replace(/integrate/ig, '')
    .replace(/int/ig, '')
    .replace(/dx/ig, '')
    .trim();

  return expression || null;
}

async function askTutor() {
  const question = document.getElementById("question").value;

  const integralCommand = getIntegralCommand(question);
  if (integralCommand) {
    showOfflineResult(`Integral: ${integral(integralCommand)}`);
    return;
  }

  if (question.trim().toLowerCase().startsWith('d/dx')) {
    const expression = question.trim().slice(4).trim();
    showOfflineResult(`Derivative: ${derivative(expression)}`);
    return;
  }

  const trigAnswer = solveTrigEquation(question);
  if (trigAnswer) {
    document.getElementById("output").innerText = trigAnswer;
    return;
  }

  const logResult = solveLogEquation(question);
  if (logResult !== null) {
    showOfflineResult(logResult);
    return;
  }

  if (
    question.toLowerCase().startsWith('limit')
    || question.toLowerCase().startsWith('lim')
  ) {
    const result = solveLimit(question);
    showOfflineResult(result);
    return;
  }

  if (looksLikeDerivativeExpression(question)) {
    const derivativeResult = derivative(question);
    if (!derivativeResult.startsWith('Sorry')) {
      showOfflineResult(derivativeResult);
      return;
    }
  }

  if (looksLikeIntegralExpression(question)) {
    showOfflineResult(integral(question));
    return;
  }

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

function generateAxisLabels(min, max, step = 1) {
  const labels = [];
  for (let index = min; index <= max; index += step) {
    labels.push(index);
  }
  return labels;
}

// --- DRAGGABLE POINTS PLUGIN ---
const dragPlugin = {
  id: "dragPlugin",
  afterEvent(chart, args) {
    const event = args.event;

    if (event.type !== "mousedown" && event.type !== "mousemove" && event.type !== "mouseup") return;

    const activePoint = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, false)[0];

    if (!activePoint) return;

    const datasetIndex = activePoint.datasetIndex;
    const index = activePoint.index;
    const dataset = chart.data.datasets[datasetIndex];

    if (event.type === "mousedown") {
      chart.dragging = { datasetIndex, index };
    }

    if (event.type === "mousemove" && chart.dragging) {
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const x = xScale.getValueForPixel(event.x);
      const y = yScale.getValueForPixel(event.y);

      dataset.data[index].x = Math.round(x * 100) / 100;
      dataset.data[index].y = Math.round(y * 100) / 100;

      chart.options.scales.x.min = Math.floor(xScale.min);
      chart.options.scales.x.max = Math.ceil(xScale.max);
      chart.options.scales.y.min = Math.floor(yScale.min);
      chart.options.scales.y.max = Math.ceil(yScale.max);

      chart.update("none");
    }

    if (event.type === "mouseup") {
      chart.dragging = null;
    }
  }
};

const hoverLabelPlugin = {
  id: "hoverLabelPlugin",
  afterDraw(chart) {
    const ctx = chart.ctx;
    const activePoints = chart._active;

    if (!activePoints || activePoints.length === 0) return;

    const point = activePoints[0];
    const dataset = chart.data.datasets[point.datasetIndex];
    const data = dataset.data[point.index];

    const x = chart.scales.x.getPixelForValue(data.x);
    const y = chart.scales.y.getPixelForValue(data.y);
    const label = `(${data.x}, ${data.y})`;

    ctx.save();
    ctx.font = "14px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(79,70,229,0.85)";
    ctx.fillRect(x - 40, y - 35, 80, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x, y - 20);
    ctx.restore();
  }
};

const zoomPanPlugin = {
  id: "zoomPanPlugin",
  beforeInit(chart) {
    chart.zoom = function(amount) {
      const x = chart.scales.x;
      const y = chart.scales.y;

      x.options.min *= amount;
      x.options.max *= amount;
      y.options.min *= amount;
      y.options.max *= amount;

      chart.update();
    };

    chart.pan = function(dx, dy) {
      const x = chart.scales.x;
      const y = chart.scales.y;

      x.options.min += dx;
      x.options.max += dx;
      y.options.min += dy;
      y.options.max += dy;

      chart.update();
    };
  }
};

function enableZoomPan(canvas, chart) {
  if (canvas._zoomPanCleanup) {
    canvas._zoomPanCleanup();
  }

  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const handleWheel = (event) => {
    event.preventDefault();
    const zoomAmount = event.deltaY > 0 ? 1.1 : 0.9;
    chart.zoom(zoomAmount);
  };

  const handleMouseDown = (event) => {
    isDragging = true;
    startX = event.offsetX;
    startY = event.offsetY;
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;

    const dx = (startX - event.offsetX) / 20;
    const dy = (event.offsetY - startY) / 20;

    chart.pan(dx, dy);

    startX = event.offsetX;
    startY = event.offsetY;
  };

  const stopDragging = () => {
    isDragging = false;
  };

  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", stopDragging);
  canvas.addEventListener("mouseleave", stopDragging);

  const cleanup = () => {
    canvas.removeEventListener("wheel", handleWheel);
    canvas.removeEventListener("mousedown", handleMouseDown);
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseup", stopDragging);
    canvas.removeEventListener("mouseleave", stopDragging);
  };

  canvas._zoomPanCleanup = cleanup;
  return cleanup;
}

function drawGraph(xValues, yValues, connectPoints = false) {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: connectPoints ? "line" : "scatter",
    plugins: [dragPlugin, hoverLabelPlugin, zoomPanPlugin],
    data: {
      labels: xValues,
      datasets: [{
        label: "Graph",
        data: xValues.map((x, index) => ({ x, y: yValues[index] })),
        borderColor: "#4a6cff",
        backgroundColor: "#4a6cff",
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: connectPoints
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "nearest",
        intersect: true
      },
      scales: {
        x: {
          type: "linear",
          min: -10,
          max: 10,
          ticks: {
            callback: function(value) {
              return value.toString();
            },
            color: "white",
            stepSize: 1
          },
          grid: { color: "#444" }
        },
        y: {
          min: -10,
          max: 10,
          ticks: {
            callback: function(value) {
              return value.toString();
            },
            color: "white",
            stepSize: 1
          },
          grid: { color: "#444" }
        }
      }
    }
  });

  chart.options.scales.x.ticks.stepSize = 1;
  chart.options.scales.y.ticks.stepSize = 1;
  chart.update();

  document.getElementById("graphCanvas").classList.add("show");

  const lock = document.querySelector(".graph-lock");
  if (lock) {
    lock.classList.remove("pulse");
    setTimeout(() => lock.classList.add("pulse"), 10);
  }

  enableZoomPan(document.getElementById("graphCanvas"), chart);
}

function graphInput() {
  const inputEl = document.getElementById('graphInput');
  const status = document.getElementById('graphStatus');
  const resultEl = document.getElementById('calcResult');

  if (!inputEl || !status) return;

  const input = inputEl.value.trim();
  if (!input) {
    status.textContent = 'Enter a function using x or a point like (2,5).';
    if (resultEl) {
      resultEl.textContent = '';
      resultEl.classList.remove('pos', 'neg', 'zero', 'show');
    }
    return;
  }

  if (resultEl) {
    resultEl.textContent = '';
    resultEl.classList.remove('pos', 'neg', 'zero', 'show');
  }

  const pointMatches = input.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/g);
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

  if (/[xX]/.test(input)) {
    plotFunction(input);
    return;
  }

  try {
    const value = math.evaluate(input);
    if (resultEl) {
      resultEl.textContent = `= ${value}`;
      resultEl.classList.remove('pos', 'neg', 'zero', 'show');

      if (value > 0) resultEl.classList.add('pos');
      else if (value < 0) resultEl.classList.add('neg');
      else resultEl.classList.add('zero');

      setTimeout(() => resultEl.classList.add('show'), 10);
    }
    status.textContent = 'Calculated value';
  } catch (error) {
    if (resultEl) {
      resultEl.textContent = "Invalid expression";
      resultEl.classList.remove('pos', 'neg', 'zero', "show");
      setTimeout(() => resultEl.classList.add("show"), 10);
    }
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
  const resultEl = document.getElementById('calcResult');


function resetView() {
  if (!chart) return;

  chart.options.scales.x.min = -10;
  chart.options.scales.x.max = 10;
  chart.options.scales.y.min = -10;
  chart.options.scales.y.max = 10;
  chart.update();
}
  if (input) input.value = '';
  if (resultEl) {
    resultEl.textContent = '';
    resultEl.classList.remove('pos', 'neg', 'zero', 'show');
  }
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
    const integralCommand = getIntegralCommand(userInput);
    if (integralCommand) {
      const chatBox = document.getElementById('chatBox');
      if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
      addMessage(`Integral: ${integral(integralCommand)}`, 'ai');
      return;
    }

    if (userInput.toLowerCase().startsWith('d/dx')) {
      const expression = userInput.slice(4).trim();
      const chatBox = document.getElementById('chatBox');
      if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
      addMessage(`Derivative: ${derivative(expression)}`, 'ai');
      return;
    }

    const trigAnswer = solveTrigEquation(userInput);
    if (trigAnswer) {
      const chatBox = document.getElementById('chatBox');
      if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
      addMessage(trigAnswer, 'ai');
      return;
    }

    const logAnswer = solveLogEquation(userInput);
    if (logAnswer) {
      const chatBox = document.getElementById('chatBox');
      if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
      addMessage(logAnswer, 'ai');
      return;
    }

    if (looksLikeDerivativeExpression(userInput)) {
      const derivativeResult = derivative(userInput);
      if (!derivativeResult.startsWith('Sorry')) {
        const chatBox = document.getElementById('chatBox');
        if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
        addMessage(`Derivative: ${derivativeResult}`, 'ai');
        return;
      }
    }

    if (looksLikeIntegralExpression(userInput)) {
      const chatBox = document.getElementById('chatBox');
      if (chatBox && chatBox.lastChild) chatBox.removeChild(chatBox.lastChild);
      addMessage(`Integral: ${integral(userInput)}`, 'ai');
      return;
    }

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

document.getElementById('question')?.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    askTutor();
  }
});

document.getElementById('graphInput')?.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    graphInput();
  }
});

document.querySelectorAll('.premium-card').forEach((card) => {
  card.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      card.click();
    }
  });
});

document.getElementById("resetView").onclick = () => {
  if (!chart) return;

  chart.options.scales.x.min = -10;
  chart.options.scales.x.max = 10;
  chart.options.scales.y.min = -10;
  chart.options.scales.y.max = 10;
  chart.update();
};

document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('chatBox');
  if (box && box.children.length === 0) {
    addMessage('Hi! What math problem can I help you with today?', 'ai');
  }
});
