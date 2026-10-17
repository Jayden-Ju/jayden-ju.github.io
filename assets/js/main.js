/* ==========================================================================
   全品类软件定制开发 · 站点动效脚本
   纯原生 JS（无依赖 / 无构建），所有模块均做了存在性判断与降级处理
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supportsIO = 'IntersectionObserver' in window;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* -------------------- 0. 页面进入（幕布淡出 + 元素入场） -------------------- */
  function initPageEnter() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        root.classList.remove('is-loading');
        root.classList.add('is-ready');
      });
    });
  }

  /* -------------------- 1. 页面转场（点击站内链接时拉起幕布） -------------------- */
  function initPageTransition() {
    var curtain = $('[data-curtain]');
    if (!curtain) { return; }

    doc.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('a[data-nav]') : null;
      if (!link) { return; }
      if (e.defaultPrevented || e.button !== 0) { return; }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
      if (link.target === '_blank' || link.hasAttribute('download')) { return; }

      var href = link.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || href.indexOf('mailto:') === 0 || href.indexOf('http') === 0) { return; }

      e.preventDefault();

      var opened = link.hasAttribute('data-sheet-link');

      function go() { window.location.href = href; }

      /* 注意：classList.add() 只接受「单个 class」作为参数，传入含空格的字符串
         （如 'is-leaving is-leaving-sheet'）会抛 InvalidCharacterError。
         一旦抛错就会中断本监听器：preventDefault() 已经生效、但下面的跳转永不执行，
         表现为「点击按钮完全没反应」。因此这里逐个添加，并加 try/catch 兜底，
         保证任何样式层面的异常都不会吞掉跳转。 */
      if (reduceMotion) { go(); return; }

      try {
        root.classList.add('is-leaving');
        if (opened) { root.classList.add('is-leaving-sheet'); }
        window.setTimeout(go, 430);
      } catch (err) {
        go();
      }
    });
  }

  /* -------------------- 2. 返回 / 关闭 -------------------- */
  function initBackButtons() {
    $$('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var fallback = btn.getAttribute('data-back') || 'index.html';
        var curtain = $('[data-curtain]');
        function leave() {
          if (window.history.length > 1 && doc.referrer.indexOf(window.location.origin) === 0) {
            window.history.back();
          } else {
            window.location.href = fallback;
          }
        }
        if (reduceMotion || !curtain) { leave(); return; }
        try {
          root.classList.add('is-leaving-sheet');
          window.setTimeout(leave, 380);
        } catch (err) {
          leave();
        }
      });
    });
  }

  /* -------------------- 3. 星空粒子背景 -------------------- */
  function initStarfield() {
    var canvas = $('#stars');
    if (!canvas || !canvas.getContext) { return; }

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var dots = [];
    var w = 0, h = 0, raf = null, visible = true;

    function resize() {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var count = Math.min(96, Math.max(26, Math.round((w * h) / 20000)));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.6 + 0.5,
          a: Math.random() * 0.5 + 0.25
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        if (!reduceMotion) {
          d.x += d.vx; d.y += d.vy;
          if (d.x < -20) { d.x = w + 20; } else if (d.x > w + 20) { d.x = -20; }
          if (d.y < -20) { d.y = h + 20; } else if (d.y > h + 20) { d.y = -20; }
        }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(160,214,255,' + d.a + ')';
        ctx.fill();
      }

      for (var m = 0; m < dots.length; m++) {
        for (var n = m + 1; n < dots.length; n++) {
          var a = dots[m], b = dots[n];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist2 = dx * dx + dy * dy;
          if (dist2 < 15000) {
            var alpha = (1 - dist2 / 15000) * 0.22;
            ctx.strokeStyle = 'rgba(86,160,255,' + alpha + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    function loop() {
      if (!visible) { raf = null; return; }
      draw();
      if (reduceMotion) { raf = null; return; }
      raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (raf === null) { raf = window.requestAnimationFrame(loop); }
    }

    resize();
    start();

    var t = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(function () { resize(); start(); }, 180);
    }, { passive: true });

    doc.addEventListener('visibilitychange', function () {
      visible = !doc.hidden;
      if (visible) { start(); }
    });
  }

  /* -------------------- 4. 顶部导航 / 滚动进度 -------------------- */
  function initChrome() {
    var nav = $('[data-nav-bar]') || $('.nav');
    var bar = $('[data-progress]');

    function onScroll() {
      var y = window.pageYOffset || doc.documentElement.scrollTop;
      if (nav) { nav.classList.toggle('is-scrolled', y > 14); }
      if (bar) {
        var total = doc.documentElement.scrollHeight - window.innerHeight;
        var p = total > 0 ? Math.min(1, Math.max(0, y / total)) : 0;
        bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  /* -------------------- 5. 移动端菜单 -------------------- */
  function initMenu() {
    var toggle = $('[data-menu-toggle]');
    var links = $('[data-nav-links]');
    if (!toggle || !links) { return; }

    function close() {
      links.classList.remove('is-open');
      toggle.classList.remove('is-active');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.classList.toggle('is-active', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    $$('a', links).forEach(function (a) { a.addEventListener('click', close); });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 780) { close(); }
    }, { passive: true });
  }

  /* -------------------- 6. 滚动揭示动画 -------------------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) { return; }

    items.forEach(function (el, i) {
      if (el.getAttribute('data-delay') === null) {
        el.setAttribute('data-delay', String((i % 6) * 70));
      }
    });

    if (!supportsIO || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* -------------------- 7. 主标题逐字入场 -------------------- */
  function initSplitHeadings() {
    $$('[data-split]').forEach(function (el) {
      var text = (el.textContent || '').replace(/\s+/g, '');
      if (!text) { return; }
      el.setAttribute('aria-label', text);
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < text.length; i++) {
        var span = doc.createElement('span');
        span.setAttribute('aria-hidden', 'true');
        span.className = 'char';
        span.style.setProperty('--i', String(i));
        span.textContent = text.charAt(i);
        frag.appendChild(span);
      }
      el.textContent = '';
      el.appendChild(frag);
      el.classList.add('is-split');
    });
  }

  /* -------------------- 8. 卡片 3D 倾斜（跟随鼠标） -------------------- */
  function initTilt() {
    if (reduceMotion) { return; }
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) { return; }

    $$('[data-tilt]').forEach(function (card) {
      var raf = null, rect = null, mx = 0, my = 0;

      function apply() {
        var px = (mx - rect.left) / rect.width - 0.5;
        var py = (my - rect.top) / rect.height - 0.5;
        card.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
        card.style.setProperty('--mx', ((mx - rect.left) / rect.width * 100).toFixed(2) + '%');
        card.style.setProperty('--my', ((my - rect.top) / rect.height * 100).toFixed(2) + '%');
      }

      card.addEventListener('pointerenter', function (e) {
        rect = card.getBoundingClientRect();
        card.classList.add('is-tilting');
        mx = e.clientX; my = e.clientY;
        raf = window.requestAnimationFrame(function () { apply(); raf = null; });
      });

      card.addEventListener('pointermove', function (e) {
        if (!rect) { rect = card.getBoundingClientRect(); }
        mx = e.clientX; my = e.clientY;
        if (raf) { return; }
        raf = window.requestAnimationFrame(function () { apply(); raf = null; });
      });

      card.addEventListener('pointerleave', function () {
        rect = null;
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* -------------------- 9. 数字滚动 -------------------- */
  function initCounters() {
    var els = $$('[data-count]');
    if (!els.length) { return; }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      var dur = 1300, start = null;
      function step(ts) {
        if (start === null) { start = ts; }
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) { window.requestAnimationFrame(step); }
      }
      window.requestAnimationFrame(step);
    }

    if (!supportsIO) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* -------------------- 10. 提示条 / 复制 -------------------- */
  var toastTimer = null;

  function showToast(msg) {
    var toast = $('[data-toast]');
    if (!toast) {
      toast = doc.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('data-toast', '');
      toast.setAttribute('role', 'status');
      doc.body.appendChild(toast);
    }
    toast.textContent = msg;
    window.clearTimeout(toastTimer);
    window.requestAnimationFrame(function () { toast.classList.add('is-show'); });
    toastTimer = window.setTimeout(function () { toast.classList.remove('is-show'); }, 2400);
  }

  function copyText(text) {
    if (window.navigator.clipboard && window.isSecureContext) {
      return window.navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = doc.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
        doc.body.appendChild(ta);
        ta.select();
        var ok = doc.execCommand('copy');
        doc.body.removeChild(ta);
        if (ok) { resolve(); } else { reject(new Error('copy failed')); }
      } catch (err) { reject(err); }
    });
  }

  function initCopy() {
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-copy') || '';
        var label = btn.getAttribute('data-copy-label') || '内容';
        copyText(value).then(function () {
          showToast(label + '已复制：' + value);
        }).catch(function () {
          showToast('复制失败，请手动选择复制：' + value);
        });
      });
    });
  }

  /* -------------------- 11. 鼠标跟随光晕（首页） -------------------- */
  function initPointerGlow() {
    var host = $('[data-pointer-glow]');
    if (!host || reduceMotion) { return; }
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) { return; }

    var raf = null, mx = 0, my = 0;
    host.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (raf) { return; }
      raf = window.requestAnimationFrame(function () {
        var r = host.getBoundingClientRect();
        host.style.setProperty('--gx', (mx - r.left).toFixed(1) + 'px');
        host.style.setProperty('--gy', (my - r.top).toFixed(1) + 'px');
        raf = null;
      });
    });
  }

  /* -------------------- 12. 页脚年份 -------------------- */
  function initYear() {
    var y = String(new Date().getFullYear());
    $$('[data-year]').forEach(function (el) { el.textContent = y; });
  }

  /* -------------------- 启动 -------------------- */
  function boot() {
    initSplitHeadings();
    initReveal();
    initChrome();
    initMenu();
    initStarfield();
    initTilt();
    initCounters();
    initCopy();
    initPointerGlow();
    initPageTransition();
    initBackButtons();
    initYear();
    initPageEnter();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* 兜底：若 1.4s 后幕布仍未撤下（脚本异常等），强制展示内容 */
  window.setTimeout(function () {
    if (root.classList.contains('is-loading')) {
      root.classList.remove('is-loading');
      root.classList.add('is-ready');
      $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    }
  }, 1400);
})();
