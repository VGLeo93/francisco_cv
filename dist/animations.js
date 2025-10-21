// Minimal intersection observer to add .is-visible to .reveal elements
(function () {
  const supportsIO = 'IntersectionObserver' in window;
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  function makeVisible(el) {
    el.classList.add('is-visible');
  }

  if (!supportsIO) {
    els.forEach(makeVisible);
    return;
  }

  const io = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        makeVisible(entry.target);
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  els.forEach(el => io.observe(el));
})();

// Theme toggle and scroll progress
(function(){
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const cascade = document.querySelector('.theme-cascade');
  if (btn) {
    try {
      const current = localStorage.getItem('theme');
      const isDark = current === 'dark' || root.getAttribute('data-theme') === 'dark';
      updateIcon(isDark);
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.addEventListener('click', () => {
        const nextDark = root.getAttribute('data-theme') !== 'dark';
        // Prefer View Transition API wave if available
        if (document.startViewTransition) {
          document.startViewTransition(() => applyTheme(nextDark));
          return;
        }
        // Fallback: radial cascade overlay (reduced motion: instant)
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !cascade) {
          applyTheme(nextDark);
          return;
        }
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
        cascade.style.setProperty('--cx', cx + 'px');
        cascade.style.setProperty('--cy', cy + 'px');
        cascade.classList.remove('to-dark','to-light','run');
        cascade.classList.add(nextDark ? 'to-dark' : 'to-light');
        cascade.classList.add('run');
        setTimeout(() => applyTheme(nextDark), 120);
        cascade.addEventListener('animationend', () => {
          cascade.classList.remove('run','to-dark','to-light');
        }, { once: true });
      });
    } catch(_) {}
  }

  function updateIcon(isDark){
    if (!btn) return;
    // We only change the title for assistive clarity; visual handled via CSS thumb
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function applyTheme(dark) {
    if (dark) {
      root.setAttribute('data-theme','dark');
      localStorage.setItem('theme','dark');
      updateIcon(true);
      btn.setAttribute('aria-pressed','true');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme','light');
      updateIcon(false);
      btn.setAttribute('aria-pressed','false');
    }
  }

  // Scroll progress bar
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop;
    const total = h.scrollHeight - h.clientHeight;
    const p = total > 0 ? Math.min(1, scrolled / total) : 0;
    root.style.setProperty('--scroll', String(p));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Back-to-top button
(function(){
  const toTop = document.getElementById('to-top');
  if (!toTop) return;
  const mq = window.matchMedia('(max-width: 600px)');
  function threshold(){ return mq.matches ? 120 : 240; }
  function toggle(){
    const y = window.scrollY || document.documentElement.scrollTop;
    if (y > threshold()) toTop.classList.add('show'); else toTop.classList.remove('show');
  }
  window.addEventListener('scroll', () => requestAnimationFrame(toggle), { passive: true });
  toggle();
  const goTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  toTop.addEventListener('click', goTop);
  toTop.addEventListener('touchstart', goTop, { passive: true });
})();

// Skill bars interaction: animate only hovered/tapped item; support keyboard focus
(function(){
  function bind(container){
    if (!container) return;
    const items = Array.from(container.querySelectorAll('.skill'));
    function activate(el){
      items.forEach(n => n.classList.toggle('active', n === el));
    }
    items.forEach(el => {
      el.addEventListener('mouseenter', () => activate(el));
      el.addEventListener('focusin', () => activate(el));
      el.addEventListener('click', () => activate(el));
      el.addEventListener('touchstart', () => activate(el), { passive: true });
    });
    // Clear active when mouse leaves the list
    container.addEventListener('mouseleave', () => items.forEach(n => n.classList.remove('active')));
  }
  bind(document.querySelector('.skills-highlight .skill-bars'));
  bind(document.querySelector('.skills-card .skill-bars'));
  bind(document.querySelector('#skills-swapper .skill-bars'));
})();

// Skills swipe coachmark (shows once on first view; hides after interaction)
(function(){
  const container = document.getElementById('skills');
  const swapper = document.getElementById('skills-swapper');
  if (!container || !swapper) return;
  const key = 'seen_skills_swipe_hint';
  try {
    if (localStorage.getItem(key) === '1') return;
  } catch(_) {}
  const mark = document.createElement('div');
  mark.className = 'coachmark';
  mark.innerHTML = '<span>Swipe</span><span class="chev" aria-hidden="true"></span>';
  container.style.position = container.style.position || 'relative';
  container.appendChild(mark);
  function show(){ mark.classList.add('show'); setTimeout(hide, 2600); }
  function hide(){ mark.classList.remove('show'); try { localStorage.setItem(key, '1'); } catch(_){} }
  // Show when section first becomes visible
  const io = new IntersectionObserver((entries)=>{
    if (entries.some(e=>e.isIntersecting)) { show(); io.disconnect(); }
  }, { threshold: 0.2 });
  io.observe(container);
  // Hide after first swipe/keyboard/nav interaction
  const end = ()=> hide();
  ['wheel','pointerup','touchend','keydown','click'].forEach(ev => swapper.addEventListener(ev, end, { once: true }));
})();

// Sidebar skills swapper: horizontal swipe/scroll toggles between list and bars (no overlay)
(function(){
  const container = document.getElementById('skills-swapper');
  if (!container) return;
  const slides = Array.from(container.querySelectorAll('.skills-slide'));
  let idx = slides.findIndex(s => s.classList.contains('is-active'));
  if (idx < 0) idx = 0;
  const dotsEl = document.getElementById('skills-dots');

  function setState(i){
    slides.forEach((sl, k) => {
      sl.classList.toggle('is-active', k === i);
      sl.setAttribute('aria-hidden', k === i ? 'false' : 'true');
    });
    updateHeight();
    updateDots();
  }
  function go(to){
    if (to === idx || to < 0 || to >= slides.length) return;
    const out = slides[idx];
    const dir = to > idx ? 'left' : 'right';
    out.classList.add(dir==='left' ? 'slide-out-left' : 'slide-out-right');
    idx = to; setState(idx);
    setTimeout(()=> out.classList.remove('slide-out-left','slide-out-right'), 400);
  }

  function updateHeight(){
    const active = slides[idx];
    if (!active) return;
    const h = active.scrollHeight || 0;
    container.style.height = h + 'px';
  }

  function buildDots(){
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    slides.forEach((_, i) => {
      const b = document.createElement('span');
      b.className = 'swiper-pagination-bullet' + (i === idx ? ' swiper-pagination-bullet-active' : '');
      b.setAttribute('role','button');
      b.tabIndex = 0;
      b.addEventListener('click', () => go(i));
      b.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); go(i);} });
      dotsEl.appendChild(b);
    });
  }

  function updateDots(){
    if (!dotsEl) return;
    const bullets = Array.from(dotsEl.querySelectorAll('.swiper-pagination-bullet'));
    bullets.forEach((b, i) => b.classList.toggle('swiper-pagination-bullet-active', i === idx));
  }

  // Horizontal intent via wheel/Shift+wheel
  container.addEventListener('wheel', (e)=>{
    const absX = Math.abs(e.deltaX), absY = Math.abs(e.deltaY);
    const horizontal = e.shiftKey ? absY > 0 : absX > absY;
    if (!horizontal) return;
    e.preventDefault();
    const v = e.shiftKey ? e.deltaY : e.deltaX;
    if (v > 0) go(idx + 1); else if (v < 0) go(idx - 1);
  }, { passive: false });

  // Swipe gesture with horizontal lock
  let sx=0, sy=0, down=false, lockedH=false;
  container.addEventListener('pointerdown', (e)=>{ down=true; lockedH=false; sx=e.clientX; sy=e.clientY; });
  container.addEventListener('pointermove', (e)=>{
    if(!down) return;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    if(!lockedH && Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>18){ lockedH=true; }
    if(lockedH) e.preventDefault();
  });
  container.addEventListener('pointerup', (e)=>{ if(!down)return; const dx=e.clientX-sx, dy=e.clientY-sy; down=false; if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>30){ if(dx<0) go(idx+1); else go(idx-1);} });
  // Touch fallback
  container.addEventListener('touchstart', e=>{ if(e.touches&&e.touches[0]){ down=true; lockedH=false; sx=e.touches[0].clientX; sy=e.touches[0].clientY; } }, {passive:true});
  container.addEventListener('touchmove', e=>{ if(!down) return; const t=e.touches[0]; const dx=t.clientX-sx, dy=t.clientY-sy; if(!lockedH && Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>18) lockedH=true; if(lockedH) e.preventDefault(); }, {passive:false});
  container.addEventListener('touchend', e=>{ if(!down)return; const t=e.changedTouches&&e.changedTouches[0]; down=false; if(!t)return; const dx=t.clientX-sx, dy=t.clientY-sy; if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>30){ if(dx<0) go(idx+1); else go(idx-1);} }, {passive:true});

  // Keyboard support
  container.addEventListener('keydown', (e)=>{ if (e.key==='ArrowRight') { e.preventDefault(); go(idx+1);} if (e.key==='ArrowLeft') { e.preventDefault(); go(idx-1);} });

  // Initialize UI
  buildDots();
  updateHeight();
  updateDots();
  window.addEventListener('resize', () => setTimeout(updateHeight, 50));
})();

// Mobile bottom navigation — smooth scroll + active section
(function(){
  const nav = document.querySelector('.mobile-nav');
  if (!nav) return; // removed per request
  function toId(id){
    const el = typeof id === 'string' ? document.querySelector(id) : id;
    if (!el) return;
    // Use element position + a small margin. Bottom nav does not overlap content,
    // so do not subtract its height (scroll-margin-top CSS handles anchors).
    const y = window.scrollY + el.getBoundingClientRect().top - 8;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
  const links = Array.from(nav.querySelectorAll('a[data-target]'));
  const sections = links.map(a => document.querySelector(a.getAttribute('data-target'))).filter(Boolean);

  let navLockUntil = 0;
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const sel = link.getAttribute('data-target');
      const t = document.querySelector(sel);
      if (t) {
        e.preventDefault();
        navLockUntil = Date.now() + 1200; // lock highlighting while smooth scroll happens
        links.forEach(a => a.classList.toggle('active', a === link));
        toId(sel);
      }
    }, { passive: false });
  });

  // IntersectionObserver with ratio ranking for reliable active state
  const ratio = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => ratio.set(e.target, e.intersectionRatio));
    let best = null; let r = -1;
    ratio.forEach((val, key) => { if (val > r) { r = val; best = key; } });
    if (best && Date.now() > navLockUntil) {
      const id = '#' + best.id;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('data-target') === id));
    }
  }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-5% 0px -65% 0px' });
  sections.forEach(sec => io.observe(sec));

  // Fallback highlighter on scroll (complements IO for short sections)
  function fallbackHighlight(){
    if (Date.now() < navLockUntil) return;
    const mid = window.innerHeight/2;
    let best = null; let diff = Infinity;
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      const d = Math.abs(rect.top - mid);
      if (d < diff) { diff = d; best = sec; }
    });
    if (best) {
      const id = '#' + best.id;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('data-target') === id));
    }
  }
  window.addEventListener('scroll', () => requestAnimationFrame(fallbackHighlight), { passive: true });
  fallbackHighlight();
})();

// top-nav removed per request

// (Removed Keen Slider implementation in favor of Swiper)

// Swiper implementation (replacing Keen Slider for reliability)
(function(){
  function boot(){
  const container = document.getElementById('exp-cards');
  if (!container) return;
    const USE_SWIPER = false; // force reliable fallback across all sizes
    if (USE_SWIPER && window.Swiper) {
      const swiper = new Swiper('#exp-cards', {
        slidesPerView: 1,
        centeredSlides: true,
        spaceBetween: 24,
        autoHeight: true,
        speed: 500,
        loop: true,
        loopAdditionalSlides: 1,
        resistanceRatio: 0.85,
        keyboard: { enabled: true },
        mousewheel: { forceToAxis: true, releaseOnEdges: true, sensitivity: 0.8 },
        navigation: { nextEl: '.experience-carousel .next', prevEl: '.experience-carousel .prev' },
        pagination: { el: '#exp-dots', clickable: true },
        on: {
          init() { updateActive(this); },
          slideChange() { updateActive(this); },
          resize() { this.updateAutoHeight(300); }
        }
      });

      container.classList.remove('no-swiper');

      function updateActive(s){
        const real = s.realIndex;
        container.querySelectorAll('.swiper-slide[data-index]').forEach(sl => {
          const idx = Number(sl.getAttribute('data-index'));
          sl.classList.toggle('is-active', idx === real);
        });
      }
    } else {
      // Fallback: stacked slider (one visible, no horizontal scrolling)
      container.classList.add('no-swiper');
      const wrapper = container.querySelector('.swiper-wrapper');
      const slides = Array.from(wrapper.querySelectorAll('.swiper-slide'));
      const dotsEl = document.getElementById('exp-dots');
      const prevBtn = document.querySelector('#experience-carousel .prev');
      const nextBtn = document.querySelector('#experience-carousel .next');
      let cur = 0; let anim = false;

      function buildDots(){
        if (!dotsEl) return;
        dotsEl.innerHTML='';
        slides.forEach((_, i) => {
          const b = document.createElement('span');
          b.className = 'swiper-pagination-bullet' + (i===0?' swiper-pagination-bullet-active':'');
          b.setAttribute('role','button'); b.tabIndex = 0;
          b.addEventListener('click', () => go(i));
          dotsEl.appendChild(b);
        });
      }

      function updateDots(){
        if (!dotsEl) return;
        const bullets = Array.from(dotsEl.querySelectorAll('.swiper-pagination-bullet'));
        bullets.forEach((b, i) => b.classList.toggle('swiper-pagination-bullet-active', i===cur));
      }

      function updateHeight(){
        const c = slides[cur]?.querySelector('.card') || slides[cur];
        if (!c) return;
        const maxH = Math.round(window.innerHeight * 0.72);
        const h = Math.min((c.scrollHeight||c.offsetHeight||0), maxH);
        wrapper.style.height = h + 'px';
      }

      function setState(){
        slides.forEach((sl, i) => sl.classList.toggle('is-active', i===cur));
        updateDots(); updateHeight();
      }

      function go(i){
        if (anim) return;
        const len = slides.length;
        if (!len) return;
        const attempted = i;
        const next = ((i % len) + len) % len;
        if (next === cur) return;
        anim = true;
        const out = slides[cur];
        const dir = attempted > cur || (cur === len - 1 && next === 0) ? 'left' : 'right';
        const target = slides[next];
        target.classList.add(dir === 'left' ? 'slide-in-right' : 'slide-in-left');
        out.classList.add(dir === 'left' ? 'slide-out-left' : 'slide-out-right');
        cur = next; setState();
        setTimeout(() => { out.classList.remove('slide-out-left','slide-out-right'); anim = false; }, 420);
        const cleanup = slides[cur];
        setTimeout(() => { cleanup.classList.remove('slide-in-left','slide-in-right'); }, 420);
      }

      if (prevBtn) prevBtn.addEventListener('click', () => go(cur-1));
      if (nextBtn) nextBtn.addEventListener('click', () => go(cur+1));

      // Pointer swipe
      let startX=0, startY=0, down=false, lockedH=false;
      container.addEventListener('pointerdown', e=>{down=true; lockedH=false; startX=e.clientX; startY=e.clientY;});
      container.addEventListener('pointermove', e=>{ if(!down)return; const dx=e.clientX-startX, dy=e.clientY-startY; if(!lockedH && Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>18) lockedH=true; if(lockedH) e.preventDefault();});
      container.addEventListener('pointerup', e=>{ if(!down)return; down=false; const dx=e.clientX-startX, dy=e.clientY-startY; if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>40){ if (dx<0) go(cur+1); else go(cur-1);} });
      // Touch fallback (older browsers)
      container.addEventListener('touchstart', e=>{ if(e.touches&&e.touches[0]) {down=true; lockedH=false; startX=e.touches[0].clientX; startY=e.touches[0].clientY;} }, {passive:true});
      container.addEventListener('touchmove', e=>{ if(!down) return; const t=e.touches[0]; const dx=t.clientX-startX, dy=t.clientY-startY; if(!lockedH && Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>18) lockedH=true; if(lockedH) e.preventDefault(); }, {passive:false});
      container.addEventListener('touchend', e=>{ if(!down) return; down=false; const touch = e.changedTouches && e.changedTouches[0]; if (!touch) return; const dx = touch.clientX - startX; const dy = touch.clientY - startY; if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) { if (dx < 0) go(cur+1); else go(cur-1);} }, {passive:true});

      // Wheel navigation (desktop): only on horizontal intent or Shift+wheel (preserves vertical scroll)
      let wheelLock = false;
      container.addEventListener('wheel', (e)=>{
        const absX = Math.abs(e.deltaX), absY = Math.abs(e.deltaY);
        const horizontal = e.shiftKey ? absY > 0 : absX > absY; // Shift+wheel => horizontal
        const magnitude = e.shiftKey ? absY : absX;
        if (!horizontal) return; // allow normal vertical scrolling
        if (magnitude < 2) return;
        e.preventDefault();
        if (wheelLock) return; wheelLock = true; setTimeout(()=>wheelLock=false, 320);
        const dir = e.shiftKey ? e.deltaY : e.deltaX;
        if (dir > 0) go(cur+1); else go(cur-1);
      }, { passive: false });

      // Keyboard navigation on focus
      container.addEventListener('keydown', (e)=>{
        if (e.key === 'ArrowRight') { e.preventDefault(); go(cur+1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur-1); }
      });

      buildDots(); setState();
      updateHeight();
      window.addEventListener('resize', () => setTimeout(updateHeight, 50));
      wrapper.querySelectorAll('details').forEach(d=>d.addEventListener('toggle', updateHeight));
    }
  }
  if (window.Swiper) boot(); else window.addEventListener('load', boot);
})();

// Certifications slider (fallback stacked slider)
(function(){
  const container = document.getElementById('cert-cards');
  if (!container) return;
  const USE_SWIPER = false;
  if (USE_SWIPER && window.Swiper) {
    // If you enable Swiper, wire with IDs below
  }
  // Fallback: stacked slider
  container.classList.add('no-swiper');
  const wrapper = container.querySelector('.swiper-wrapper');
  const slides = Array.from(wrapper.querySelectorAll('.swiper-slide'));
  const dotsEl = document.getElementById('cert-dots');
  const prevBtn = document.querySelector('#certifications .prev');
  const nextBtn = document.querySelector('#certifications .next');
  let cur = 0; let anim = false;

  function buildDots(){
    if (!dotsEl) return;
    dotsEl.innerHTML='';
    slides.forEach((_, i) => {
      const b = document.createElement('span');
      b.className = 'swiper-pagination-bullet' + (i===0?' swiper-pagination-bullet-active':'');
      b.setAttribute('role','button'); b.tabIndex = 0;
      b.addEventListener('click', () => go(i));
      dotsEl.appendChild(b);
    });
  }

  function updateDots(){
    if (!dotsEl) return;
    const bullets = Array.from(dotsEl.querySelectorAll('.swiper-pagination-bullet'));
    bullets.forEach((b, i) => b.classList.toggle('swiper-pagination-bullet-active', i===cur));
  }

  function updateHeight(){
    const c = slides[cur]?.querySelector('.card') || slides[cur];
    if (!c) return;
    const maxH = Math.round(window.innerHeight * 0.72);
    const h = Math.min((c.scrollHeight||c.offsetHeight||0), maxH);
    wrapper.style.height = h + 'px';
  }

  function setState(){
    slides.forEach((sl, i) => sl.classList.toggle('is-active', i===cur));
    updateDots(); updateHeight();
  }

  function go(i){
    if (anim) return;
    const len = slides.length; if (!len) return;
    const attempted = i; const next = ((i % len) + len) % len;
    if (next === cur) return;
    anim = true;
    const out = slides[cur];
    const dir = attempted > cur || (cur === len - 1 && next === 0) ? 'left' : 'right';
    const target = slides[next];
    target.classList.add(dir === 'left' ? 'slide-in-right' : 'slide-in-left');
    out.classList.add(dir === 'left' ? 'slide-out-left' : 'slide-out-right');
    cur = next; setState();
    setTimeout(() => { out.classList.remove('slide-out-left','slide-out-right'); anim = false; }, 420);
    const cleanup = slides[cur];
    setTimeout(() => { cleanup.classList.remove('slide-in-left','slide-in-right'); }, 420);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => go(cur-1));
  if (nextBtn) nextBtn.addEventListener('click', () => go(cur+1));

  // Input
  let wheelLock = false;
  container.addEventListener('wheel', (e)=>{
    const absX = Math.abs(e.deltaX), absY = Math.abs(e.deltaY);
    const horizontal = e.shiftKey ? absY > 0 : absX > absY;
    const magnitude = e.shiftKey ? absY : absX;
    if (!horizontal || magnitude < 2) return;
    e.preventDefault();
    if (wheelLock) return; wheelLock = true; setTimeout(()=>wheelLock=false, 320);
    const dir = e.shiftKey ? e.deltaY : e.deltaX;
    if (dir > 0) go(cur+1); else go(cur-1);
  }, { passive: false });

  let startX=0, startY=0, down=false, lockedH=false;
  container.addEventListener('pointerdown', e=>{down=true; lockedH=false; startX=e.clientX; startY=e.clientY;});
  container.addEventListener('pointermove', e=>{ if(!down)return; const dx=e.clientX-startX, dy=e.clientY-startY; if(!lockedH && Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>18) lockedH=true; if(lockedH) e.preventDefault();});
  container.addEventListener('pointerup', e=>{ if(!down)return; down=false; const dx=e.clientX-startX, dy=e.clientY-startY; if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>40){ if (dx<0) go(cur+1); else go(cur-1);} });

  buildDots(); setState(); updateHeight();
  window.addEventListener('resize', () => setTimeout(updateHeight, 50));
})();

// Ensure all details are included for print (open then restore)
(function(){
  const details = Array.from(document.querySelectorAll('details.more'));
  if (!details.length) return;
  let snapshot = [];
  const remember = () => { snapshot = details.map(d => d.open); };
  const openAll = () => details.forEach(d => d.open = true);
  const restore = () => details.forEach((d, i) => d.open = !!snapshot[i]);

  window.addEventListener('beforeprint', () => { remember(); openAll(); });
  window.addEventListener('afterprint', restore);
})();

// Show experience dots only when the carousel is in view (desktop)
(function(){
  const section = document.getElementById('experience-carousel');
  if (!section) return;
  const dots = document.getElementById('exp-dots');
  if (!dots) return;

  function strictlyInView(){
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    // show only when the middle band of the viewport overlaps the section
    return r.top < vh * 0.7 && r.bottom > vh * 0.3;
  }
  const update = () => section.classList.toggle('in-view', strictlyInView());
  window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();

// Mobile layout: place SKILLS after EXPERIENCE (content) on small screens, restore on wide
(function(){
  const skills = document.getElementById('skills');
  const content = document.querySelector('main.resume .content');
  if (!skills || !content) return;
  const originalParent = skills.parentNode;
  const nextSibling = skills.nextElementSibling;
  const mql = window.matchMedia('(max-width: 860px)');
  function apply(){
    try {
      if (mql.matches) {
        if (skills.parentNode !== content) content.appendChild(skills);
      } else {
        if (skills.parentNode !== originalParent) {
          if (nextSibling && nextSibling.parentNode === originalParent) originalParent.insertBefore(skills, nextSibling);
          else originalParent.appendChild(skills);
        }
      }
    } catch(_) {}
  }
  (mql.addEventListener ? mql.addEventListener('change', apply) : mql.addListener(apply));
  if (document.readyState === 'complete') apply(); else window.addEventListener('load', apply);
})();
