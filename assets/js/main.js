(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Header: solid once the hero has scrolled away */
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('[data-hero]');
  if (header && hero && 'IntersectionObserver' in window) {
    const sentinel = new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-solid', entry.intersectionRatio < 0.88);
    }, { threshold: [0, 0.88, 1] });
    sentinel.observe(hero);
  }

  /* Mobile menu */
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (toggle && menu) {
    const label = toggle.querySelector('.site-header__toggle-label');
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      label.textContent = open ? 'Fermer' : 'Menu';
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1181px)').addEventListener('change', (mq) => {
      if (mq.matches) setOpen(false);
    });
  }

  /* Prestations submenu: a disclosure on desktop, always unfolded inside the mobile menu */
  const submenu = document.querySelector('[data-submenu]');
  if (submenu) {
    const subToggle = submenu.querySelector('[data-submenu-toggle]');
    const desktop = window.matchMedia('(min-width: 1181px)');
    const setSub = (open) => {
      submenu.classList.toggle('is-open', open);
      subToggle.setAttribute('aria-expanded', String(open));
    };
    const syncMode = () => setSub(!desktop.matches);
    subToggle.addEventListener('click', () => {
      if (desktop.matches) setSub(!submenu.classList.contains('is-open'));
    });
    document.addEventListener('click', (event) => {
      if (desktop.matches && !submenu.contains(event.target)) setSub(false);
    });
    submenu.addEventListener('focusout', (event) => {
      if (desktop.matches && !submenu.contains(event.relatedTarget)) setSub(false);
    });
    submenu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && desktop.matches && submenu.classList.contains('is-open')) {
        setSub(false);
        subToggle.focus();
      }
    });
    submenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      if (desktop.matches) setSub(false);
    }));
    desktop.addEventListener('change', syncMode);
    syncMode();
  }

  /* Hero: the next photo rises like a caravan shutter */
  if (hero) {
    const slides = [...hero.querySelectorAll('[data-slide]')];
    const tabs = [...hero.querySelectorAll('[data-hero-tab]')];
    const pause = hero.querySelector('[data-hero-pause]');
    const pauseLabel = hero.querySelector('[data-hero-pause-label]');
    const hold = 7000;
    let current = 0;
    let timer = null;
    let userPaused = false;
    let hoverPaused = false;
    let startedAt = 0;
    let remaining = hold;

    const show = (index) => {
      if (index === current) return;
      const previous = slides[current];
      const next = slides[index];
      slides.forEach((slide) => slide.classList.remove('is-entering'));
      tabs.forEach((tab, i) => {
        tab.classList.toggle('is-active', i === index);
        tab.setAttribute('aria-pressed', String(i === index));
      });
      const img = next.querySelector('img');
      if (img) img.loading = 'eager';

      if (reduceMotion.matches) {
        previous.classList.remove('is-active');
        next.classList.add('is-active');
      } else {
        next.classList.add('is-entering');
        next.addEventListener('animationend', function done(event) {
          if (event.target !== next) return;
          next.removeEventListener('animationend', done);
          next.classList.remove('is-entering');
          next.classList.add('is-active');
          previous.classList.remove('is-active');
        });
      }
      current = index;
      restartProgress();
    };

    const restartProgress = () => {
      const bar = tabs[current].querySelector('.hero__progress');
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
      remaining = hold;
      schedule();
    };

    const schedule = () => {
      clearTimeout(timer);
      if (!isPlaying()) return;
      startedAt = performance.now();
      timer = setTimeout(() => show((current + 1) % slides.length), remaining);
    };

    const isPlaying = () => !userPaused && !hoverPaused && !reduceMotion.matches && !document.hidden;

    const sync = () => {
      const playing = isPlaying();
      hero.classList.toggle('is-playing', !reduceMotion.matches && !userPaused);
      hero.classList.toggle('is-paused', !playing);
      if (playing) {
        schedule();
      } else {
        if (timer) remaining = Math.max(0, remaining - (performance.now() - startedAt));
        clearTimeout(timer);
        timer = null;
      }
    };

    tabs.forEach((tab, index) => tab.addEventListener('click', () => show(index)));

    if (pause) {
      pause.addEventListener('click', () => {
        userPaused = !userPaused;
        pause.setAttribute('aria-pressed', String(userPaused));
        pauseLabel.textContent = userPaused ? 'Reprendre le défilement' : 'Mettre en pause';
        if (!userPaused) remaining = hold;
        if (!userPaused) restartProgress();
        sync();
      });
    }

    const index = hero.querySelector('[data-hero-index]');
    if (index) {
      index.addEventListener('pointerenter', () => { hoverPaused = true; sync(); });
      index.addEventListener('pointerleave', () => { hoverPaused = false; sync(); });
      index.addEventListener('focusin', () => { hoverPaused = true; sync(); });
      index.addEventListener('focusout', (event) => {
        if (!index.contains(event.relatedTarget)) { hoverPaused = false; sync(); }
      });
    }

    document.addEventListener('visibilitychange', sync);
    reduceMotion.addEventListener('change', sync);
    if (reduceMotion.matches && pause) pause.hidden = true;
    sync();
  }

  /* Film: poster and play button first, native controls once the visitor starts it */
  const film = document.querySelector('[data-film]');
  if (film) {
    const video = film.querySelector('[data-film-video]');
    const play = film.querySelector('[data-film-play]');
    video.controls = false;
    play.hidden = false;
    const start = () => {
      film.classList.add('is-playing');
      video.controls = true;
      const attempt = video.play();
      if (attempt) attempt.catch(() => {});
      video.focus({ preventScroll: true });
    };
    play.addEventListener('click', start);
    video.addEventListener('play', () => {
      film.classList.add('is-playing');
      video.controls = true;
    });
    video.addEventListener('ended', () => {
      film.classList.remove('is-playing');
      video.controls = false;
      video.load();
      play.focus({ preventScroll: true });
    });
  }

  /* Reviews: tabs once scripting is available */
  const reviews = document.querySelector('[data-reviews]');
  if (reviews) {
    const tablist = reviews.querySelector('[data-reviews-tablist]');
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const panelsWrap = reviews.querySelector('.reviews__panels');
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

    panels.forEach((panel, i) => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabs[i].id);
      panel.tabIndex = 0;
      panel.hidden = i !== 0;
    });
    tablist.hidden = false;
    panelsWrap.classList.add('is-tabbed');

    const select = (index, focus) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      panels[index].classList.remove('is-entering');
      void panels[index].offsetWidth;
      panels[index].classList.add('is-entering');
      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', (event) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (event.key in keys) {
          event.preventDefault();
          select((i + keys[event.key] + tabs.length) % tabs.length, true);
        } else if (event.key === 'Home') {
          event.preventDefault();
          select(0, true);
        } else if (event.key === 'End') {
          event.preventDefault();
          select(tabs.length - 1, true);
        }
      });
    });
  }

  /* Quote form: validate, then hand a prefilled e-mail to the visitor's mail app */
  const form = document.querySelector('[data-quote-form]');
  const done = document.querySelector('[data-quote-done]');
  if (form && done) {
    const required = [
      { input: form.nom, error: document.getElementById('nom-erreur'), valid: (el) => el.value.trim().length > 1 },
      { input: form.email, error: document.getElementById('email-erreur'), valid: (el) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) },
      { input: form.consentement, error: document.getElementById('consentement-erreur'), valid: (el) => el.checked },
    ];

    const check = (rule) => {
      const ok = rule.valid(rule.input);
      rule.input.setAttribute('aria-invalid', String(!ok));
      rule.error.hidden = ok;
      return ok;
    };

    required.forEach((rule) => {
      const event = rule.input.type === 'checkbox' ? 'change' : 'blur';
      rule.input.addEventListener(event, () => {
        if (rule.input.getAttribute('aria-invalid')) check(rule);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const results = required.map(check);
      const firstInvalid = required[results.indexOf(false)];
      if (firstInvalid) {
        firstInvalid.input.focus();
        return;
      }

      const data = new FormData(form);
      const prestations = data.getAll('prestation');
      const date = data.get('date')
        ? new Date(data.get('date') + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'à préciser';
      const lines = [
        'Bonjour Drunk in Love,',
        '',
        'Je souhaite recevoir un devis pour mon événement.',
        '',
        `Type d’événement : ${data.get('evenement')}`,
        `Date : ${date}`,
        `Nombre d’invités : ${data.get('invites') || 'à préciser'}`,
        `Lieu : ${data.get('lieu') || 'à préciser'}`,
        `Prestations envisagées : ${prestations.length ? prestations.join(', ') : 'à définir ensemble'}`,
        '',
        data.get('message') ? `Mon projet : ${data.get('message')}` : '',
        '',
        `${data.get('nom')}`,
        `${data.get('email')}${data.get('telephone') ? ' · ' + data.get('telephone') : ''}`,
      ].filter((line, i, all) => !(line === '' && all[i - 1] === ''));

      const subject = `Demande de devis · ${data.get('evenement')} · ${date}`;
      const href = `mailto:contact@drunkinloveevent.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;

      form.hidden = true;
      done.hidden = false;
      done.focus();
      window.location.href = href;
    });
  }
})();
