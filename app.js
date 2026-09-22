/**
 * ChromaTimer - Nowoczesny Stoper z Dynamiczną Zmianą Kolorów
 */

// Paleta curated barw neonowych zmieniających się co 10 sekund
const COLOR_THEMES = [
  {
    name: 'Neon Cyan',
    hex: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.45)',
    soft: 'rgba(0, 242, 254, 0.15)'
  },
  {
    name: 'Electric Purple',
    hex: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.45)',
    soft: 'rgba(168, 85, 247, 0.15)'
  },
  {
    name: 'Emerald Green',
    hex: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    soft: 'rgba(16, 185, 129, 0.15)'
  },
  {
    name: 'Vivid Orange',
    hex: '#f97316',
    glow: 'rgba(249, 115, 22, 0.45)',
    soft: 'rgba(249, 115, 22, 0.15)'
  },
  {
    name: 'Hot Magenta',
    hex: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.45)',
    soft: 'rgba(244, 63, 94, 0.15)'
  },
  {
    name: 'Radiant Gold',
    hex: '#eab308',
    glow: 'rgba(234, 179, 8, 0.45)',
    soft: 'rgba(234, 179, 8, 0.15)'
  },
  {
    name: 'Ultra Blue',
    hex: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.45)',
    soft: 'rgba(59, 130, 246, 0.15)'
  },
  {
    name: 'Lime Spark',
    hex: '#84cc16',
    glow: 'rgba(132, 204, 22, 0.45)',
    soft: 'rgba(132, 204, 22, 0.15)'
  }
];

class ChromaStopwatch {
  constructor() {
    // Stan czasu
    this.startTime = 0;
    this.elapsedTime = 0;
    this.animationFrameId = null;
    this.isRunning = false;

    // Faza kolorystyczna
    this.currentThemeIndex = 0;
    this.lastDetectedPhase = 0;

    // Okrążenia
    this.laps = [];
    this.lastLapTime = 0;

    // Dźwięk
    this.soundEnabled = true;
    this.audioCtx = null;

    // Elementy DOM
    this.dom = {
      hours: document.getElementById('hours'),
      minutes: document.getElementById('minutes'),
      seconds: document.getElementById('seconds'),
      milliseconds: document.getElementById('milliseconds'),
      intervalProgressBar: document.getElementById('intervalProgressBar'),
      phaseBadge: document.getElementById('phaseBadge'),
      phaseName: document.getElementById('phaseName'),
      phaseColorPreview: document.getElementById('phaseColorPreview'),
      phaseCountdown: document.getElementById('phaseCountdown'),
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      lapBtn: document.getElementById('lapBtn'),
      resetBtn: document.getElementById('resetBtn'),
      soundToggleBtn: document.getElementById('soundToggleBtn'),
      soundIconOn: document.getElementById('soundIconOn'),
      soundIconOff: document.getElementById('soundIconOff'),
      statusDot: document.getElementById('statusDot'),
      stopwatchCard: document.querySelector('.stopwatch-card'),
      lapsSection: document.getElementById('lapsSection'),
      lapsList: document.getElementById('lapsList'),
      lapsCount: document.getElementById('lapsCount')
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.applyColorTheme(0);
    this.updateDisplay(0);
  }

  bindEvents() {
    this.dom.startBtn.addEventListener('click', () => this.start());
    this.dom.stopBtn.addEventListener('click', () => this.stop());
    this.dom.resetBtn.addEventListener('click', () => this.reset());
    this.dom.lapBtn.addEventListener('click', () => this.recordLap());
    this.dom.soundToggleBtn.addEventListener('click', () => this.toggleSound());

    // Skróty klawiszowe
    window.addEventListener('keydown', (e) => {
      // Ignoruj wpisywanie w inputach (jeśli by były)
      if (['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.isRunning) {
          this.stop();
        } else {
          this.start();
        }
      } else if (e.code === 'KeyR') {
        if (!this.dom.resetBtn.disabled) {
          this.reset();
        }
      } else if (e.code === 'KeyL') {
        if (!this.dom.lapBtn.disabled && this.isRunning) {
          this.recordLap();
        }
      }
    });
  }

  /** Inicjalizacja kontekstu audio przy pierwszej interakcji użytkownika */
  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /** Odtwarzanie prostego syntezowanego dźwięku */
  playSound(freq = 440, type = 'sine', duration = 0.08) {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('Audio playback not supported or blocked:', err);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.soundEnabled) {
      this.dom.soundIconOn.classList.remove('hidden');
      this.dom.soundIconOff.classList.add('hidden');
      this.dom.soundToggleBtn.setAttribute('title', 'Wycisz dźwięk');
      this.playSound(600, 'triangle', 0.1);
    } else {
      this.dom.soundIconOn.classList.add('hidden');
      this.dom.soundIconOff.classList.remove('hidden');
      this.dom.soundToggleBtn.setAttribute('title', 'Włącz dźwięk');
    }
  }

  start() {
    if (this.isRunning) return;

    this.initAudio();
    this.playSound(520, 'sine', 0.12);

    this.isRunning = true;
    this.startTime = performance.now() - this.elapsedTime;

    // Aktualizacja interfejsu przycisków
    this.dom.startBtn.disabled = true;
    this.dom.stopBtn.disabled = false;
    this.dom.lapBtn.disabled = false;
    this.dom.resetBtn.disabled = false;

    this.dom.statusDot.classList.add('running');
    this.dom.stopwatchCard.classList.add('active-glow');

    // Pętla animacji
    this.runLoop();
  }

  stop() {
    if (!this.isRunning) return;

    this.playSound(350, 'sine', 0.12);

    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.elapsedTime = performance.now() - this.startTime;

    // Aktualizacja interfejsu przycisków
    this.dom.startBtn.disabled = false;
    this.dom.stopBtn.disabled = true;
    this.dom.lapBtn.disabled = true;
    this.dom.resetBtn.disabled = false;

    this.dom.statusDot.classList.remove('running');
    this.dom.stopwatchCard.classList.remove('active-glow');
  }

  reset() {
    this.playSound(400, 'triangle', 0.15);

    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.startTime = 0;
    this.elapsedTime = 0;
    this.lastLapTime = 0;
    this.laps = [];
    this.lastDetectedPhase = 0;

    // Przywrócenie interfejsu
    this.dom.startBtn.disabled = false;
    this.dom.stopBtn.disabled = true;
    this.dom.lapBtn.disabled = true;
    this.dom.resetBtn.disabled = true;

    this.dom.statusDot.classList.remove('running');
    this.dom.stopwatchCard.classList.remove('active-glow');

    this.updateDisplay(0);
    this.applyColorTheme(0);

    // Czyszczenie okrążeń
    this.dom.lapsList.innerHTML = '';
    this.dom.lapsSection.classList.add('hidden');
    this.dom.lapsCount.textContent = '0 okrążeń';
  }

  recordLap() {
    if (!this.isRunning) return;

    const currentTotal = this.elapsedTime;
    const lapDuration = currentTotal - this.lastLapTime;
    this.lastLapTime = currentTotal;

    const lapNumber = this.laps.length + 1;
    const theme = COLOR_THEMES[this.currentThemeIndex];

    const lapData = {
      index: lapNumber,
      lapTime: lapDuration,
      totalTime: currentTotal,
      color: theme.hex,
      colorName: theme.name
    };

    this.laps.push(lapData);
    this.playSound(750, 'sine', 0.1);
    this.renderLaps();
  }

  renderLaps() {
    if (this.laps.length === 0) {
      this.dom.lapsSection.classList.add('hidden');
      return;
    }

    this.dom.lapsSection.classList.remove('hidden');
    this.dom.lapsCount.textContent = `${this.laps.length} ${this.getPolishLapWord(this.laps.length)}`;

    // Obliczenie najszybszego i najwolniejszego okrążenia (jeśli jest > 1 okrążenie)
    let minTime = Infinity;
    let maxTime = -Infinity;
    if (this.laps.length > 1) {
      this.laps.forEach(l => {
        if (l.lapTime < minTime) minTime = l.lapTime;
        if (l.lapTime > maxTime) maxTime = l.lapTime;
      });
    }

    // Renderujemy od najnowszego do najstarszego
    const reversedLaps = [...this.laps].reverse();

    this.dom.lapsList.innerHTML = reversedLaps.map(lap => {
      let extraClass = '';
      if (this.laps.length > 1) {
        if (lap.lapTime === minTime) extraClass = 'lap-fastest';
        else if (lap.lapTime === maxTime) extraClass = 'lap-slowest';
      }

      return `
        <tr class="lap-row ${extraClass}">
          <td class="lap-index">#${String(lap.index).padStart(2, '0')}</td>
          <td class="lap-time">${this.formatTimeString(lap.lapTime)}</td>
          <td class="lap-total">${this.formatTimeString(lap.totalTime)}</td>
          <td>
            <span class="lap-color-indicator">
              <span class="lap-color-dot" style="background-color: ${lap.color}; box-shadow: 0 0 6px ${lap.color};"></span>
              ${lap.colorName}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  getPolishLapWord(count) {
    if (count === 1) return 'okrążenie';
    if (count >= 2 && count <= 4) return 'okrążenia';
    return 'okrążeń';
  }

  runLoop() {
    if (!this.isRunning) return;

    this.elapsedTime = performance.now() - this.startTime;
    this.updateDisplay(this.elapsedTime);

    this.animationFrameId = requestAnimationFrame(() => this.runLoop());
  }

  /** Aktualizacja cyfr na ekranie oraz kontroli interwału 10s */
  updateDisplay(ms) {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((ms % 1000) / 10);

    // Formatowanie tekstu
    this.dom.hours.textContent = String(hours).padStart(2, '0');
    this.dom.minutes.textContent = String(minutes).padStart(2, '0');
    this.dom.seconds.textContent = String(seconds).padStart(2, '0');
    this.dom.milliseconds.textContent = String(hundredths).padStart(2, '0');

    // Mechanizm zmiany koloru co 10 sekund
    // 0-9.99s -> faza 0, 10-19.99s -> faza 1, 20-29.99s -> faza 2...
    const phase = Math.floor(totalSeconds / 10);
    const themeIndex = phase % COLOR_THEMES.length;

    if (phase !== this.lastDetectedPhase) {
      this.lastDetectedPhase = phase;
      this.applyColorTheme(themeIndex);
      // Dźwięk powiadomienia o zmianie barwy
      if (this.isRunning && phase > 0) {
        this.playSound(880, 'sine', 0.18);
      }
    }

    // Wskaźnik postępu bieżącego 10-sekundowego interwału
    const cycleProgressSeconds = totalSeconds % 10;
    const percentage = (cycleProgressSeconds / 10) * 100;
    this.dom.intervalProgressBar.style.width = `${percentage}%`;

    const remainingInCycle = Math.max(0, 10 - cycleProgressSeconds);
    this.dom.phaseCountdown.textContent = `Kolejny kolor za: ${remainingInCycle.toFixed(1)}s`;
  }

  /** Zastosowanie nowego motywu kolorystycznego */
  applyColorTheme(index) {
    this.currentThemeIndex = index;
    const theme = COLOR_THEMES[index];
    const root = document.documentElement;

    root.style.setProperty('--current-color', theme.hex);
    root.style.setProperty('--current-color-glow', theme.glow);
    root.style.setProperty('--current-color-soft', theme.soft);
    root.style.setProperty('--card-border-glow', theme.glow);

    this.dom.phaseName.textContent = `Faza ${index + 1}: ${theme.name}`;
    this.dom.phaseColorPreview.style.backgroundColor = theme.hex;
    this.dom.phaseColorPreview.style.boxShadow = `0 0 10px ${theme.hex}`;
  }

  formatTimeString(ms) {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const hundredths = Math.floor((ms % 1000) / 10);

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
  }
}

// Inicjalizacja stopera po załadowaniu drzewa DOM
document.addEventListener('DOMContentLoaded', () => {
  window.stopwatch = new ChromaStopwatch();
});
