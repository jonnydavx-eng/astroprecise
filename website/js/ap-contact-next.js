/* Contact form: send through Formspree's AJAX endpoint and thank the visitor on our own page.
   Without JavaScript the form still posts normally. Only the fields in the form are sent. */
(function () {
  'use strict';
  function boot() {
    const form = document.getElementById('contact-form');
    if (!form || !window.fetch || !window.FormData) return;
    const status = document.getElementById('contact-status');
    const sent = document.getElementById('contact-sent');
    const button = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (event) => {
      if (!form.checkValidity()) return;
      event.preventDefault();
      button.disabled = true;
      status.textContent = 'Sending…';
      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error('Send failed');
        status.textContent = '';
        form.hidden = true;
        sent.hidden = false;
        sent.focus();
      } catch {
        status.textContent = 'The message could not be sent just now. Please try again, or email contact@astroprecise.app.';
        button.disabled = false;
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
