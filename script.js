(() => {
  'use strict';

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // =============================================
  // SUPABASE CLIENT & CONTENT MANAGER
  // =============================================
  const SUPABASE_URL = 'https://kqfazxygftmujpjerlce.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZmF6eHlnZnRtdWpwamVybGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMTk4MDcsImV4cCI6MjA4Nzg5NTgwN30.QCYZsDksFdF75FUkMSK849dxtQJ_rcdhLLVwJg0liqY';
  let supabase = null;
  let siteContent = {}; // keyed by section -> { key: row }
  let contentLoaded = false;

  function initSupabase() {
    if (supabase) return true;
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[Supabase] Client initialized');
      return true;
    }
    return false;
  }

  // Retry initialization if CDN hasn't loaded yet
  function ensureSupabase() {
    if (initSupabase()) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (initSupabase() || attempts > 20) {
        clearInterval(interval);
        if (!supabase) console.warn('[Supabase] CDN failed to load after retries');
      }
    }, 500);
  }

  async function fetchSiteContent() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data) {
        data.forEach(row => {
          if (!siteContent[row.section]) siteContent[row.section] = {};
          siteContent[row.section][row.key] = row;
        });
        hydrateContent();
      }
    } catch (e) {
      console.warn('[ContentManager] Failed to fetch content, using fallback:', e.message);
    }
    contentLoaded = true;
  }

  function getContent(section, key, fallback) {
    const row = siteContent[section]?.[key];
    return row ? row.value : (fallback || '');
  }

  function getMetadata(section, key) {
    const row = siteContent[section]?.[key];
    return row?.metadata || {};
  }

  function hydrateContent() {
    // Hydrate simple text elements that have data-sb attributes
    document.querySelectorAll('[data-sb]').forEach(el => {
      const [section, key] = el.getAttribute('data-sb').split('.');
      const val = getContent(section, key);
      if (val) {
        if (el.getAttribute('data-sb-html') !== null) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });
  }

  // =============================================
  // PAGE VISIT TRACKING
  // =============================================
  function trackPageVisit() {
    if (!supabase) return;
    let visitorId = localStorage.getItem('ag_visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('ag_visitor_id', visitorId);
    }
    supabase.from('page_visits').insert({
      page: window.location.pathname + window.location.hash,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      screen_width: window.innerWidth,
      visitor_id: visitorId,
    }).then(() => { }).catch(() => { });
  }

  // =============================================
  // PRELOADER
  // =============================================
  const preloader = document.getElementById('preloader');
  const preloaderFill = document.getElementById('preloaderFill');
  const preloaderPercent = document.getElementById('preloaderPercent');
  let loadProgress = 0;
  let windowLoaded = false;

  function updatePreloader() {
    loadProgress += (100 - loadProgress) * 0.08;
    if (loadProgress > 99.5) loadProgress = 100;
    preloaderFill.style.width = loadProgress + '%';
    preloaderPercent.textContent = Math.round(loadProgress);
    if (loadProgress < 100) {
      requestAnimationFrame(updatePreloader);
    } else {
      // Wait for content to be loaded before finishing preloader
      if (!contentLoaded) {
        // Cap wait at 500ms extra, then proceed anyway
        const waitStart = performance.now();
        const waitForContent = () => {
          if (contentLoaded || performance.now() - waitStart > 500) {
            finishPreloader();
          } else {
            requestAnimationFrame(waitForContent);
          }
        };
        requestAnimationFrame(waitForContent);
      } else {
        finishPreloader();
      }
    }
  }

  function finishPreloader() {
    setTimeout(() => {
      preloader.classList.add('done');
      initPageAnimations();
      startMorphWords();
    }, 400);
  }

  window.addEventListener('load', () => {
    windowLoaded = true;
    loadProgress = 60;
    ensureSupabase();
    fetchSiteContent();
    trackPageVisit();
    updatePreloader();
  });

  requestAnimationFrame(updatePreloader);

  // =============================================
  // MORPHING WORD ANIMATION
  // =============================================
  // Fallback morph words (used if Supabase is unreachable)
  let morphWords = [
    'pixel-perfect',
    'high-performance',
    'award-winning',
    'scalable',
    'delightful',
    'innovative',
  ];

  let morphIndex = 0;
  const morphEl = document.getElementById('morphWord');

  function startMorphWords() {
    if (!morphEl) return;
    // Load morph words from Supabase if available
    const sbWords = getContent('hero', 'morph_words');
    if (sbWords) {
      morphWords = sbWords.split(',').map(w => w.trim()).filter(Boolean);
    }
    morphEl.textContent = morphWords[0];
    setInterval(() => {
      morphIndex = (morphIndex + 1) % morphWords.length;
      morphOut(() => {
        morphEl.textContent = morphWords[morphIndex];
        morphIn();
      });
    }, 3000);
  }

  function morphOut(cb) {
    morphEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease';
    morphEl.style.opacity = '0';
    morphEl.style.transform = 'translateY(-8px)';
    morphEl.style.filter = 'blur(4px)';
    setTimeout(cb, 300);
  }

  function morphIn() {
    morphEl.style.transform = 'translateY(8px)';
    morphEl.style.filter = 'blur(4px)';
    requestAnimationFrame(() => {
      morphEl.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s ease';
      morphEl.style.opacity = '1';
      morphEl.style.transform = 'translateY(0)';
      morphEl.style.filter = 'blur(0)';
    });
  }

  // =============================================
  // MAGNETIC CURSOR
  // =============================================
  if (!isMobile) {
    const cursorDot = document.getElementById('cursorDot');
    const cursorRing = document.getElementById('cursorRing');
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = mouseX + 'px';
      cursorDot.style.top = mouseY + 'px';
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    const hoverTargets = 'a, button, [data-magnetic], .gallery-item, .social-link';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) {
        cursorDot.classList.add('hovering');
        cursorRing.classList.add('hovering');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) {
        cursorDot.classList.remove('hovering');
        cursorRing.classList.remove('hovering');
      }
    });

    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        el.style.transition = 'transform 0.2s ease';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
        el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      });
    });
  }

  // =============================================
  // PARTICLE SYSTEM
  // =============================================
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseParticle = { x: -1000, y: -1000 };

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  if (!isMobile) {
    document.addEventListener('mousemove', (e) => {
      mouseParticle.x = e.clientX;
      mouseParticle.y = e.clientY;
    });
  }

  class Particle {
    constructor() { this.reset(); }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.radius = Math.random() * 1.5 + 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (!isMobile) {
        const ddx = this.x - mouseParticle.x;
        const ddy = this.y - mouseParticle.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 150) {
          const force = (150 - dist) / 150 * 0.02;
          this.vx += ddx / dist * force;
          this.vy += ddy / dist * force;
        }
      }

      this.vx *= 0.99;
      this.vy *= 0.99;

      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(41, 151, 255, ${this.opacity})`;
      ctx.fill();
    }
  }

  const particleCount = isMobile ? 25 : 60;
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const ddx = particles[i].x - particles[j].x;
        const ddy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(41, 151, 255, ${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    requestAnimationFrame(animateParticles);
  }

  animateParticles();

  // =============================================
  // NAVIGATION
  // =============================================
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const scrollProgress = document.getElementById('scrollProgress');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = progress + '%';
  }, { passive: true });

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    mobileMenu.classList.toggle('open');
  });

  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      mobileMenu.classList.remove('open');
    });
  });

  // =============================================
  // SMOOTH SCROLL
  // =============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;

      const start = window.scrollY;
      const end = target.getBoundingClientRect().top + window.scrollY - 80;
      const distance = end - start;
      const duration = Math.min(Math.abs(distance) * 0.8, 1200);
      let startTime = null;

      function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      }

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        window.scrollTo(0, start + distance * easeOutExpo(progress));
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });
  });

  // =============================================
  // SCROLL REVEAL (with variable stagger)
  // =============================================
  const revealElements = document.querySelectorAll('[data-reveal], [data-reveal-line]');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.revealDelay || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // =============================================
  // STAGGER CHILDREN
  // =============================================
  function staggerReveal(parentSelector, childSelector) {
    document.querySelectorAll(parentSelector).forEach(parent => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll(childSelector).forEach((child, i) => {
              setTimeout(() => child.classList.add('visible'), i * 100);
            });
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      observer.observe(parent);
    });
  }

  staggerReveal('.about-stats', '.stat-card');
  staggerReveal('.skills-grid', '.skill-card');
  staggerReveal('.repo-grid', '.repo-card');
  staggerReveal('.blog-grid', '.blog-card');

  // =============================================
  // ANIMATED COUNTERS
  // =============================================
  const counters = document.querySelectorAll('.stat-number[data-count]');

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 2500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 5);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => counterObserver.observe(el));

  // =============================================
  // SKILL BAR ANIMATION
  // =============================================
  const skillCards = document.querySelectorAll('.skill-card');

  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('animated'), 300);
        skillObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  skillCards.forEach(el => skillObserver.observe(el));

  // =============================================
  // 3D TILT EFFECT
  // =============================================
  if (!isMobile) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const rotateX = (y - 0.5) * -12;
        const rotateY = (x - 0.5) * 12;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
        card.style.transition = 'transform 0.1s ease';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      });
    });
  }

  // =============================================
  // SPOTLIGHT FOLLOW ON EXP CARDS
  // =============================================
  if (!isMobile) {
    document.querySelectorAll('[data-spotlight]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--spotlight-x', x + 'px');
        card.style.setProperty('--spotlight-y', y + 'px');
      });
    });
  }

  // =============================================
  // TIMELINE LINE ANIMATION
  // =============================================
  const timelineLine = document.getElementById('timelineLine');

  if (timelineLine && !isMobile) {
    const timeline = timelineLine.parentElement;

    const timelineObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const tlRect = timeline.getBoundingClientRect();
          timelineLine.style.height = timeline.scrollHeight + 'px';
          timelineObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05 });

    timelineObserver.observe(timeline);
  }

  // =============================================
  // ACTIVE NAV LINK
  // =============================================
  const sections = document.querySelectorAll('.section, .hero');
  const navLinks = document.querySelectorAll('.nav-links a:not(.nav-cta)');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '-80px 0px -50% 0px'
  });

  sections.forEach(section => sectionObserver.observe(section));

  // =============================================
  // PARALLAX ORBS + HERO FADE
  // =============================================
  if (!isMobile) {
    const orbs = document.querySelectorAll('.gradient-orb');
    const heroContent = document.querySelector('.hero-content');

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      orbs.forEach((orb, i) => {
        const speed = (i + 1) * 0.12;
        orb.style.transform = `translateY(${scrollY * speed}px)`;
      });

      if (heroContent) {
        const fade = Math.max(0, 1 - scrollY / (window.innerHeight * 0.6));
        heroContent.style.opacity = fade;
        heroContent.style.transform = `translateY(${scrollY * 0.15}px)`;
      }
    }, { passive: true });
  }

  // =============================================
  // PARALLAX BIG TEXT
  // =============================================
  if (!isMobile) {
    const bigTextSpans = document.querySelectorAll('.big-text span');

    window.addEventListener('scroll', () => {
      const bigTextEl = document.getElementById('bigText');
      if (!bigTextEl) return;

      const rect = bigTextEl.getBoundingClientRect();
      const windowH = window.innerHeight;

      if (rect.top < windowH && rect.bottom > 0) {
        const progress = (windowH - rect.top) / (windowH + rect.height);
        bigTextSpans.forEach((span, i) => {
          const direction = i % 2 === 0 ? 1 : -1;
          const offset = (progress - 0.5) * 80 * direction;
          span.style.transform = `translateX(${offset}px)`;
        });
      }
    }, { passive: true });
  }

  // =============================================
  // PAGE LOAD ANIMATIONS
  // =============================================
  function initPageAnimations() {
    const heroReveals = document.querySelectorAll('.hero [data-reveal], .hero [data-reveal-line]');
    heroReveals.forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 300 + i * 180);
    });
  }

  // =============================================
  // LIGHTBOX
  // =============================================
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');

  document.querySelectorAll('[data-lightbox]').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.getAttribute('data-lightbox');
      const caption = item.getAttribute('data-caption') || '';
      lightboxImg.src = src;
      lightboxImg.alt = caption;
      lightboxCaption.textContent = caption;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // =============================================
  // CUSTOM SELECT DROPDOWN
  // =============================================
  const intentSelect = document.getElementById('intentSelect');
  const intentTrigger = document.getElementById('intentTrigger');
  const intentOptions = document.getElementById('intentOptions');
  const intentValue = document.getElementById('intentValue');
  const formIntent = document.getElementById('formIntent');

  if (intentTrigger && intentOptions) {
    intentTrigger.addEventListener('click', () => {
      const isOpen = intentSelect.classList.toggle('open');
      intentTrigger.setAttribute('aria-expanded', isOpen);
    });

    intentOptions.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        intentOptions.querySelectorAll('li').forEach(o => o.classList.remove('selected'));
        li.classList.add('selected');
        const label = li.querySelector('span').textContent;
        intentValue.textContent = label;
        intentTrigger.classList.add('has-value');
        formIntent.value = li.dataset.value;
        intentSelect.classList.remove('open');
        intentTrigger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (!intentSelect.contains(e.target)) {
        intentSelect.classList.remove('open');
        intentTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // =============================================
  // TOAST NOTIFICATION
  // =============================================
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toastTitle');
  const toastMsg = document.getElementById('toastMsg');
  const toastClose = document.getElementById('toastClose');
  const toastProgress = document.getElementById('toastProgress');
  let toastTimer = null;

  function showToast(title, msg, isError) {
    clearTimeout(toastTimer);
    toast.classList.remove('visible', 'toast-exit', 'toast-error');
    toastProgress.style.animation = 'none';
    void toast.offsetWidth;

    if (isError) toast.classList.add('toast-error');
    toastTitle.textContent = title;
    toastMsg.textContent = msg;
    toast.classList.add('visible');
    toastProgress.style.animation = 'toastCountdown 4s linear forwards';
    toastTimer = setTimeout(dismissToast, 4200);
  }

  function dismissToast() {
    clearTimeout(toastTimer);
    toast.classList.add('toast-exit');
    setTimeout(() => toast.classList.remove('visible', 'toast-exit', 'toast-error'), 400);
  }

  if (toastClose) toastClose.addEventListener('click', dismissToast);

  // =============================================
  // CONTACT FORM — SUPABASE INTEGRATION
  // =============================================
  const contactForm = document.getElementById('contactForm');
  const formStatus = document.getElementById('formStatus');
  const sendBtn = document.getElementById('formSubmit');
  const sendBtnText = document.getElementById('submitBtnText');

  // Rate limiting: max 1 submission per 30 seconds
  const RATE_LIMIT_MS = 30000;

  function isRateLimited() {
    const lastSubmit = localStorage.getItem('ag_last_contact');
    if (lastSubmit && Date.now() - parseInt(lastSubmit, 10) < RATE_LIMIT_MS) {
      return true;
    }
    return false;
  }

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('formName').value.trim();
    const email = document.getElementById('formEmail').value.trim();
    const message = document.getElementById('formMessage').value.trim();
    const intent = formIntent ? formIntent.value : '';
    const honeypot = document.getElementById('formHoneypot')?.value || '';

    // Spam check: if honeypot is filled, silently "succeed"
    if (honeypot) {
      showToast('Message sent!', 'I\'ll get back to you soon.');
      contactForm.reset();
      return;
    }

    if (!name || !email || !message) {
      showToast('Missing fields', 'Please fill in name, email, and message.', true);
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Invalid email', 'Please enter a valid email address.', true);
      return;
    }

    // Rate limit
    if (isRateLimited()) {
      showToast('Please wait', 'You can send another message in a few seconds.', true);
      return;
    }

    sendBtn.disabled = true;
    sendBtn.classList.add('btn-loading');
    sendBtnText.textContent = 'Sending...';
    formStatus.textContent = '';
    formStatus.className = 'form-status';

    const intentLabel = intent ? { hi: 'Just saying hi!', coffee: 'Coffee chat', cv: 'Request CV', quotation: 'Quotation', project: "Let's build something" }[intent] : 'General';

    try {
      // Call edge function directly — it handles both DB insert and Discord notification
      const edgeFnUrl = SUPABASE_URL + '/functions/v1/notify-discord';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            name,
            email,
            intent: intentLabel,
            message,
            source: 'website',
            created_at: new Date().toISOString(),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error (${response.status})`);
      }

      localStorage.setItem('ag_last_contact', Date.now().toString());
      showToast('Message sent!', 'I\'ll get back to you soon.');
      contactForm.reset();
      if (intentTrigger) {
        intentTrigger.classList.remove('has-value');
        intentValue.textContent = 'What can I help with?';
      }
      if (formIntent) formIntent.value = '';
      intentOptions.querySelectorAll('li').forEach(o => o.classList.remove('selected'));
    } catch (err) {
      console.error('[Contact]', err);
      if (err.name === 'AbortError') {
        showToast('Request timed out', 'Please try again in a moment.', true);
      } else {
        showToast('Something went wrong', 'Please try again or reach out on social.', true);
      }
    } finally {
      sendBtn.disabled = false;
      sendBtn.classList.remove('btn-loading');
      sendBtnText.textContent = 'Send Message';
    }
  });

  // =============================================
  // EXP HIGHLIGHT STAGGER
  // =============================================
  document.querySelectorAll('.exp-highlights').forEach(parent => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.exp-highlight-item').forEach((child, i) => {
            setTimeout(() => child.classList.add('visible'), i * 120);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(parent);
  });

})();
