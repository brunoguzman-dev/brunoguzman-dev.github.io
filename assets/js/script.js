(function () {
  'use strict';

  /* ---------- Año dinámico en footer ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Parallax sutil del glow del hero al hacer scroll ----------
     El "respiro" (escala/opacidad) del glow es puramente CSS (@keyframes
     glow-breathe). Acá solo se agrega un desplazamiento vertical ligado al
     scroll para que se sienta "vivo" mientras el usuario navega, sin pisar
     la propiedad transform que ya anima el CSS (se mueve "top", no transform). */
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroGlow = document.querySelector('.hero-glow');

  if (heroGlow && !prefersReducedMotion) {
    var baseTop = -220;
    var parallaxFactor = 0.18;
    var maxOffset = 90;
    var ticking = false;

    function updateGlowParallax() {
      var offset = Math.min(window.scrollY * parallaxFactor, maxOffset);
      heroGlow.style.top = (baseTop + offset) + 'px';
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(updateGlowParallax);
          ticking = true;
        }
      },
      { passive: true }
    );

    updateGlowParallax();
  }

  /* ---------- Menú responsive ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-active', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Cerrar menú al clickear un link (mobile)
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('is-open');
        navToggle.classList.remove('is-active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Animaciones al hacer scroll ----------
     Nota: el formulario de contacto (.contact-form) queda EXCLUIDO a propósito.
     Es el elemento más importante de conversión de la página y no debe depender
     de que un IntersectionObserver dispare correctamente (salto directo a un
     ancla, scroll muy rápido, navegación por teclado/lector de pantalla, etc.).
     Todo lo demás es puramente decorativo, así que sí se anima. */
  var animatedTargets = document.querySelectorAll(
    '.highlight-card, .timeline-item, .project-card, .skills-block, .contact-info'
  );

  animatedTargets.forEach(function (el) {
    el.setAttribute('data-animate', '');
  });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px 200px 0px' }
    );

    animatedTargets.forEach(function (el) {
      observer.observe(el);
    });

    // Red de seguridad: si por cualquier motivo algún elemento nunca disparó
    // el observer (bug del navegador, salto instantáneo, foco por teclado que
    // se adelanta al scroll, etc.), se revela igual pasado un tiempo prudencial
    // para que ningún contenido quede oculto de forma permanente.
    window.setTimeout(function () {
      animatedTargets.forEach(function (el) {
        el.classList.add('is-visible');
      });
    }, 2500);
  } else {
    // Fallback: navegadores sin soporte muestran todo directamente
    animatedTargets.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // El foco de teclado (Tab) puede llevar a un elemento aún no revelado
  // por el observer; si eso pasa, se hace visible al instante.
  animatedTargets.forEach(function (el) {
    el.addEventListener('focusin', function () {
      el.classList.add('is-visible');
    });
  });

  /* ---------- Formulario de contacto (envío vía Formspree, AJAX) ---------- */
  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('form-status');
  var submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  function setError(field, message) {
    var group = field.closest('.form-group');
    var errorEl = form.querySelector('[data-error-for="' + field.name + '"]');
    if (message) {
      group.classList.add('has-error');
      if (errorEl) errorEl.textContent = message;
    } else {
      group.classList.remove('has-error');
      if (errorEl) errorEl.textContent = '';
    }
  }

  function validate() {
    var valid = true;

    var name = form.elements['name'];
    if (!name.value.trim() || name.value.trim().length < 2) {
      setError(name, 'Ingresá tu nombre completo.');
      valid = false;
    } else {
      setError(name, '');
    }

    var email = form.elements['email'];
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.value.trim())) {
      setError(email, 'Ingresá un correo electrónico válido.');
      valid = false;
    } else {
      setError(email, '');
    }

    var subject = form.elements['subject'];
    if (!subject.value) {
      setError(subject, 'Elegí un asunto.');
      valid = false;
    } else {
      setError(subject, '');
    }

    var message = form.elements['message'];
    if (!message.value.trim() || message.value.trim().length < 10) {
      setError(message, 'Contame un poco más (mínimo 10 caracteres).');
      valid = false;
    } else {
      setError(message, '');
    }

    return valid;
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.style.color = isError ? '#C0392B' : '#1B7F4C';
    statusEl.textContent = message;
  }

  if (form) {
    // El <form> ya tiene action="https://formspree.io/f/xpqvjbja" y method="POST":
    // si JavaScript falla o está deshabilitado, el envío nativo del navegador
    // sigue funcionando igual (Formspree procesa POST normales sin necesidad de JS).
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validate()) {
        setStatus('Revisá los campos marcados antes de enviar.', true);
        return;
      }

      var subject = form.elements['subject'].value;
      var name = form.elements['name'].value.trim();

      // Formspree usa el campo "_subject" para el asunto del email que te llega.
      var subjectInput = form.querySelector('input[name="_subject"]');
      if (!subjectInput) {
        subjectInput = document.createElement('input');
        subjectInput.type = 'hidden';
        subjectInput.name = '_subject';
        form.appendChild(subjectInput);
      }
      subjectInput.value = '[Portafolio] ' + subject + ' — ' + name;

      var formAction = form.getAttribute('action') || '';
      var isConfigured = formAction.indexOf('TU_FORM_ID') === -1 && formAction.indexOf('formspree.io') !== -1;

      if (!isConfigured) {
        // Formspree todavía no está configurado con un endpoint real.
        setStatus('El formulario aún no está conectado a un servicio de envío. Escribime directo a ' + 'brguzman08@gmail.com' + ' mientras tanto.', true);
        return;
      }

      var formData = new FormData(form);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
      }
      setStatus('Enviando tu mensaje...', false);

      fetch(formAction, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          if (response.ok) {
            setStatus('¡Mensaje enviado! Te responderé a la brevedad.', false);
            form.reset();
          } else {
            return response.json().then(function (data) {
              var errorMsg = (data && data.errors && data.errors.map(function (er) { return er.message; }).join(', ')) ||
                'No se pudo enviar el mensaje. Probá de nuevo o escribime directo a brguzman08@gmail.com.';
              setStatus(errorMsg, true);
            });
          }
        })
        .catch(function () {
          setStatus('Hubo un problema de conexión. Probá de nuevo o escribime directo a brguzman08@gmail.com.', true);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar mensaje';
          }
        });
    });
  }
})();
