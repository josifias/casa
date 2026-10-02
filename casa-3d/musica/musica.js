// Música ambiente das duas páginas: botão liga/desliga com fade, tecla M, lembra a preferência
// e respeita o bloqueio de som automático dos navegadores (só toca depois de um toque/clique).
// Gravação: "Gymnopedie No. 1" (Erik Satie) por Kevin MacLeod (incompetech.com), CC BY 3.0.
(() => {
  const btn = document.getElementById('bMusic');
  if (!btn) return;
  const KEY = 'casa3d.musica', VOL = .45;
  let audio = null, gain = null, ctx = null, on = false, fadeId = 0;

  const remember = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* sem armazenamento */ } };
  const wanted = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
  const hint = (msg) => {
    const h = document.getElementById('hint');
    if (!h) return;
    h.textContent = msg; h.classList.add('on');
    clearTimeout(hint.t); hint.t = setTimeout(() => h.classList.remove('on'), 3800);
  };
  const setPressed = (v) => btn.setAttribute('aria-pressed', String(v));

  function setup() {
    audio = new Audio(btn.dataset.src);
    audio.loop = true; audio.preload = 'auto';
    // No iPhone o volume do <audio> é fixo; com Web Audio dá para controlar e fazer o fade.
    // Em file:// o Chrome silencia o Web Audio de arquivos locais, então ali usa o volume do elemento.
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && location.protocol.startsWith('http')) {
      try {
        ctx = new AC();
        gain = ctx.createGain(); gain.gain.value = 0;
        ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination);
      } catch { ctx = gain = null; }
    }
    if (!gain) audio.volume = 0;
  }
  function fadeTo(to, ms, done) {
    const id = ++fadeId;
    if (gain) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(to, t + ms / 1000);
      if (done) setTimeout(() => { if (id === fadeId) done(); }, ms);
      return;
    }
    const from = audio.volume, t0 = performance.now();
    const step = (now) => {
      if (id !== fadeId) return;
      const k = Math.min(1, (now - t0) / ms);
      audio.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    requestAnimationFrame(step);
  }
  function play(announce = true) {
    if (!audio) setup();
    on = true; setPressed(true);
    if (ctx && ctx.state === 'suspended') ctx.resume();
    audio.play().then(() => {
      if (!on) return;   // foi desligada antes de começar a tocar: não reabre o volume
      fadeTo(VOL, 1800);
      if (announce) hint('♪ Gymnopédie nº 1 — Erik Satie (gravação: Kevin MacLeod)');
    }).catch(() => { on = false; setPressed(false); });
  }
  function stop() {
    on = false; setPressed(false);
    if (audio) fadeTo(0, 700, () => audio.pause());
  }

  btn.addEventListener('click', () => { if (on) { stop(); remember(false); } else { play(); remember(true); } });
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyM' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input,textarea')) return;
    btn.click();
  });
  // Se a música já estava ligada (ex.: veio do apartamento), volta a tocar no primeiro toque na página.
  if (wanted()) {
    setPressed(true);
    const first = (e) => {
      if (btn.contains(e.target) || e.code === 'KeyM') return;   // o botão e a tecla M já tratam sozinhos
      removeEventListener('pointerdown', first, true); removeEventListener('keydown', first, true);
      if (!on) play(false);
    };
    addEventListener('pointerdown', first, true); addEventListener('keydown', first, true);
    btn.addEventListener('click', () => { removeEventListener('pointerdown', first, true); removeEventListener('keydown', first, true); }, { once: true });
  }
  // pausa com a aba em segundo plano e retoma ao voltar
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else if (on) audio.play().catch(() => {});
  });
})();
