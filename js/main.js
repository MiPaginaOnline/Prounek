/* ==========================================================================
   PROUNEK — Interacciones compartidas
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var body = document.body;

  /* ── 1. TRANSICIÓN ENTRE PÁGINAS ───────────────────────────────────── */
  function pageIn() {
    body.classList.remove('is-leaving');
    requestAnimationFrame(function () { body.classList.add('is-loaded'); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pageIn);
  } else { pageIn(); }
  // Al volver con el botón "atrás" (bfcache)
  window.addEventListener('pageshow', function (e) { if (e.persisted) pageIn(); });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (!/\.html$|\/$/.test(url.pathname)) return;
    // Mismo documento + ancla → scroll suave normal
    if (url.pathname === location.pathname && url.hash) return;
    if (reduceMotion) return;
    e.preventDefault();
    body.classList.add('is-leaving');
    setTimeout(function () { location.href = url.href; }, 560);
  });

  /* ── 2. NAVBAR: estado al hacer scroll, ocultar al bajar ───────────── */
  var nav = document.querySelector('.site-nav');
  var progress = document.querySelector('.scroll-progress');
  var toTop = document.querySelector('.to-top');
  var toTopRing = toTop ? toTop.querySelector('.ring circle') : null;
  var waFloat = document.querySelector('.wa-float');
  var lastY = window.scrollY;
  var menuOpen = false;

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(y / max, 1) : 0;

    if (nav) {
      nav.classList.toggle('scrolled', y > 30);
      if (!menuOpen) nav.classList.toggle('hidden', y > lastY && y > 400);
    }
    if (progress) progress.style.transform = 'scaleX(' + p + ')';
    if (toTop) {
      toTop.classList.toggle('show', y > 600);
      if (toTopRing) toTopRing.style.strokeDashoffset = 132 - 132 * p;
    }
    if (waFloat) waFloat.classList.toggle('show', y > 300);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ── 3. MENÚ MÓVIL ─────────────────────────────────────────────────── */
  var burger = document.querySelector('.hamburger');
  var navLinks = document.querySelector('.nav-links');
  function setMenu(open) {
    menuOpen = open;
    burger.classList.toggle('open', open);
    navLinks.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.classList.toggle('menu-open', open);
    if (open && nav) nav.classList.remove('hidden');
  }
  if (burger && navLinks) {
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  }

  /* ── 4. ENLACE ACTIVO SEGÚN SECCIÓN ────────────────────────────────── */
  var sectionLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  if (sectionLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    sectionLinks.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          sectionLinks.forEach(function (l) { l.classList.remove('active'); });
          map[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) secObs.observe(s);
    });
  }

  /* ── 5. TÍTULOS PALABRA A PALABRA ─────────────────────────────────── */
  document.querySelectorAll('.split-words').forEach(function (el) {
    var i = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var inner = document.createElement('span');
            inner.style.setProperty('--i', i++);
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.classList.contains('text-gradient')) {
          // Bloque que se anima entero (mantiene el degradado intacto)
          var wb = document.createElement('span');
          wb.className = 'w';
          var ib = document.createElement('span');
          ib.style.setProperty('--i', i++);
          node.replaceChild(wb, child);
          ib.appendChild(child);
          wb.appendChild(ib);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    }
    walk(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  });

  /* ── 6. REVELADO AL HACER SCROLL ──────────────────────────────────── */
  var revealEls = document.querySelectorAll('.reveal, .split-words');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          el.classList.add('in');
          revObs.unobserve(el);
          // Al terminar, se quita .reveal para que los hovers propios no hereden el retardo
          if (el.classList.contains('reveal')) {
            var d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
            setTimeout(function () { el.classList.remove('reveal'); }, 1000 + d * 1000);
          }
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── 7. CONTADORES ANIMADOS ───────────────────────────────────────── */
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var prefix = el.dataset.prefix || '';
    var suffix = el.dataset.suffix || '';
    var dur = 1800;
    var start = null;
    function fmt(v) { return prefix + v.toFixed(decimals).replace('.', ',') + suffix; }
    if (reduceMotion) { el.textContent = fmt(target); return; }
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCounter(en.target); cObs.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cObs.observe(c); });
  }

  /* ── 8. CURSOR, FOCO DE LUZ, BOTONES MAGNÉTICOS E INCLINACIÓN 3D ──── */
  if (finePointer && !reduceMotion) {
    // Cursor
    var ring = document.querySelector('.cursor-ring');
    var dot  = document.querySelector('.cursor-dot');
    if (ring && dot) {
      var mx = -100, my = -100, rx = -100, ry = -100;
      window.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
        body.classList.add('cursor-on');
      }, { passive: true });
      document.addEventListener('mouseleave', function () { body.classList.remove('cursor-on'); });
      (function loop() {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
        requestAnimationFrame(loop);
      })();
      document.addEventListener('mouseover', function (e) {
        var hit = e.target.closest('a, button, select, .budget-pill, [data-cursor]');
        body.classList.toggle('cursor-hover', !!hit);
      });
    }

    // Foco de luz en tarjetas
    document.querySelectorAll('.spotlight').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    // Botones magnéticos
    document.querySelectorAll('.magnetic').forEach(function (btn) {
      var strength = parseFloat(btn.dataset.strength || '0.3');
      btn.addEventListener('mouseenter', function () { btn.style.transition = 'transform .2s ease-out, box-shadow .35s, color .3s, border-color .3s, background .3s'; });
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * strength;
        var y = (e.clientY - r.top - r.height / 2) * strength;
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1), box-shadow .35s, color .3s, border-color .3s, background .3s';
        btn.style.transform = '';
      });
    });

    // Inclinación 3D
    document.querySelectorAll('.tilt').forEach(function (card) {
      var max = parseFloat(card.dataset.tilt || '6');
      card.addEventListener('mouseenter', function () {
        card.style.transition = 'transform .15s ease-out, box-shadow .4s, border-color .4s, background .4s';
      });
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (-py * max) + 'deg) rotateY(' + (px * max) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1), box-shadow .4s, border-color .4s, background .4s';
        card.style.transform = '';
      });
    });

    // Foco del hero que sigue al ratón
    var hero = document.querySelector('[data-hero-glow]');
    if (hero) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty('--hx', (e.clientX - r.left) + 'px');
        hero.style.setProperty('--hy', (e.clientY - r.top) + 'px');
      });
    }
  }

  /* ── 9. ONDAS DEL HERO (canvas) ───────────────────────────────────── */
  document.querySelectorAll('canvas.wave-canvas').forEach(function (canvas) {
    var ctx = canvas.getContext('2d');
    var W, H, t = 0, running = true;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var mouseY = 0.5, targetMouseY = 0.5;
    var scale = parseFloat(canvas.dataset.scale || '1');

    function resize() {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    var host = canvas.parentElement;
    host.addEventListener('mousemove', function (e) {
      var r = host.getBoundingClientRect();
      targetMouseY = (e.clientY - r.top) / r.height;
    });

    var waves = [
      { amp: 0.10, freq: 0.0042, speed: 0.55, off: 0,   y: 0.46, color: 'rgba(9,22,82,0.05)',   lw: 170 },
      { amp: 0.14, freq: 0.0034, speed: 0.40, off: 1.2, y: 0.53, color: 'rgba(37,99,235,0.035)', lw: 210 },
      { amp: 0.08, freq: 0.0058, speed: 0.65, off: 2.5, y: 0.49, color: 'rgba(9,22,82,0.03)',   lw: 130 }
    ];

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      mouseY += (targetMouseY - mouseY) * 0.03;
      var shift = (mouseY - 0.5) * 0.12;
      waves.forEach(function (w) {
        ctx.beginPath();
        ctx.lineWidth = w.lw * scale;
        ctx.strokeStyle = w.color;
        ctx.lineCap = 'round';
        var phase = t * w.speed + w.off;
        var baseY = H * (w.y + shift);
        var amp = H * w.amp;
        for (var x = -w.lw; x <= W + w.lw; x += 6) {
          var y = baseY + Math.sin(x * w.freq + phase) * amp
                        + Math.sin(x * w.freq * 0.48 + phase * 0.72) * amp * 0.38;
          if (x === -w.lw) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      t += reduceMotion ? 0 : 0.016;
      requestAnimationFrame(draw);
    }

    // Pausar cuando no se ve (ahorra batería)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        var vis = entries[0].isIntersecting;
        if (vis && !running) { running = true; draw(); }
        else if (!vis) running = false;
      }).observe(canvas);
    }
    draw();
  });

  /* ── 10. PARALLAX SUAVE ───────────────────────────────────────────── */
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !reduceMotion) {
    var ticking = false;
    function updateParallax() {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.dataset.parallax);
        var center = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (center * speed) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(updateParallax); ticking = true; }
    }, { passive: true });
    updateParallax();
  }

  /* ── 11. LÍNEA DE PROCESO QUE SE RELLENA ──────────────────────────── */
  var timeline = document.querySelector('[data-timeline]');
  if (timeline) {
    var steps = timeline.querySelectorAll('.step-card');
    function updateTimeline() {
      var r = timeline.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.75 - r.top) / (r.height || 1);
      p = Math.max(0, Math.min(1, p));
      timeline.style.setProperty('--progress', p);
      steps.forEach(function (s, idx) {
        s.classList.toggle('lit', p >= (idx + 0.3) / steps.length);
      });
    }
    window.addEventListener('scroll', updateTimeline, { passive: true });
    window.addEventListener('resize', updateTimeline);
    updateTimeline();
  }

  /* ── 12. FORMULARIOS (EmailJS) ────────────────────────────────────── */
  var EMAILJS_PUBLIC_KEY  = 'lvJEIJwcBZJkQxy7l';
  var EMAILJS_SERVICE_ID  = 'service_q89i77c';
  var EMAILJS_TEMPLATE_ID = 'template_899ggai';  // notificación interna
  var EMAILJS_CONFIRM_ID  = 'template_81cmmxy';  // confirmación al cliente
  var emailjsReady = false;

  function initEmailJS() {
    if (!emailjsReady && typeof window.emailjs !== 'undefined') {
      window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
      emailjsReady = true;
    }
    return emailjsReady;
  }
  window.addEventListener('load', initEmailJS);

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateField(input) {
    var field = input.closest('.f-field');
    if (!field) return true;
    var val = input.value.trim();
    var ok = true;
    if (input.required && !val) ok = false;
    else if (input.type === 'email' && val && !EMAIL_RE.test(val)) ok = false;
    field.classList.toggle('has-error', !ok);
    field.classList.toggle('is-valid', ok && !!val);
    return ok;
  }

  document.querySelectorAll('form[data-contact-form]').forEach(function (form) {
    var btn = form.querySelector('.submit-btn');
    var errMsg = form.querySelector('.form-error');
    var success = document.getElementById(form.dataset.success);
    var wrap = document.getElementById(form.dataset.wrap) || form;
    var budgetInput = form.querySelector('input[name="presupuesto"]');

    // Píldoras de presupuesto
    form.querySelectorAll('.budget-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var already = pill.classList.contains('active');
        form.querySelectorAll('.budget-pill').forEach(function (p) {
          p.classList.remove('active');
          p.setAttribute('aria-pressed', 'false');
        });
        if (!already) {
          pill.classList.add('active');
          pill.setAttribute('aria-pressed', 'true');
        }
        if (budgetInput) budgetInput.value = already ? '' : pill.textContent.trim();
      });
    });

    // Contador de caracteres
    var ta = form.querySelector('textarea[maxlength]');
    var counter = form.querySelector('.f-counter');
    if (ta && counter) {
      var upd = function () { counter.textContent = ta.value.length + ' / ' + ta.maxLength; };
      ta.addEventListener('input', upd); upd();
    }

    // Validación en vivo
    form.querySelectorAll('input, textarea').forEach(function (inp) {
      inp.addEventListener('blur', function () { if (inp.value) validateField(inp); });
      inp.addEventListener('input', function () {
        if (inp.closest('.f-field').classList.contains('has-error')) validateField(inp);
      });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      errMsg.classList.remove('show');

      var valid = true;
      var firstBad = null;
      form.querySelectorAll('[required]').forEach(function (inp) {
        if (!validateField(inp)) { valid = false; if (!firstBad) firstBad = inp; }
      });
      if (!valid) { firstBad.focus(); return; }

      // Honeypot anti-spam
      var hp = form.querySelector('input[name="website"]');
      if (hp && hp.value) return;

      if (!initEmailJS()) {
        errMsg.textContent = 'No se pudo conectar con el servicio de envío. Escríbenos a prounek.info@gmail.com o por WhatsApp.';
        errMsg.classList.add('show');
        return;
      }

      btn.disabled = true;
      btn.classList.add('loading');
      var label = btn.querySelector('.sb-label');
      var originalLabel = label.textContent;
      label.textContent = 'Enviando…';

      function v(name, fallback) {
        var el = form.querySelector('[name="' + name + '"]');
        var val = el ? el.value.trim() : '';
        return val || fallback;
      }
      var params = {
        nombre:      v('nombre', ''),
        empresa:     v('empresa', '—'),
        email:       v('email', ''),
        telefono:    v('telefono', '—'),
        servicio:    v('servicio', 'No especificado'),
        presupuesto: v('presupuesto', 'No especificado'),
        mensaje:     v('mensaje', '')
      };

      try {
        await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
        try {
          await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CONFIRM_ID, {
            nombre: params.nombre, email: params.email,
            servicio: params.servicio, presupuesto: params.presupuesto
          });
        } catch (confirmErr) {
          // La solicitud ya llegó; un fallo en la confirmación no debe asustar al cliente
          console.warn('EmailJS confirmación:', confirmErr);
        }
        if (typeof window.fbq === 'function') window.fbq('track', 'Lead');
        wrap.style.display = 'none';
        if (success) success.classList.add('show');
        celebrate(btn);
      } catch (err) {
        console.error('EmailJS error:', err);
        errMsg.textContent = 'Hubo un problema al enviar. Inténtalo de nuevo o escríbenos directamente a prounek.info@gmail.com.';
        errMsg.classList.add('show');
        btn.disabled = false;
        btn.classList.remove('loading');
        label.textContent = originalLabel;
      }
    });
  });

  /* ── 13. CONFETI AL ENVIAR ─────────────────────────────────────────── */
  function celebrate(origin) {
    if (reduceMotion) return;
    var r = origin.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cy < 0 || cy > window.innerHeight) { cx = window.innerWidth / 2; cy = window.innerHeight / 2; }
    var colors = ['#2563eb', '#091652', '#60a5fa', '#f59e0b', '#111'];
    for (var i = 0; i < 70; i++) {
      (function () {
        var c = document.createElement('div');
        c.className = 'confetti';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        var size = 6 + Math.random() * 6;
        c.style.width = size + 'px';
        c.style.height = (size * (Math.random() > .5 ? 1 : .45)) + 'px';
        document.body.appendChild(c);
        var angle = Math.random() * Math.PI * 2;
        var vel = 6 + Math.random() * 9;
        var vx = Math.cos(angle) * vel, vy = Math.sin(angle) * vel - 7;
        var x = cx, y = cy, rot = Math.random() * 360, vr = (Math.random() - .5) * 20, life = 0;
        (function tick() {
          life++;
          vy += 0.35; vx *= 0.985;
          x += vx; y += vy; rot += vr;
          c.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + rot + 'deg)';
          c.style.opacity = Math.max(0, 1 - life / 110);
          if (life < 110) requestAnimationFrame(tick); else c.remove();
        })();
      })();
    }
  }

  /* ── 14. AÑO DEL FOOTER ───────────────────────────────────────────── */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
