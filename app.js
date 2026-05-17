/**
 * 우당탕탕 발표 순서 뽑기! - Core Application Logic
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // Lazy initialization to conform with browser autoplay policy
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio playClick error", e);
    }
  }

  playTick() {
    if (!this.enabled) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.setValueAtTime(300, this.ctx.currentTime + 0.01);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.03);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {
      console.warn("Audio playTick error", e);
    }
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      // Beautiful energetic C-major arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.4);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch (e) {
      console.warn("Audio playSuccess error", e);
    }
  }

  playReset() {
    if (!this.enabled) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.18);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);

      osc.start();
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn("Audio playReset error", e);
    }
  }
}

class PresenterApp {
  constructor() {
    this.sound = new SoundEngine();
    
    // Core Application State
    this.currentMode = 'names'; // 'names' | 'numbers' | 'groups'
    
    this.state = {
      names: {
        list: [],      // Registered items
        remaining: [], // Items left to draw
        drawn: []      // Already drawn items
      },
      numbers: {
        list: [],
        remaining: [],
        drawn: []
      },
      groups: {
        list: [],
        remaining: [],
        drawn: []
      }
    };
    
    this.isRolling = false;
  }

  init() {
    // Bind click sound to the whole page to unlock Web Audio context safely
    document.addEventListener('click', () => {
      this.sound.init();
    }, { once: true });

    this.loadFromLocalStorage();
    this.updateTabUI();
    this.renderInputsAndChips();
    this.updateStageStats();
    this.resetStageDisplay();
  }

  /* --- STORAGE & PERSISTENCE --- */
  saveToLocalStorage() {
    const dataToSave = {
      currentMode: this.currentMode,
      soundEnabled: this.sound.enabled,
      state: this.state
    };
    localStorage.setItem('antigravity_presenter_data', JSON.stringify(dataToSave));
  }

  loadFromLocalStorage() {
    try {
      const rawData = localStorage.getItem('antigravity_presenter_data');
      if (rawData) {
        const parsed = JSON.parse(rawData);
        if (parsed.currentMode) this.currentMode = parsed.currentMode;
        if (parsed.soundEnabled !== undefined) {
          this.sound.enabled = parsed.soundEnabled;
          this.updateSoundToggleBtn();
        }
        if (parsed.state) {
          this.state = parsed.state;
        }
      } else {
        // Load some nice defaults so the app doesn't look empty on first view
        this.state.names.list = ["강민우", "김은지", "박지민", "서현우", "이지아", "최다원", "한주원", "홍길동"];
        this.state.names.remaining = [...this.state.names.list];
        
        this.state.groups.list = ["1모둠 🍎", "2모둠 🍇", "3모둠 🍊", "4모둠 🍋", "5모둠 🍉", "6모둠 🥝"];
        this.state.groups.remaining = [...this.state.groups.list];

        // Generate numbers default 1~30
        this.generateNumbersRange(1, 30, false);
        this.saveToLocalStorage();
      }
    } catch (e) {
      console.error("Local storage load error", e);
    }
  }

  /* --- SOUND TOGGLE --- */
  toggleSound() {
    this.sound.enabled = !this.sound.enabled;
    this.sound.playClick();
    this.updateSoundToggleBtn();
    this.saveToLocalStorage();
  }

  updateSoundToggleBtn() {
    const btn = document.getElementById('soundToggleBtn');
    const span = btn.querySelector('span');
    const icon = btn.querySelector('i');
    
    if (this.sound.enabled) {
      btn.className = 'control-btn sound-on';
      span.textContent = '효과음 켜짐';
      icon.className = 'fas fa-volume-up';
    } else {
      btn.className = 'control-btn sound-off';
      span.textContent = '효과음 꺼짐';
      icon.className = 'fas fa-volume-mute';
    }
  }

  /* --- RESET FUNCTIONS --- */
  resetAll() {
    this.sound.playReset();
    
    const mode = this.currentMode;
    // Reset remaining items to match registered list, and clear drawn items
    this.state[mode].remaining = [...this.state[mode].list];
    this.state[mode].drawn = [];
    
    this.saveToLocalStorage();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
    
    // Animate stage card color reset
    const screen = document.getElementById('screenCard');
    screen.style.background = '#FFEAA7'; // default cute yellow
  }

  /* --- TAB SWITCHING --- */
  switchTab(mode) {
    if (this.isRolling) return;
    this.sound.playClick();
    this.currentMode = mode;
    this.saveToLocalStorage();

    this.updateTabUI();
    this.renderInputsAndChips();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
  }

  updateTabUI() {
    const tabs = ['names', 'numbers', 'groups'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
      if (t === this.currentMode) {
        btn.classList.add('active');
        document.getElementById(`config${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.add('active');
      } else {
        btn.classList.remove('active');
        document.getElementById(`config${t.charAt(0).toUpperCase() + t.slice(1)}`).classList.remove('active');
      }
    });

    // Update screen theme colors based on active tab
    const screen = document.getElementById('screenCard');
    const badge = document.getElementById('stageBadge');
    if (this.currentMode === 'names') {
      screen.style.background = '#FFEAA7'; // pastel yellow
      badge.textContent = '👤 학생 이름 뽑기';
    } else if (this.currentMode === 'numbers') {
      screen.style.background = '#C8E6C9'; // pastel mint
      badge.textContent = '🔢 번호로 뽑기';
    } else {
      screen.style.background = '#D2E8FF'; // pastel sky-blue
      badge.textContent = '👥 모둠으로 뽑기';
    }
  }

  /* --- NUMERIC & INPUT ADJUSTMENTS --- */
  adjustStudentCount(val) {
    this.sound.playClick();
    const input = document.getElementById('quickCountInput');
    let current = parseInt(input.value) || 20;
    current = Math.max(1, Math.min(100, current + val));
    input.value = current;
  }

  adjustGroupCount(val) {
    this.sound.playClick();
    const input = document.getElementById('groupCountInput');
    let current = parseInt(input.value) || 6;
    current = Math.max(1, Math.min(50, current + val));
    input.value = current;
  }

  adjustNumberValue(id, val) {
    this.sound.playClick();
    const input = document.getElementById(id);
    let current = parseInt(input.value) || 1;
    current = Math.max(1, current + val);
    input.value = current;
  }

  applyNumberPreset(max) {
    this.sound.playClick();
    document.getElementById('numStart').value = 1;
    document.getElementById('numEnd').value = max;
  }

  /* --- INPUT ACTIONS & CHIP RENDERERS --- */
  renderInputsAndChips() {
    const mode = this.currentMode;
    
    if (mode === 'names') {
      const container = document.getElementById('namesChipsContainer');
      const badge = document.getElementById('namesCountBadge');
      container.innerHTML = '';
      badge.textContent = `${this.state.names.list.length}명`;
      
      const colors = ['chip-pink', 'chip-mint', 'chip-blue', 'chip-purple', 'chip-yellow'];
      
      this.state.names.list.forEach((name, idx) => {
        const color = colors[idx % colors.length];
        const chip = document.createElement('span');
        chip.className = `chip ${color}`;
        chip.innerHTML = `
          <span>${name}</span>
          <span class="delete-chip" onclick="app.deleteChip('names', '${name}')">&times;</span>
        `;
        container.appendChild(chip);
      });
    } 
    else if (mode === 'groups') {
      const container = document.getElementById('groupsChipsContainer');
      const badge = document.getElementById('groupsCountBadge');
      container.innerHTML = '';
      badge.textContent = `${this.state.groups.list.length}개`;
      
      const colors = ['chip-blue', 'chip-purple', 'chip-pink', 'chip-yellow', 'chip-mint'];
      
      this.state.groups.list.forEach((group, idx) => {
        const color = colors[idx % colors.length];
        const chip = document.createElement('span');
        chip.className = `chip ${color}`;
        chip.innerHTML = `
          <span>${group}</span>
          <span class="delete-chip" onclick="app.deleteChip('groups', '${group}')">&times;</span>
        `;
        container.appendChild(chip);
      });
    }
  }

  deleteChip(mode, item) {
    this.sound.playClick();
    
    // Filter list
    this.state[mode].list = this.state[mode].list.filter(x => x !== item);
    // Filter remaining & drawn
    this.state[mode].remaining = this.state[mode].remaining.filter(x => x !== item);
    this.state[mode].drawn = this.state[mode].drawn.filter(x => x !== item);
    
    this.saveToLocalStorage();
    this.renderInputsAndChips();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
  }

  // Generate names by number: 1번 학생, 2번 학생...
  generateByNumbers() {
    this.sound.playClick();
    const count = parseInt(document.getElementById('quickCountInput').value) || 20;
    
    const generated = [];
    for (let i = 1; i <= count; i++) {
      generated.push(`${i}번 학생`);
    }
    
    this.state.names.list = generated;
    this.state.names.remaining = [...generated];
    this.state.names.drawn = [];
    
    this.saveToLocalStorage();
    this.renderInputsAndChips();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
  }

  // Add manually typed custom names
  addCustomNames() {
    this.sound.playClick();
    const txtArea = document.getElementById('namesTextarea');
    const val = txtArea.value.trim();
    if (!val) return;
    
    // Split by commas or newlines, remove empty tokens and trim whitespace
    const items = val.split(/[,\n]/)
      .map(x => x.trim())
      .filter(x => x.length > 0);
      
    // Filter duplicates
    const unique = [...new Set([...this.state.names.list, ...items])];
    
    this.state.names.list = unique;
    this.state.names.remaining = [...unique];
    this.state.names.drawn = [];
    
    txtArea.value = ''; // clear input
    this.saveToLocalStorage();
    this.renderInputsAndChips();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
  }

  // Generate numbers range (Start to End)
  generateNumbersRange(start, end, resetRemaining = true) {
    const list = [];
    for (let i = start; i <= end; i++) {
      list.push(`${i}번`);
    }
    
    this.state.numbers.list = list;
    if (resetRemaining) {
      this.state.numbers.remaining = [...list];
      this.state.numbers.drawn = [];
    }
  }

  applyNumbersRange() {
    this.sound.playClick();
    const start = parseInt(document.getElementById('numStart').value) || 1;
    const end = document.getElementById('numEnd').value;
    let endVal = parseInt(end) || 30;
    
    if (start > endVal) {
      alert("시작 번호는 끝 번호보다 작아야 합니다! 😊");
      return;
    }
    if (endVal - start > 200) {
      alert("너무 많은 번호 범위는 교실에서 사용하기 어려워요! 200개 이하로 선택해 주세요. 🎒");
      return;
    }
    
    this.generateNumbersRange(start, endVal, true);
    
    this.saveToLocalStorage();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
  }

  // Generate groups by count: 1모둠, 2모둠...
  generateGroupsByCount() {
    this.sound.playClick();
    const count = parseInt(document.getElementById('groupCountInput').value) || 6;
    
    const generated = [];
    for (let i = 1; i <= count; i++) {
      generated.push(`${i}모둠`);
    }
    
    this.state.groups.list = generated;
    this.state.groups.remaining = [...generated];
    this.state.groups.drawn = [];
    
    this.saveToLocalStorage();
    this.renderInputsAndChips();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
  }

  // Add custom groups
  addCustomGroups() {
    this.sound.playClick();
    const txtArea = document.getElementById('groupsTextarea');
    const val = txtArea.value.trim();
    if (!val) return;
    
    const items = val.split(/[,\n]/)
      .map(x => x.trim())
      .filter(x => x.length > 0);
      
    const unique = [...new Set([...this.state.groups.list, ...items])];
    
    this.state.groups.list = unique;
    this.state.groups.remaining = [...unique];
    this.state.groups.drawn = [];
    
    txtArea.value = '';
    this.saveToLocalStorage();
    this.renderInputsAndChips();
    this.updateStageStats();
    this.resetStageDisplay();
    this.renderDrawnTimeline();
  }

  /* --- VIEW RENDERERS & TIMELINE --- */
  updateStageStats() {
    const mode = this.currentMode;
    const activeState = this.state[mode];
    
    const remVal = activeState.remaining.length;
    const drawnVal = activeState.drawn.length;
    const totVal = activeState.list.length;
    
    document.getElementById('statRemaining').textContent = remVal;
    document.getElementById('statDrawn').textContent = drawnVal;
    document.getElementById('statTotal').textContent = totVal;

    // Enable/Disable Draw Button based on state
    const drawBtn = document.getElementById('drawBtn');
    if (totVal === 0 || remVal === 0 || this.isRolling) {
      drawBtn.disabled = true;
    } else {
      drawBtn.disabled = false;
    }
  }

  resetStageDisplay() {
    const mode = this.currentMode;
    const activeState = this.state[mode];
    const display = document.getElementById('slotDisplayText');
    const subtitle = document.getElementById('statusSubtitleText');
    
    if (activeState.list.length === 0) {
      display.textContent = "명단을 등록해 주세요! ✏️";
      subtitle.textContent = "왼쪽 카드에서 학생, 번호 또는 모둠을 등록할 수 있습니다.";
    } else if (activeState.remaining.length === 0) {
      display.textContent = "모두 발표 완료! 🥳";
      subtitle.textContent = "더 이상 남은 발표자가 없습니다. 초기화해서 다시 시작하세요!";
    } else {
      display.textContent = "준비 완료! 🎉";
      subtitle.textContent = `전체 ${activeState.list.length}개 중 ${activeState.remaining.length}개 대기 중`;
    }
  }

  renderDrawnTimeline() {
    const mode = this.currentMode;
    const drawnList = this.state[mode].drawn;
    const listContainer = document.getElementById('drawnCardsList');
    const emptyMsg = document.getElementById('emptyResults');
    
    listContainer.innerHTML = '';
    
    if (drawnList.length === 0) {
      emptyMsg.style.display = 'flex';
      return;
    }
    
    emptyMsg.style.display = 'none';
    
    // Display drawn items in reverse chronological order (newly drawn at the top)
    const reversedDrawn = [...drawnList].reverse();
    
    reversedDrawn.forEach((item, idx) => {
      // Real rank index is (total - idx of original)
      const rank = drawnList.length - idx;
      
      const card = document.createElement('div');
      
      // Assign custom medal classes for first 3 picks
      let medalClass = '';
      if (rank === 1) medalClass = 'first';
      else if (rank === 2) medalClass = 'second';
      else if (rank === 3) medalClass = 'third';
      
      card.className = `drawn-card ${medalClass}`;
      card.innerHTML = `
        <span class="drawn-badge">${rank}</span>
        <span class="drawn-name">${item}</span>
        <span style="font-size: 0.8rem; opacity: 0.5;">발표 확정 ✨</span>
      `;
      listContainer.appendChild(card);
    });
  }

  /* --- LUCKY DRAW MACHINE (ROULETTE CORE) --- */
  drawNext() {
    const mode = this.currentMode;
    const activeState = this.state[mode];
    
    if (activeState.remaining.length === 0 || this.isRolling) return;
    
    this.isRolling = true;
    this.updateStageStats(); // Disables button immediately
    
    const display = document.getElementById('slotDisplayText');
    const subtitle = document.getElementById('statusSubtitleText');
    const screen = document.getElementById('screenCard');
    
    display.classList.add('rolling');
    subtitle.textContent = "두구두구두구... 누가 뽑힐까요?";
    
    // Choose random targets from *entire registered list* (or remaining list) to display while rolling
    const samplePool = activeState.list;
    
    // Slowdown physics timer
    let currentInterval = 50; // ms
    const totalDuration = 1800; // 1.8 seconds rolling
    const startTime = Date.now();
    
    const tick = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= totalDuration) {
        // Animation finished! Reveal the true winner.
        display.classList.remove('rolling');
        this.finalizeDraw();
      } else {
        // Change displayed name randomly
        const randomIdx = Math.floor(Math.random() * samplePool.length);
        display.textContent = samplePool[randomIdx];
        
        // Play tick sound
        this.sound.playTick();
        
        // Quadratic slowdown curve (slowing down as it approaches the end)
        const progress = elapsed / totalDuration;
        currentInterval = 50 + (progress * progress) * 220; // decelerates up to ~270ms interval
        
        setTimeout(tick, currentInterval);
      }
    };
    
    setTimeout(tick, currentInterval);
  }

  finalizeDraw() {
    const mode = this.currentMode;
    const activeState = this.state[mode];
    
    // 1. Pick a random winner from the remaining candidates
    const winnerIdx = Math.floor(Math.random() * activeState.remaining.length);
    const winner = activeState.remaining[winnerIdx];
    
    // 2. Remove winner from remaining, append to drawn
    activeState.remaining.splice(winnerIdx, 1);
    activeState.drawn.push(winner);
    
    // 3. Save states
    this.isRolling = false;
    this.saveToLocalStorage();
    this.updateStageStats();
    
    // 4. Highlight winner on screen
    const display = document.getElementById('slotDisplayText');
    const subtitle = document.getElementById('statusSubtitleText');
    const screen = document.getElementById('screenCard');
    
    display.textContent = winner;
    subtitle.innerHTML = `🎉 축하합니다! <strong style="color:var(--color-coral); font-size:1.1rem;">${activeState.drawn.length}번째</strong> 발표자입니다.`;
    
    // Render timeline list
    this.renderDrawnTimeline();
    
    // 5. Sound & Confetti celebration
    this.sound.playSuccess();
    
    // Fire beautiful bright confetti!
    this.triggerConfetti();

    // If completely finished, trigger grand confetti show after 0.8s
    if (activeState.remaining.length === 0) {
      setTimeout(() => {
        this.triggerGrandConfetti();
        display.textContent = "모든 발표 완료! 🥳";
        subtitle.textContent = "대단해요! 초기화 버튼을 클릭하여 다시 시작해 보세요.";
      }, 900);
    }
  }

  /* --- CONFETTI EFFECTS --- */
  triggerConfetti() {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFEAA7', '#FF8A80', '#55E6C1', '#54A0FF', '#D6A2E8', '#FF7675']
      });
    } catch (e) {
      console.warn("Confetti failed", e);
    }
  }

  triggerGrandConfetti() {
    try {
      const end = Date.now() + (1.5 * 1000);
      const colors = ['#FFEAA7', '#FF8A80', '#55E6C1', '#54A0FF', '#D6A2E8'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    } catch (e) {
      console.warn("Grand Confetti failed", e);
    }
  }
}

// Global App Instance
const app = new PresenterApp();

// Wait for window to load
window.addEventListener('load', () => {
  app.init();
});
