/* Shared sky on tool rooms — hide the boot overlay when the void-orrery paints. */
(function () {
  function ready() {
    var stage = document.querySelector('.ap-room-sky .ap-model-stage');
    if (!stage) return;
    stage.classList.add('is-model-ready');
    stage.setAttribute('aria-busy', 'false');
  }
  document.addEventListener('ap-orrery-ready', ready);
  var orr = document.getElementById('orr');
  if (orr && orr._ready) ready();
})();
