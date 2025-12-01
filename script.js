// Your code here.
(() => {
  const container = document.querySelector('.items');
  if (!container) return;

  // Ensure container is relative (your CSS already sets position:relative)
  const containerRect = () => container.getBoundingClientRect();

  // Utility clamp
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // We'll animate position updates via rAF for smoothness
  let rafId = null;
  function raf(fn) {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => { rafId = null; fn(); });
  }

  // State for current drag
  let activeEl = null;
  let activePointerId = null;
  let pointerStartX = 0, pointerStartY = 0;
  let elStartLeft = 0, elStartTop = 0;
  let grabOffsetX = 0, grabOffsetY = 0;
  let moved = false; // to detect click-without-drag
  const MOVE_THRESHOLD = 4; // px

  function toContainerCoords(pageX, pageY) {
    const rect = containerRect();
    // left/top relative to container's content box in viewport coordinates
    return {
      x: pageX - rect.left + container.scrollLeft,
      y: pageY - rect.top  + container.scrollTop
    };
  }

  function startDrag(e) {
    // Only primary mouse button
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    activeEl = e.currentTarget;
    activePointerId = e.pointerId;

    // compute element and container rects
    const cRect = containerRect();
    const elRect = activeEl.getBoundingClientRect();

    // pointer offset inside element (so cursor holds same spot on element)
    grabOffsetX = e.clientX - elRect.left;
    grabOffsetY = e.clientY - elRect.top;

    // compute element left/top relative to container (including scroll)
    elStartLeft = elRect.left - cRect.left + container.scrollLeft;
    elStartTop  = elRect.top  - cRect.top  + container.scrollTop;

    pointerStartX = e.clientX;
    pointerStartY = e.clientY;
    moved = false;

    // switch element to absolute inside container, preserving visual spot
    activeEl.style.position = 'absolute';
    activeEl.style.left = elStartLeft + 'px';
    activeEl.style.top  = elStartTop  + 'px';
    activeEl.style.zIndex = 1000;
    activeEl.style.touchAction = 'none';
    activeEl.setPointerCapture && activeEl.setPointerCapture(activePointerId);

    // bind move/up listeners to element (pointer capture keeps events coming)
    activeEl.addEventListener('pointermove', onPointerMove);
    activeEl.addEventListener('pointerup', onPointerUp);
    activeEl.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!activeEl || e.pointerId !== activePointerId) return;
    // detect movement
    if (!moved) {
      const dx = Math.abs(e.clientX - pointerStartX);
      const dy = Math.abs(e.clientY - pointerStartY);
      if (dx >= MOVE_THRESHOLD || dy >= MOVE_THRESHOLD) moved = true;
    }

    // calculate desired left/top within container coordinates
    const cRect = containerRect();
    const elRect = activeEl.getBoundingClientRect();
    // desired left = pointer's container-relative x minus grab offset + scroll
    let desiredLeft = e.clientX - cRect.left - grabOffsetX + container.scrollLeft;
    let desiredTop  = e.clientY - cRect.top  - grabOffsetY + container.scrollTop;

    // element dimensions as rendered (transforms don't change boundingRect size)
    const elW = elRect.width;
    const elH = elRect.height;

    // clamp so element stays fully inside container
    const maxLeft = Math.max(0, container.clientWidth - elW);
    const maxTop  = Math.max(0, container.clientHeight - elH);

    desiredLeft = clamp(desiredLeft, 0, maxLeft);
    desiredTop  = clamp(desiredTop,  0, maxTop);

    // apply via rAF for smoother position updates
    raf(() => {
      activeEl.style.left = desiredLeft + 'px';
      activeEl.style.top  = desiredTop  + 'px';
    });
  }

  function onPointerUp(e) {
    if (!activeEl || e.pointerId !== activePointerId) return;
    // release capture
    try { activeEl.releasePointerCapture && activeEl.releasePointerCapture(activePointerId); } catch(_) {}

    // remove listeners
    activeEl.removeEventListener('pointermove', onPointerMove);
    activeEl.removeEventListener('pointerup', onPointerUp);
    activeEl.removeEventListener('pointercancel', onPointerUp);

    // If user didn't move beyond threshold treat as click: keep it in same place (we already preserved it)
    // Final clamp to ensure inside bounds
    const elRect = activeEl.getBoundingClientRect();
    let left = parseFloat(activeEl.style.left) || 0;
    let top  = parseFloat(activeEl.style.top)  || 0;

    const maxLeft = Math.max(0, container.clientWidth - elRect.width);
    const maxTop  = Math.max(0, container.clientHeight - elRect.height);
    left = clamp(left, 0, maxLeft);
    top  = clamp(top,  0, maxTop);

    // snap back inside instantly (you can animate if you like)
    activeEl.style.left = left + 'px';
    activeEl.style.top  = top  + 'px';

    // clear styles we changed except position/left/top so element stays where dropped
    activeEl.style.zIndex = '';
    activeEl.style.touchAction = '';
    // leave position:absolute so element stays in place after dragging.
    // (If you prefer to return to document flow, you would need more logic to insert it back.)

    activeEl = null;
    activePointerId = null;
    moved = false;
  }

  // Attach pointerdown to each item
  function attach(item) {
    // ensure item has no native selection/drag behaviors
    item.style.userSelect = item.style.userSelect || 'none';
    item.style.touchAction = item.style.touchAction || 'none';
    item.addEventListener('pointerdown', startDrag);
  }

  const items = container.querySelectorAll('.item');
  items.forEach(attach);

  // If items added dynamically, observe and attach
  const mo = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.matches('.item')) attach(n);
        if (n.nodeType === 1) n.querySelectorAll && n.querySelectorAll('.item').forEach(attach);
      });
    });
  });
  mo.observe(container, { childList: true, subtree: true });

  // Mouse fallback for environments that dispatch only mouse events (Cypress, old browsers)
  let mouseActive = false;
  function onMouseDown(e) {
    // Find nearest item under the event target (in case event dispatched on child)
    const it = e.target.closest && e.target.closest('.item');
    if (!it) return;
    // synthesize a pointer-like object and call startDrag
    // create a small wrapper to emulate pointerId & clientX/Y
    const fake = {
      pointerType: 'mouse',
      button: e.button,
      pointerId: 1,
      clientX: e.clientX,
      clientY: e.clientY,
      currentTarget: it,
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation()
    };
    mouseActive = true;
    startDrag(fake);
  }
  function onMouseMove(e) {
    if (!mouseActive || !activeEl) return;
    const fake = {
      pointerId: activePointerId || 1,
      clientX: e.clientX,
      clientY: e.clientY
    };
    onPointerMove(fake);
  }
  function onMouseUp(e) {
    if (!mouseActive || !activeEl) return;
    const fake = {
      pointerId: activePointerId || 1
    };
    onPointerUp(fake);
    mouseActive = false;
  }
  document.addEventListener('mousedown', onMouseDown, { passive: false });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseup', onMouseUp, { passive: true });

})();
