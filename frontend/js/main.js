// Enkiama Foundation Main JS
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link, .btn-nav');

function handleNavbarScroll() {
  if (!navbar) return;
  navbar.classList.toggle('scrolled', window.scrollY > 24);
}

function setNavOpen(open) {
  if (!hamburger || !navMenu) return;
  navMenu.classList.toggle('active', open);
  hamburger.classList.toggle('active', open);
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  document.body.classList.toggle('nav-open', open);
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });

if (hamburger && navMenu) {
  hamburger.addEventListener('click', () => {
    setNavOpen(!navMenu.classList.contains('active'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navMenu.classList.contains('active')) {
      setNavOpen(false);
      hamburger.focus();
    }
  });

  document.addEventListener('click', (event) => {
    const clickedInsideNav = navbar && navbar.contains(event.target);
    if (!clickedInsideNav && navMenu.classList.contains('active')) setNavOpen(false);
  });
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => setNavOpen(false));
});

function formatCounterValue(value, target) {
  if (target >= 1000) return `${Math.ceil(value / 1000)}K+`;
  return Math.ceil(value).toLocaleString();
}

function finishCounter(counter, target) {
  counter.innerText = target >= 1000 ? `${target / 1000}K+` : target.toLocaleString();
}

function animateCounter(counter) {
  if (counter.dataset.counted === 'true') return;
  const target = Number(counter.getAttribute('data-target'));
  if (!target) return;

  counter.dataset.counted = 'true';
  if (prefersReducedMotion) {
    finishCounter(counter, target);
    return;
  }

  const duration = 1300;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    counter.innerText = formatCounterValue(value, target);

    if (progress < 1) requestAnimationFrame(update);
    else finishCounter(counter, target);
  }

  requestAnimationFrame(update);
}

function setupCounters() {
  const counters = document.querySelectorAll('.stat-number, .stat-number-large');
  if (!counters.length) return;

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animateCounter);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });

  counters.forEach((counter) => observer.observe(counter));
}

function setupRevealAnimations() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  items.forEach((item) => observer.observe(item));
}

function getLiveRegion() {
  let region = document.getElementById('notificationRegion');
  if (region) return region;

  region = document.createElement('div');
  region.id = 'notificationRegion';
  region.className = 'visually-hidden';
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  document.body.appendChild(region);
  return region;
}

function showNotification(title, message, type = 'info') {
  const liveRegion = getLiveRegion();
  liveRegion.textContent = `${title}. ${message}`;

  const notification = document.createElement('div');
  notification.className = `toast ${type}`;
  notification.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const strong = document.createElement('strong');
  strong.textContent = title;
  const text = document.createElement('span');
  text.textContent = message;

  notification.append(strong, text);
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5200);
}

function setFormLoading(form, loading) {
  const submitButton = form.querySelector('button[type="submit"]');
  form.setAttribute('aria-busy', String(loading));
  if (!submitButton) return;

  if (!submitButton.dataset.originalText) submitButton.dataset.originalText = submitButton.textContent.trim();
  submitButton.disabled = loading;
  submitButton.textContent = loading ? 'Submitting...' : submitButton.dataset.originalText;
}

function endpointForForm(form) {
  const formId = typeof form === 'string' ? form : form.id;
  const submissionType = typeof form === 'string' ? '' : form.dataset.submissionType;
  let endpoint = '/api/contact';
  if (formId === 'volunteerForm') endpoint = submissionType === 'mentor' ? '/api/applications/mentor' : '/api/applications/volunteer';
  if (formId === 'partnershipForm') endpoint = '/api/applications/partnership';
  if (formId === 'programForm') endpoint = '/api/applications/program';
  if (formId === 'donationForm') endpoint = submissionType === 'sponsor' ? '/api/applications/sponsor' : '/api/donations';
  if (formId === 'storyForm') endpoint = '/api/stories';
  if (formId === 'newsletterForm') endpoint = '/api/newsletter/subscribe';
  return endpoint;
}

function normalizeFormData(data) {
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'string') data[key] = data[key].trim();
  });
  return data;
}

function validateContactForm(form, data) {
  if (form.id !== 'contactForm') return true;

  const requiredFields = [
    ['firstName', 'First name is required.'],
    ['lastName', 'Last name is required.'],
    ['email', 'Email is required.'],
    ['subject', 'Please select a reason for contact.'],
    ['message', 'Message is required.']
  ];

  for (const [fieldName, message] of requiredFields) {
    if (!data[fieldName]) {
      showNotification('Error', message, 'error');
      const field = form.elements[fieldName];
      if (field && typeof field.focus === 'function') field.focus();
      return false;
    }
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email)) {
    showNotification('Error', 'Enter a valid email address.', 'error');
    const field = form.elements.email;
    if (field && typeof field.focus === 'function') field.focus();
    return false;
  }

  if (data.message.length < 10) {
    showNotification('Error', 'Message must be at least 10 characters.', 'error');
    const field = form.elements.message;
    if (field && typeof field.focus === 'function') field.focus();
    return false;
  }

  return true;
}

function setupForms() {
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = normalizeFormData(Object.fromEntries(new FormData(form)));
      if (!validateContactForm(form, data)) return;

      const endpoint = endpointForForm(form);
      setFormLoading(form, true);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        let result = {};
        try {
          result = await res.json();
        } catch (error) {
          result = {};
        }

        if (res.ok) {
          showNotification('Success!', result.message || 'Submitted successfully.', 'success');
          form.reset();
          form.querySelectorAll('.amount-chip[aria-pressed="true"]').forEach((chip) => chip.setAttribute('aria-pressed', 'false'));
        } else {
          showNotification('Error', result.message || 'Something went wrong.', 'error');
          console.log(result);
        }
      } catch (error) {
        console.error(error);
        showNotification('Error', 'Network error. Check if server is running.', 'error');
      } finally {
        setFormLoading(form, false);
      }
    });
  });
}


function currentCmsPage() {
  if (document.body.dataset.cmsPage) return document.body.dataset.cmsPage;
  const file = window.location.pathname.split('/').pop() || 'index.html';
  const map = {
    'index.html': 'home',
    'about.html': 'about',
    'programs.html': 'programs',
    'impact.html': 'impact',
    'heritage.html': 'heritage',
    'get-involved.html': 'get_involved',
    'contact.html': 'contact'
  };
  return map[file] || 'home';
}

function applyCmsContentEntry(entry) {
  const key = entry.content_key;
  const value = entry.content_value;

  document.querySelectorAll('[data-cms-key]').forEach((node) => {
    if (node.dataset.cmsKey === key) node.textContent = value;
  });

  document.querySelectorAll('[data-cms-bg-key]').forEach((node) => {
    if (node.dataset.cmsBgKey === key && value) node.style.backgroundImage = `url('${value}')`;
  });

  document.querySelectorAll('[data-cms-src-key]').forEach((node) => {
    if (node.dataset.cmsSrcKey === key && value) node.setAttribute('src', value);
  });

  document.querySelectorAll('[data-cms-href-key]').forEach((node) => {
    if (node.dataset.cmsHrefKey === key && value) node.setAttribute('href', value);
  });

  document.querySelectorAll('[data-cms-target-key]').forEach((node) => {
    if (node.dataset.cmsTargetKey === key && value) {
      const numberValue = Number(String(value).replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(numberValue)) {
        node.dataset.target = String(numberValue);
        node.dataset.counted = 'false';
        node.textContent = value;
      }
    }
  });
}

function cmsPagesToLoad() {
  const page = currentCmsPage();
  if (!page) return [];
  return page === 'get_involved' ? [page, 'donate'] : [page];
}

let cmsContentPromise = null;

async function setupCmsContent() {
  const pages = cmsPagesToLoad();
  if (!pages.length) return;
  if (cmsContentPromise) return cmsContentPromise;

  cmsContentPromise = (async () => {
    try {
      const query = pages.length === 1
        ? `page=${encodeURIComponent(pages[0])}`
        : `pages=${pages.map(encodeURIComponent).join(',')}`;
      const response = await fetch(`/api/cms/site-content?${query}`, {
        cache: 'default',
      });
      if (!response.ok) return;
      const payload = await response.json();
      (payload.content || []).forEach(applyCmsContentEntry);
      setupCounters();
    } catch (error) {
      console.warn('CMS content unavailable:', error.message);
    }
  })();

  return cmsContentPromise;
}

function trackPublicVisit() {
  if (window.__enkiamaVisitTracked) return;
  if (document.body.classList.contains('admin-page') || document.body.classList.contains('admin-login-page')) return;
  window.__enkiamaVisitTracked = true;

  const payload = {
    page: currentCmsPage() || document.title || 'unknown',
    path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    referrer: document.referrer || '',
    user_agent: navigator.userAgent || '',
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/visit', blob);
      return;
    }
    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (error) {
    // Tracking should never interrupt the visitor experience.
  }
}

function setupDonationChips() {
  const amountInput = document.getElementById('donationAmount');
  const chips = document.querySelectorAll('.amount-chip[data-amount]');
  if (!amountInput || !chips.length) return;

  chips.forEach((chip) => {
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      chips.forEach((item) => item.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      amountInput.value = chip.dataset.amount || '';
      amountInput.focus();
    });
  });
}

function setupInvolvementSelector() {
  const chooser = document.querySelector('[data-involvement-chooser]');
  const panels = document.querySelectorAll('[data-involvement-panel]');
  const cards = document.querySelectorAll('[data-involvement-target]');
  const intro = document.getElementById('involvementIntro');
  if (!chooser || !panels.length || !cards.length) return;

  const panelForTarget = {
    volunteer: 'volunteer',
    partner: 'partner',
    donate: 'donate',
    mentor: 'volunteer',
    sponsor: 'donate',
    apply: 'apply'
  };

  function showPanel(target, scrollToPanel = true) {
    const panelName = panelForTarget[target];
    if (!panelName) return;

    panels.forEach((panel) => {
      const isActive = panel.dataset.involvementPanel === panelName;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });

    cards.forEach((card) => {
      const isActive = card.dataset.involvementTarget === target;
      card.setAttribute('aria-pressed', String(isActive));
    });

    if (intro) intro.hidden = true;

    const volunteerForm = document.getElementById('volunteerForm');
    const donationForm = document.getElementById('donationForm');
    if (volunteerForm) volunteerForm.dataset.submissionType = target === 'mentor' ? 'mentor' : 'volunteer';
    if (donationForm) donationForm.dataset.submissionType = target === 'sponsor' ? 'sponsor' : 'donation';

    const activePanel = document.querySelector(`[data-involvement-panel="${panelName}"]`);
    if (activePanel && scrollToPanel) {
      activePanel.scrollIntoView({ block: 'start', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }

  panels.forEach((panel) => {
    panel.hidden = true;
  });

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const target = card.dataset.involvementTarget;
      if (!target) return;
      showPanel(target);
      history.replaceState(null, '', `#${target}`);
    });
  });

  window.addEventListener('hashchange', () => {
    const target = window.location.hash.replace('#', '');
    showPanel(target);
  });

  const initialTarget = window.location.hash.replace('#', '');
  if (panelForTarget[initialTarget]) showPanel(initialTarget, false);
}

document.addEventListener('DOMContentLoaded', () => {
  handleNavbarScroll();
  setupRevealAnimations();
  setupCounters();
  setupDonationChips();
  setupInvolvementSelector();
  setupForms();
  trackPublicVisit();
  const loadCms = () => setupCmsContent();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadCms, { timeout: 900 });
  } else {
    window.setTimeout(loadCms, 0);
  }
});
