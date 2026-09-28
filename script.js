/* ==========================================================================
   Сюрприз для Насти — логика
   Всё, что захочется поменять (тексты, фразы, цвета, пути к файлам),
   находится в объекте CONFIG ниже. Остальной код трогать не обязательно.
   ========================================================================== */

const CONFIG = {
  // Заголовок вкладки браузера
  pageTitle: 'Настя, это тебе ❤️',

  // Текст на стартовом экране
  introHint: 'Нажми, если тебе грустно',

  // Заголовок над фото
  title: 'Настя, это тебе ❤️, от Влада',

  // Послание. Пустая строка = новый абзац.
  message: `Настя, срочное сообщение! 🚨

По моим данным, у тебя тут завелась грусть. Это непорядок, и я уже принял меры: сделал для тебя эту страничку и даже немного пострадал над дизайном.

Напоминаю на всякий случай: ты мудрая, красивая и очень вкусная!

Я пока так мало тебя знаю — и так сильно хочу узнать больше…

Обнимаю тебя. Улыбнись, пожалуйста, хотя бы чуть-чуть 😊`,

  // Подпись в конце
  signature: 'Влад',

  // Фото. Если файла нет — покажется красивая заглушка.
  photo: {
    src: 'assets/photo.jpg',
    alt: 'Наше с Настей совместное фото',
    caption: 'мы 💕',
  },

  // Кнопка и ласковые фразы (показываются случайно, без повторов подряд)
  hugButton: 'Ещё раз обнять 🤗',
  phrases: [
    'Обнимаю крепко-крепко 🤗',
    'Ты у меня самая лучшая 💛',
    'Твоя улыбка — моя любимая вещь на свете',
    'Всё будет хорошо. Я рядом ✨',
    'Отправляю тебе сто поцелуйчиков 😘',
    'Ты — солнышко даже в пасмурный день ☀️',
    'Грусть, уходи! Настя под моей защитой 🛡️',
    'Мне так повезло с тобой 🍀',
    'Ещё одно объятие — бесплатно и без лимита 💞',
    'Ты справишься с чем угодно. А я помогу 💪',
  ],

  // Фоновая музыка. Если файла нет — кнопка не появится. '' — отключить совсем.
  music: {
    src: 'assets/music.mp3',
    volume: 0.5,
  },

  // Печатная машинка: базовая скорость (мс на символ) и паузы на знаках
  typing: {
    speed: 42,
    pauses: {
      ',': 180, ';': 220, ':': 260, '—': 200,
      '.': 420, '!': 420, '?': 420, '…': 650,
      '\n': 380,
    },
  },

  // Цвета. Меняются здесь — применяются ко всей странице.
  colors: {
    night: ['#140b2b', '#2d1b4e', '#5a2150'],                 // стартовый экран
    sunset: ['#e6ccff', '#ffc4d8', '#ffd0b0', '#fff1e6'],     // лаванда → розовый → персик → крем
    accent: '#ff5d8f',
    accentDeep: '#e0306e',
    ink: '#45203f',                                           // цвет текста
    themeNight: '#1a1033',                                    // цвет панели браузера до клика
    themeSunset: '#ffc4d8',                                   // ... и после
    particlesNight: ['#ff9ac1', '#ffc2dc', '#c9a7ff', '#fff4c7', '#ffffff'],
    particlesSunset: ['#ff7aa5', '#ff9e7d', '#b98cff', '#ffffff', '#ffb3c9'],
    confetti: ['#ff5d8f', '#ffb347', '#ffd166', '#b98cff', '#7ed6c1', '#ffffff', '#ff8fab'],
    hearts: ['#ff5d8f', '#ff85ae', '#e0306e', '#ffa3c4', '#ff6f91'],
  },
};

/* ========================================================================== */

(() => {
  'use strict';

  // ---------- Утилиты ----------
  const $ = (sel) => document.querySelector(sel);
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;

  // Разбиваем строку на видимые символы, не разрывая эмодзи вроде ❤️ или 👩‍❤️‍👨
  const splitGraphemes = (str) => {
    if (window.Intl && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(str), (s) => s.segment);
    }
    return Array.from(str);
  };

  // Форма сердца (тот же путь, что и в SVG) — для рисования на canvas
  const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  const heartPath2D = typeof Path2D === 'function' ? new Path2D(HEART_PATH) : null;

  /* ------------------------------------------------------------------------
     Спрайты: заранее рисуем каждую фигуру один раз в маленький canvas,
     а в анимации только копируем его через drawImage — это очень быстро.
     ------------------------------------------------------------------------ */
  const SPRITE_SIZE = 64;
  const spriteCache = new Map();

  function getSprite(shape, color) {
    const key = shape + color;
    if (spriteCache.has(key)) return spriteCache.get(key);

    const c = document.createElement('canvas');
    c.width = c.height = SPRITE_SIZE;
    const g = c.getContext('2d');
    const s = SPRITE_SIZE;
    g.fillStyle = color;

    if (shape === 'heart') {
      g.save();
      g.translate(s * 0.1, s * 0.1);
      g.scale((s * 0.8) / 24, (s * 0.8) / 24);
      if (heartPath2D) g.fill(heartPath2D);
      else { g.beginPath(); g.arc(12, 12, 9, 0, Math.PI * 2); g.fill(); }
      g.restore();
    } else if (shape === 'star') {
      // четырёхлучевая «искорка» с мягким свечением
      const r = s * 0.36;
      g.translate(s / 2, s / 2);
      g.shadowColor = color;
      g.shadowBlur = s * 0.12;
      g.beginPath();
      g.moveTo(0, -r);
      g.quadraticCurveTo(0, 0, r, 0);
      g.quadraticCurveTo(0, 0, 0, r);
      g.quadraticCurveTo(0, 0, -r, 0);
      g.quadraticCurveTo(0, 0, 0, -r);
      g.fill();
    } else {
      // лепесток: вытянутый овал с градиентом
      g.translate(s / 2, s / 2);
      const grad = g.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(255,255,255,0.55)');
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(0, 0, s * 0.2, s * 0.4, 0, 0, Math.PI * 2);
      g.fill();
    }

    spriteCache.set(key, c);
    return c;
  }

  /* ------------------------------------------------------------------------
     Canvas с учётом плотности пикселей (ограничиваем DPR до 2 ради скорости)
     ------------------------------------------------------------------------ */
  function setupCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const state = { canvas, ctx, w: 0, h: 0, dpr: 1 };
    state.resize = () => {
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = window.innerWidth;
      state.h = window.innerHeight;
      canvas.width = Math.round(state.w * state.dpr);
      canvas.height = Math.round(state.h * state.dpr);
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    };
    state.resize();
    return state;
  }

  /* ========================================================================
     Фоновые частицы: сердечки поднимаются, лепестки падают, звёзды мерцают
     ======================================================================== */
  const particles = (() => {
    const cv = setupCanvas($('#particles'));
    let list = [];
    let palette = CONFIG.colors.particlesNight;
    let mode = 'night';
    let rafId = 0;
    let last = 0;

    const SHAPES_NIGHT = ['heart', 'star', 'star', 'heart', 'petal'];
    const SHAPES_DAY = ['heart', 'petal', 'petal', 'heart', 'star'];

    function spawn(p, initial) {
      p.shape = pick(mode === 'night' ? SHAPES_NIGHT : SHAPES_DAY);
      p.sprite = getSprite(p.shape, pick(palette));
      p.size = p.shape === 'star' ? rand(6, 14) : rand(10, 22);
      p.x = rand(0, cv.w);
      // сердечки летят вверх, лепестки падают вниз, звёзды почти висят
      if (p.shape === 'petal') {
        p.vy = rand(14, 30);
        p.y = initial ? rand(0, cv.h) : -p.size * 2;
      } else if (p.shape === 'heart') {
        p.vy = -rand(10, 26);
        p.y = initial ? rand(0, cv.h) : cv.h + p.size * 2;
      } else {
        p.vy = -rand(2, 6);
        p.y = initial ? rand(0, cv.h) : cv.h + p.size;
      }
      p.swayAmp = rand(8, 26);
      p.swaySpeed = rand(0.3, 0.9);
      p.phase = rand(0, Math.PI * 2);
      p.rot = rand(-0.4, 0.4);
      p.spin = p.shape === 'petal' ? rand(-0.8, 0.8) : rand(-0.15, 0.15);
      p.alpha = p.shape === 'star' ? rand(0.4, 0.9) : rand(0.25, 0.6);
      p.twinkle = rand(1, 2.5);
      p.fadeIn = initial ? 1 : 0; // новые частицы плавно проявляются
      return p;
    }

    function populate() {
      const target = clamp(Math.round((cv.w * cv.h) / 20000), 16, 55);
      const count = reducedMotion ? Math.round(target / 2) : target;
      list = Array.from({ length: count }, () => spawn({}, true));
    }

    function draw(t) {
      const { ctx } = cv;
      ctx.clearRect(0, 0, cv.w, cv.h);
      for (const p of list) {
        const sway = Math.sin(t * p.swaySpeed + p.phase) * p.swayAmp;
        let a = p.alpha * p.fadeIn;
        if (p.shape === 'star') a *= 0.55 + 0.45 * Math.sin(t * p.twinkle + p.phase);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(p.x + sway, p.y);
        ctx.rotate(p.rot + Math.sin(t * p.swaySpeed + p.phase) * 0.3);
        ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05); // защита от скачков после паузы
      last = now;
      const t = now / 1000;
      for (const p of list) {
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if (p.fadeIn < 1) p.fadeIn = Math.min(1, p.fadeIn + dt * 0.8);
        const m = p.size * 3;
        if (p.y < -m || p.y > cv.h + m) spawn(p, false);
      }
      draw(t);
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (rafId || reducedMotion) return;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    // Смена палитры после «раскрытия» сердца: частицы постепенно перерождаются в тёплых цветах
    function setMode(next) {
      mode = next;
      palette = next === 'night' ? CONFIG.colors.particlesNight : CONFIG.colors.particlesSunset;
      list.forEach((p, i) => {
        // меняем цвет не всем сразу, а волной — так переход мягче
        setTimeout(() => { p.sprite = getSprite(p.shape, pick(palette)); p.fadeIn = reducedMotion ? 1 : 0; }, reducedMotion ? 0 : i * 40);
      });
      if (reducedMotion) setTimeout(() => draw(0), 50);
    }

    function init() {
      populate();
      if (reducedMotion) draw(0); // статичная картинка вместо анимации
      else start();
    }

    return { init, start, stop, setMode, resize: () => { cv.resize(); populate(); if (reducedMotion) draw(0); } };
  })();

  /* ========================================================================
     Эффекты поверх страницы: конфетти и волна сердечек.
     Цикл анимации работает только пока есть что рисовать.
     ======================================================================== */
  const fx = (() => {
    const cv = setupCanvas($('#fx'));
    let items = [];
    let rafId = 0;
    let last = 0;

    function confetti(x, y) {
      if (reducedMotion) return;
      const count = cv.w < 500 ? 110 : 170;
      for (let i = 0; i < count; i++) {
        // разлёт веером, в основном вверх
        const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const speed = rand(260, 820) * (cv.h < 500 ? 0.7 : 1);
        items.push({
          kind: 'confetti',
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: rand(6, 11),
          h: rand(9, 16),
          color: pick(CONFIG.colors.confetti),
          rot: rand(0, Math.PI * 2),
          spin: rand(-10, 10),
          flip: rand(0, Math.PI * 2),
          flipSpeed: rand(5, 12),
          life: 0,
          maxLife: rand(2.6, 4),
          round: Math.random() < 0.25,
        });
      }
      run();
    }

    function heartWave() {
      if (reducedMotion) return;
      const count = cv.w < 500 ? 34 : 54;
      for (let i = 0; i < count; i++) {
        const size = rand(18, 44);
        items.push({
          kind: 'heart',
          x: rand(size, cv.w - size),
          y: cv.h + size + rand(0, cv.h * 0.45), // волна: кто-то стартует ниже, чем другие
          vy: -rand(cv.h / 3.2, cv.h / 2.1),
          size,
          sprite: getSprite('heart', pick(CONFIG.colors.hearts)),
          swayAmp: rand(10, 34),
          swaySpeed: rand(1.5, 3),
          phase: rand(0, Math.PI * 2),
          rot: rand(-0.3, 0.3),
          life: 0,
          alpha: rand(0.75, 1),
        });
      }
      run();
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { ctx } = cv;
      ctx.clearRect(0, 0, cv.w, cv.h);

      const next = [];
      for (const p of items) {
        p.life += dt;

        if (p.kind === 'confetti') {
          p.vx *= 1 - 1.6 * dt;              // сопротивление воздуха
          p.vy = p.vy * (1 - 1.2 * dt) + 520 * dt; // гравитация
          p.x += p.vx * dt + Math.sin(p.flip) * 0.6;
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          p.flip += p.flipSpeed * dt;
          if (p.life > p.maxLife || p.y > cv.h + 40) continue;

          const fade = clamp((p.maxLife - p.life) / 0.8, 0, 1);
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.flip)); // «переворот» бумажки в воздухе
          if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
          else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        } else {
          p.y += p.vy * dt;
          if (p.y < -p.size * 2) continue;
          const x = p.x + Math.sin(p.life * p.swaySpeed + p.phase) * p.swayAmp;
          // плавно гаснут в верхней трети экрана
          const fade = clamp(p.y / (cv.h * 0.35), 0, 1);
          const grow = clamp(p.life * 3, 0, 1);
          ctx.globalAlpha = p.alpha * fade;
          const s = p.size * (0.6 + 0.4 * grow);
          ctx.save();
          ctx.translate(x, p.y);
          ctx.rotate(p.rot + Math.sin(p.life * p.swaySpeed + p.phase) * 0.15);
          ctx.drawImage(p.sprite, -s / 2, -s / 2, s, s);
          ctx.restore();
        }
        next.push(p);
      }
      ctx.globalAlpha = 1;
      items = next;

      if (items.length) rafId = requestAnimationFrame(frame);
      else { rafId = 0; ctx.clearRect(0, 0, cv.w, cv.h); }
    }

    function run() {
      if (rafId) return;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    function pause() { cancelAnimationFrame(rafId); rafId = 0; }
    function resume() { if (items.length) run(); }

    return { confetti, heartWave, pause, resume, resize: cv.resize };
  })();

  /* ========================================================================
     Печатная машинка с естественными паузами
     ======================================================================== */
  function typewriter(el, text, onDone) {
    const chars = splitGraphemes(text);
    const { speed, pauses } = CONFIG.typing;
    const node = document.createTextNode('');
    el.textContent = '';
    el.appendChild(node);

    let i = 0;
    let timer = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      node.data = text;
      onDone && onDone();
    };

    const tick = () => {
      if (i >= chars.length) return finish();
      const ch = chars[i++];
      node.data += ch;
      // пауза после знака препинания; многоточие из трёх точек — одна длинная пауза
      let delay = speed * rand(0.6, 1.4);
      const nextCh = chars[i];
      if (pauses[ch] && nextCh !== ch && !(ch === '\n' && nextCh === '\n')) delay += pauses[ch];
      if (ch === ' ' ) delay *= 0.6;
      timer = setTimeout(tick, delay);
    };

    if (reducedMotion) finish();
    else timer = setTimeout(tick, 300);

    return { skip: finish };
  }

  /* ========================================================================
     Наклон полароида за курсором / пальцем (tilt + блик)
     ======================================================================== */
  function setupTilt(el) {
    const sheen = el.querySelector('.polaroid__sheen');
    let frameReq = 0;
    let pending = null;

    const apply = () => {
      frameReq = 0;
      if (!pending) return;
      const { rx, ry, mx, my, lift } = pending;
      el.style.setProperty('--rx', rx + 'deg');
      el.style.setProperty('--ry', ry + 'deg');
      el.style.setProperty('--lift', lift);
      sheen.style.setProperty('--mx', mx + '%');
      sheen.style.setProperty('--my', my + '%');
    };

    const track = (e, lift) => {
      if (reducedMotion) return;
      const r = el.getBoundingClientRect();
      const px = clamp((e.clientX - r.left) / r.width, 0, 1);
      const py = clamp((e.clientY - r.top) / r.height, 0, 1);
      pending = {
        ry: (px - 0.5) * 16,
        rx: (0.5 - py) * 16,
        mx: px * 100,
        my: py * 100,
        lift,
      };
      el.classList.add('is-tracking');
      if (!frameReq) frameReq = requestAnimationFrame(apply);
    };

    const reset = () => {
      pending = { rx: 0, ry: 0, mx: 50, my: 30, lift: 1 };
      el.classList.remove('is-tracking');
      if (!frameReq) frameReq = requestAnimationFrame(apply);
    };

    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || e.buttons) track(e, e.pointerType === 'mouse' ? 1.02 : 1.04);
    });
    el.addEventListener('pointerdown', (e) => track(e, 1.04));
    el.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(reset, 250); });
    el.addEventListener('pointerleave', reset);
    el.addEventListener('pointercancel', reset);
  }

  /* ========================================================================
     Фото с запасным вариантом
     ======================================================================== */
  function setupPhoto() {
    const img = $('#photo');
    const placeholder = $('#photo-placeholder');
    const showPlaceholder = () => {
      img.hidden = true;
      placeholder.hidden = false;
      console.info('💌 Фото не найдено. Положи его сюда: ' + CONFIG.photo.src);
    };
    img.alt = CONFIG.photo.alt;
    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    img.addEventListener('error', showPlaceholder, { once: true });
    if (CONFIG.photo.src) img.src = CONFIG.photo.src;
    else showPlaceholder();
  }

  /* ========================================================================
     Музыка: кнопка появляется, только если файл реально загрузился
     ======================================================================== */
  function setupMusic() {
    const btn = $('#music-btn');
    if (!CONFIG.music.src) return;

    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'metadata';
    audio.volume = CONFIG.music.volume;

    audio.addEventListener('loadedmetadata', () => { btn.hidden = false; }, { once: true });
    audio.addEventListener('error', () => { btn.hidden = true; });
    audio.src = CONFIG.music.src;

    const setState = (on) => {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Выключить музыку' : 'Включить музыку');
    };

    btn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => setState(true)).catch(() => setState(false));
      } else {
        audio.pause();
        setState(false);
      }
    });
  }

  /* ========================================================================
     Тексты из CONFIG → на страницу
     ======================================================================== */
  function applyConfig() {
    document.title = CONFIG.pageTitle;

    const texts = {
      introHint: CONFIG.introHint,
      title: CONFIG.title,
      signature: CONFIG.signature,
      hugButton: CONFIG.hugButton,
      photoCaption: CONFIG.photo.caption,
    };
    document.querySelectorAll('[data-text]').forEach((el) => {
      const value = texts[el.dataset.text];
      if (typeof value === 'string') el.textContent = value;
    });
    $('#message-full').textContent = CONFIG.message;

    const c = CONFIG.colors;
    const root = document.documentElement.style;
    c.night.forEach((v, i) => root.setProperty(`--night-${i + 1}`, v));
    c.sunset.forEach((v, i) => root.setProperty(`--sunset-${i + 1}`, v));
    root.setProperty('--accent', c.accent);
    root.setProperty('--accent-deep', c.accentDeep);
    root.setProperty('--ink', c.ink);
    setThemeColor(c.themeNight);

    // Градиент SVG-сердца на старте — тоже из акцентных цветов
    const stops = document.querySelectorAll('#heart-gradient stop');
    if (stops.length === 3) {
      stops[1].setAttribute('stop-color', c.accent);
      stops[2].setAttribute('stop-color', c.accentDeep);
    }
  }

  function setThemeColor(color) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
  }

  /* ========================================================================
     Сценарий
     ======================================================================== */
  const intro = $('#intro');
  const heartBtn = $('#heart-btn');
  const letter = $('#letter');
  const title = $('#letter-title');
  const card = $('#message-card');
  const signature = $('#signature');
  const caret = $('#message-caret');
  const hug = $('#hug');
  const hugBtn = $('#hug-btn');
  const phraseEl = $('#hug-phrase');

  let opened = false;
  let typing = null;

  function open() {
    if (opened) return;
    opened = true;

    // центр сердца — точка, откуда полетит конфетти
    const r = heartBtn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    intro.classList.add('is-opening');
    document.body.classList.add('is-open');
    setThemeColor(CONFIG.colors.themeSunset);
    particles.setMode('sunset');
    if (navigator.vibrate && !reducedMotion) navigator.vibrate([18, 60, 28]); // лёгкий «тук-тук» на Android

    setTimeout(() => fx.confetti(cx, cy), reducedMotion ? 0 : 220);

    setTimeout(() => {
      intro.hidden = true;
      letter.hidden = false;
      window.scrollTo(0, 0);
      // даём браузеру отрисовать начальное состояние, потом запускаем переходы
      requestAnimationFrame(() => requestAnimationFrame(() => letter.classList.add('is-visible')));
      title.focus({ preventScroll: true });

      setTimeout(startTyping, reducedMotion ? 0 : 1500);
    }, reducedMotion ? 250 : 950);
  }

  function startTyping() {
    const textEl = $('#message-text');
    typing = typewriter(textEl, CONFIG.message, () => {
      caret.classList.add('is-done');
      setTimeout(() => signature.classList.add('is-visible'), reducedMotion ? 0 : 350);
      setTimeout(() => hug.classList.add('is-visible'), reducedMotion ? 0 : 1100);
    });
  }

  // Тап по карточке — сразу показать весь текст (если не хочется ждать)
  card.addEventListener('click', () => typing && typing.skip());

  let lastPhrase = -1;
  function hugAgain() {
    fx.heartWave();
    if (navigator.vibrate && !reducedMotion) navigator.vibrate(25);

    let idx;
    do { idx = (Math.random() * CONFIG.phrases.length) | 0; }
    while (CONFIG.phrases.length > 1 && idx === lastPhrase);
    lastPhrase = idx;

    phraseEl.textContent = CONFIG.phrases[idx];
    // перезапуск CSS-анимации появления
    phraseEl.classList.remove('is-new');
    void phraseEl.offsetWidth;
    phraseEl.classList.add('is-new');
  }

  /* ---------- Инициализация ---------- */
  applyConfig();
  setupPhoto();
  setupMusic();
  setupTilt($('#polaroid-inner'));
  particles.init();

  heartBtn.addEventListener('click', open);
  hugBtn.addEventListener('click', hugAgain);

  // Ресайз / поворот экрана — с небольшой задержкой, чтобы не пересчитывать на каждый пиксель
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { particles.resize(); fx.resize(); }, 150);
  });

  // Вкладка скрыта — ничего не рисуем, бережём батарею
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { particles.stop(); fx.pause(); }
    else { particles.start(); fx.resume(); }
  });

  // Пользователь поменял настройку «уменьшить движение» на лету
  const onMotionChange = (e) => {
    reducedMotion = e.matches;
    if (reducedMotion) particles.stop();
    particles.resize();
    if (!reducedMotion) particles.start();
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
})();
