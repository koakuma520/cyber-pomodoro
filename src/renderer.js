/**
 * 赛博番茄钟 - Cyberpunk Pomodoro Timer
 * Renderer process: timer logic, particles, progress ring, audio, effects
 */

// ===== State ==============================================================

const STATE = {
  mode: 'work',          // work | shortBreak | longBreak
  status: 'idle',        // idle | running | paused
  remaining: 25 * 60,    // seconds
  total: 25 * 60,
  completedToday: 0,     // daily pomodoro count
  minutesToday: 0,
  data: null,
  settings: null,
  timerId: null,
  usingElectron: typeof window.pomodoroAPI !== 'undefined',
  api: window.pomodoroAPI || {}
};

const MODE_CONFIG = {
  work: {
    label: '专注', defaultMin: 25,
    color: '#00F0FF', glowClass: '', flashClass: ''
  },
  shortBreak: {
    label: '短休息', defaultMin: 5,
    color: '#FF00AA', glowClass: 'magenta', flashClass: 'magenta'
  },
  longBreak: {
    label: '长休息', defaultMin: 15,
    color: '#00FF41', glowClass: 'green', flashClass: 'green'
  },
};

// ===== DOM refs ===========================================================

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const dom = {
  timeText: $('#time-text'),
  sessionLabel: $('#session-label'),
  sessionCounter: $('#today-count'),
  minutesCounter: $('#today-minutes'),
  mainBtn: $('#main-btn'),
  resetBtn: $('#reset-btn'),
  modeBtns: $$('.mode-btn'),
  clockDisplay: $('#clock-display'),
  canvas: $('#progress-ring'),
  particleCanvas: $('#particle-canvas'),
  flash: $('#glitch-flash'),
  toastContainer: $('#toast-container'),
  statsPanel: $('#stats-panel'),
  historyList: $('#history-list'),
  settingsPanel: $('#settings-panel'),
  settingsToggle: $('#settings-toggle'),
};

// ===== Clock ==============================================================

function updateClock() {
  const now = new Date();
  dom.clockDisplay.textContent =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0');
}
setInterval(updateClock, 10000);
updateClock();

// ===== Data persistence ===================================================

async function loadData() {
  if (STATE.usingElectron) {
    STATE.data = await window.pomodoroAPI.loadData();
  } else {
    const raw = localStorage.getItem('pomodoro-data');
    STATE.data = raw ? JSON.parse(raw) : null;
  }
  if (!STATE.data) {
    STATE.data = {
      settings: {
        workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15,
        longBreakInterval: 4, volume: 0.5, muted: false,
        alwaysOnTop: true, autoStartBreak: false, autoStartWork: false
      },
      stats: { daily: { date: todayStr(), count: 0, minutes: 0 } }
    };
  }
  STATE.settings = STATE.data.settings;

  // Daily reset check
  const today = todayStr();
  if (STATE.data.stats.daily.date !== today) {
    STATE.data.stats.daily = { date: today, count: 0, minutes: 0 };
    await saveData();
  }
  STATE.completedToday = STATE.data.stats.daily.count;
  STATE.minutesToday = STATE.data.stats.daily.minutes;

  applySettings();
  updateStatsDisplay();
}

async function saveData() {
  if (STATE.usingElectron) {
    await window.pomodoroAPI.saveData(STATE.data);
  } else {
    localStorage.setItem('pomodoro-data', JSON.stringify(STATE.data));
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ===== Settings ===========================================================

function applySettings() {
  const s = STATE.settings;

  // Update mode durations
  if (STATE.status === 'idle') {
    STATE.total = getModeMinutes() * 60;
    STATE.remaining = STATE.total;
    updateDisplay();
  }

  // Always-on-top
  if (STATE.usingElectron) {
    window.pomodoroAPI.setAlwaysOnTop(s.alwaysOnTop);
  }

  // Sync UI controls
  $('#s-work').value = s.workMinutes;
  $('#s-short').value = s.shortBreakMinutes;
  $('#s-long').value = s.longBreakMinutes;
  $('#s-interval').value = s.longBreakInterval;
  $('#s-volume').value = s.volume;
  $('#s-muted').checked = s.muted;
  $('#s-ontop').checked = s.alwaysOnTop;
  $('#s-auto-break').checked = s.autoStartBreak;
  $('#s-auto-work').checked = s.autoStartWork;
}

function saveSettings() {
  STATE.settings.workMinutes = parseInt($('#s-work').value) || 25;
  STATE.settings.shortBreakMinutes = parseInt($('#s-short').value) || 5;
  STATE.settings.longBreakMinutes = parseInt($('#s-long').value) || 15;
  STATE.settings.longBreakInterval = parseInt($('#s-interval').value) || 4;
  STATE.settings.volume = parseFloat($('#s-volume').value) || 0.5;
  STATE.settings.muted = $('#s-muted').checked;
  STATE.settings.alwaysOnTop = $('#s-ontop').checked;
  STATE.settings.autoStartBreak = $('#s-auto-break').checked;
  STATE.settings.autoStartWork = $('#s-auto-work').checked;

  if (STATE.status === 'idle') {
    STATE.total = getModeMinutes() * 60;
    STATE.remaining = STATE.total;
  }
  applySettings();
  updateDisplay();
  saveData();
  showToast('设置已保存');
}

function toggleSettings() {
  const panel = dom.settingsPanel;
  panel.classList.toggle('hidden');
  // Sync controls when opening
  if (!panel.classList.contains('hidden')) applySettings();
}

function toggleHistory() {
  dom.statsPanel.classList.toggle('open');
  const list = dom.historyList;
  list.classList.toggle('hidden');
  if (!list.classList.contains('hidden')) renderHistory();
}

function getModeMinutes() {
  const s = STATE.settings;
  return STATE.mode === 'work' ? s.workMinutes :
         STATE.mode === 'shortBreak' ? s.shortBreakMinutes : s.longBreakMinutes;
}

// ===== Mode management ====================================================

function setMode(mode) {
  if (STATE.status === 'running') return;
  STATE.mode = mode;
  STATE.status = 'idle';
  STATE.total = getModeMinutes() * 60;
  STATE.remaining = STATE.total;
  stopTimer();

  dom.modeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  updateTheme();
  updateDisplay();
  updateButtonState();
}

// ===== Theme ==============================================================

function updateTheme() {
  const cfg = MODE_CONFIG[STATE.mode];
  const color = cfg.color;
  const root = document.documentElement;
  root.style.setProperty('--mode-color', color);
  root.style.setProperty('--mode-glow', `0 0 10px ${color}80, 0 0 30px ${color}40`);

  dom.mainBtn.className = 'ctrl-btn primary';
  if (STATE.status === 'paused') dom.mainBtn.classList.add('is-paused');
}

// ===== Timer ==============================================================

function startTimer() {
  if (STATE.status === 'running') return;
  STATE.status = 'running';
  if (STATE.remaining <= 0) {
    STATE.remaining = STATE.total;
  }
  dom.mainBtn.textContent = '暂停';
  updateTheme();
  tick();
}

function pauseTimer() {
  STATE.status = 'paused';
  dom.mainBtn.textContent = '继续';
  dom.mainBtn.classList.add('is-paused');
  stopTimer();
  updateDisplay();
}

function resumeTimer() {
  STATE.status = 'running';
  dom.mainBtn.textContent = '暂停';
  dom.mainBtn.classList.remove('is-paused');
  updateTheme();
  tick();
}

function resetTimer() {
  stopTimer();
  STATE.status = 'idle';
  STATE.remaining = STATE.total;
  dom.mainBtn.textContent = '开始';
  dom.mainBtn.classList.remove('is-paused');
  updateTheme();
  updateDisplay();
  updateButtonState();
}

function stopTimer() {
  if (STATE.timerId) {
    clearInterval(STATE.timerId);
    STATE.timerId = null;
  }
}

function tick() {
  if (STATE.status !== 'running') return;
  if (STATE.remaining <= 0) {
    completeTimer();
    return;
  }
  STATE.remaining--;
  updateDisplay();
  STATE.timerId = setTimeout(tick, 1000);
}

function completeTimer() {
  stopTimer();
  STATE.status = 'idle';
  dom.mainBtn.textContent = '开始';
  dom.mainBtn.classList.remove('is-paused');
  updateDisplay();

  // Screen flash
  triggerFlash();

  // Play sound
  playNotificationSound();

  // Notification
  const modeLabel = MODE_CONFIG[STATE.mode].label;
  if (STATE.mode === 'work') {
    STATE.completedToday++;
    STATE.minutesToday += STATE.settings.workMinutes;
    STATE.data.stats.daily.count = STATE.completedToday;
    STATE.data.stats.daily.minutes = STATE.minutesToday;
    saveData();
    updateStatsDisplay();

    showToast(`番茄完成！已完成 ${STATE.completedToday} 个`);
    sendNotification('番茄完成', `专注结束，该休息了！已完成 ${STATE.completedToday} 个番茄`);

    // Auto-switch to break
    const interval = STATE.settings.longBreakInterval;
    const nextMode = (STATE.completedToday % interval === 0) ? 'longBreak' : 'shortBreak';
    triggerGlitch();

    setTimeout(() => {
      dom.modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === nextMode));
      STATE.mode = nextMode;
      STATE.total = getModeMinutes() * 60;
      STATE.remaining = STATE.total;
      updateTheme();
      updateDisplay();
      updateButtonState();

      if (STATE.settings.autoStartBreak) {
        showToast(`开始${MODE_CONFIG[nextMode].label}`);
        startTimer();
      } else {
        showToast(`该${MODE_CONFIG[nextMode].label}了`);
      }
    }, 800);
  } else {
    // Break complete
    showToast('休息结束，该专注了');
    sendNotification('休息结束', '休息结束，重新开始专注吧！');
    triggerGlitch();

    setTimeout(() => {
      dom.modeBtns.forEach((b) => b.classList.toggle('active', b.dataset.mode === 'work'));
      STATE.mode = 'work';
      STATE.total = getModeMinutes() * 60;
      STATE.remaining = STATE.total;
      updateTheme();
      updateDisplay();
      updateButtonState();

      if (STATE.settings.autoStartWork) {
        showToast('开始专注');
        startTimer();
      } else {
        showToast('该专注了');
      }
    }, 800);
  }
}

function triggerGlitch() {
  const title = dom.timeText;
  title.classList.remove('glitch');
  void title.offsetWidth; // reflow
  title.classList.add('glitch');
}

// ===== Timer controls =====================================================

function toggleTimer() {
  if (STATE.status === 'idle' || STATE.status === 'paused') {
    if (STATE.remaining <= 0) {
      STATE.remaining = STATE.total;
    }
  }
  if (STATE.status === 'idle') startTimer();
  else if (STATE.status === 'running') pauseTimer();
  else if (STATE.status === 'paused') resumeTimer();
}

// ===== Display ============================================================

function updateDisplay() {
  const mins = Math.floor(STATE.remaining / 60);
  const secs = STATE.remaining % 60;
  dom.timeText.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

  const statusMap = { idle: '就绪', running: '专注中...', paused: '已暂停' };
  dom.sessionLabel.textContent = MODE_CONFIG[STATE.mode].label + ' · ' + (statusMap[STATE.status] || '');

  drawProgressRing();
}

function updateStatsDisplay() {
  dom.sessionCounter.textContent = STATE.completedToday;
  dom.minutesCounter.textContent = STATE.minutesToday;
}

function updateButtonState() {
  dom.mainBtn.className = 'ctrl-btn primary';
  if (STATE.status === 'paused') {
    dom.mainBtn.classList.add('is-paused');
  }
}

// ===== Progress Ring (Canvas) =============================================

function drawProgressRing() {
  const canvas = dom.canvas;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 340;
  const cx = size / 2, cy = size / 2, r = 148, lineWidth = 8;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, size, size);

  const progress = STATE.total > 0 ? 1 - STATE.remaining / STATE.total : 0;
  const color = MODE_CONFIG[STATE.mode].color;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * progress;

  // Background ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  // Progress arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Glow dot at end of arc
  if (progress > 0 && progress < 1) {
    const dotAngle = endAngle;
    const dx = cx + r * Math.cos(dotAngle);
    const dy = cy + r * Math.sin(dotAngle);

    ctx.beginPath();
    ctx.arc(dx, dy, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Outer glow
    ctx.beginPath();
    ctx.arc(dx, dy, 10, 0, Math.PI * 2);
    ctx.fillStyle = color + '30';
    ctx.fill();
  }
}

// ===== Particles ==========================================================

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.resize();
    this.init();
    this.animate();

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    const count = Math.min(80, Math.floor(window.innerWidth * window.innerHeight / 12000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        color: Math.random() > 0.5 ? '#00F0FF' : '#FF00AA',
        alpha: Math.random() * 0.5 + 0.2,
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      // Mouse interaction - slight repulsion
      const dx = p.x - this.mouse.x;
      const dy = p.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const force = (120 - dist) / 120 * 0.5;
        p.vx += (dx / dist) * force * 0.05;
        p.vy += (dy / dist) * force * 0.05;
      }

      // Damping
      p.vx *= 0.99;
      p.vy *= 0.99;

      p.x += p.vx;
      p.y += p.vy;

      // Wrap
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1;
    }

    // Draw connections
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i], b = this.particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.08 * (1 - dist / 150)})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

// ===== Audio ==============================================================

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playNotificationSound() {
  if (STATE.settings.muted) return;
  try {
    const ctx = getAudioCtx();
    const vol = STATE.settings.volume || 0.5;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = vol * 0.3;

    // Cyberpunk chime sequence
    const freqs = [880, 1108.73, 1318.51, 1760]; // A5, C#6, E6, A6
    const now = ctx.currentTime;

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now + i * 0.12);
      g.gain.linearRampToValueAtTime(vol * 0.2, now + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);
      osc.connect(g);
      g.connect(gain);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });

    // Low pulse
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 55;
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(vol * 0.15, now + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(g2);
    g2.connect(gain);
    osc2.start(now);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.log('Audio error:', e.message);
  }
}

// ===== Flash effect =======================================================

function triggerFlash() {
  const flash = dom.flash;
  const cls = MODE_CONFIG[STATE.mode].flashClass;
  flash.className = 'active' + (cls ? ' ' + cls : '');
  setTimeout(() => { flash.className = ''; }, 300);
}

// ===== Toast ==============================================================

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  const color = MODE_CONFIG[STATE.mode].color;
  el.style.setProperty('--mode-color', color);
  dom.toastContainer.appendChild(el);

  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// ===== Notification =======================================================

function sendNotification(title, body) {
  if (STATE.usingElectron) {
    window.pomodoroAPI.showNotification({ title, body });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') new Notification(title, { body });
    });
  }
}

// ===== History ============================================================

function renderHistory() {
  const list = dom.historyList;
  list.innerHTML = '';
  const stats = STATE.data.stats;
  const d = stats.daily;
  const item = document.createElement('div');
  item.className = 'hist-item';
  item.innerHTML = `<span>${d.date}</span><span>${d.count} 个 · ${d.minutes} 分钟</span>`;
  list.appendChild(item);
}

// ===== Events =============================================================

dom.mainBtn.addEventListener('click', toggleTimer);
dom.resetBtn.addEventListener('click', resetTimer);

dom.modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); toggleTimer(); }
  if (e.code === 'KeyR') { e.preventDefault(); resetTimer(); }
});

// ===== Init ===============================================================

async function init() {
  // Set up browser fallback if not in Electron
  if (!window.pomodoroAPI) {
    window.pomodoroAPI = {
      loadData: () => {
        const raw = localStorage.getItem('pomodoro-data');
        return Promise.resolve(raw ? JSON.parse(raw) : null);
      },
      saveData: (data) => {
        localStorage.setItem('pomodoro-data', JSON.stringify(data));
        return Promise.resolve(true);
      },
      showNotification: ({ title, body }) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
        return Promise.resolve();
      },
      setAlwaysOnTop: () => Promise.resolve(),
      windowAction: () => {},
      onMaximized: () => {},
    };
    STATE.usingElectron = false;
    STATE.api = window.pomodoroAPI;
  }

  await loadData();
  setMode('work');
  new ParticleSystem(dom.particleCanvas);
  updateDisplay();

  // Request notification permission for non-Electron
  if (!STATE.usingElectron && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  console.log('🌈 赛博番茄钟已启动');
}

init();
