// Your code here.
(() => {
  const slider = document.querySelector('.items');
  if (!slider) {
    console.warn('.items not found');
    return;
  }

  // State
  let isDown = false;
  let startPageX = 0;
  let startScrollLeft = 0;

  // helper to read pageX robustly
  const pageXFromEvent = (e) => (e && (e.pageX !== undefined)) ? e.pageX : (e && e.clientX) || 0;

  // Mouse handlers (Cypress uses mouse events with pageX/pageY)
  slider.addEventListener('mousedown', function (e) {
    // only primary button
    if (typeof e.button === 'number' && e.button !== 0) return;
    isDown = true;
    startPageX = pageXFromEvent(e);
    startScrollLeft = slider.scrollLeft;
    slider.classList && slider.classList.add('active');
    // ensure we can capture synthetic moves reliably
    e.preventDefault && e.preventDefault();
  }, { passive: false });

  slider.addEventListener('mousemove', function (e) {
    if (!isDown) return;
    const px = pageXFromEvent(e);
    const dx = px - startPageX;
    // invert so dragging left increases scrollLeft
    slider.scrollLeft = startScrollLeft - dx;
    e.preventDefault && e.preventDefault();
  }, { passive: false });

  // End drag on mouseup anywhere (window) — Cypress triggers mouseup on element but safe to handle globally
  window.addEventListener('mouseup', function (e) {
    if (!isDown) return;
    isDown = false;
    slider.classList && slider.classList.remove('active');
  }, { passive: true });

  // Also handle pointer events for real-user interactions (touch/mouse)
  slider.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isDown = true;
    startPageX = pageXFromEvent(e);
    startScrollLeft = slider.scrollLeft;
    slider.classList && slider.classList.add('active');
    try { slider.setPointerCapture && slider.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault && e.preventDefault();
  }, { passive: false });

  slider.addEventListener('pointermove', function (e) {
    if (!isDown) return;
    const px = pageXFromEvent(e);
    const dx = px - startPageX;
    slider.scrollLeft = startScrollLeft - dx;
    e.preventDefault && e.preventDefault();
  }, { passive: false });

  slider.addEventListener('pointerup', function (e) {
    if (!isDown) return;
    isDown = false;
    slider.classList && slider.classList.remove('active');
    try { slider.releasePointerCapture && slider.releasePointerCapture(e.pointerId); } catch {}
  }, { passive: true });

  // prevent native drag behavior
  slider.addEventListener('dragstart', e => e.preventDefault());

  // Debug helper: call from DevTools if you want to inspect test coordinates / rect
  window.__itemsDebug = () => {
    const r = slider.getBoundingClientRect();
    console.log('items rect:', r, 'scrollLeft:', slider.scrollLeft, 'scrollWidth:', slider.scrollWidth, 'clientWidth:', slider.clientWidth);
    return { rect: r, scrollLeft: slider.scrollLeft, scrollWidth: slider.scrollWidth, clientWidth: slider.clientWidth };
  };

  console.log('Drag-to-scroll for .items installed (mouse + pointer handlers).');
})();
