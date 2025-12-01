// Your code here.
(() => {
  const container = document.querySelector('.items');
  if (!container) {
    console.warn('No .items element found');
    return;
  }

  // Make sure container is scrollable
  container.style.overflowX = container.style.overflowX || 'auto';
  container.style.overflowY = container.style.overflowY || 'hidden';
  container.style.touchAction = container.style.touchAction || 'none';
  container.style.userSelect = container.style.userSelect || 'none';

  // ---------- Item drag logic (pointer-based) ----------
  let dragEl = null, dragPointerId = null;
  let grabOffsetX = 0, grabOffsetY = 0;

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function startItemDrag(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();

    dragEl = e.currentTarget;
    dragPointerId = e.pointerId;

    const cRect = container.getBoundingClientRect();
    const elRect = dragEl.getBoundingClientRect();

    grabOffsetX = e.clientX - elRect.left;
    grabOffsetY = e.clientY - elRect.top;

    const left = elRect.left - cRect.left + container.scrollLeft;
    const top  = elRect.top  - cRect.top  + container.scrollTop;

    dragEl.style.position = 'absolute';
    dragEl.style.left = left + 'px';
    dragEl.style.top  = top  + 'px';
    dragEl.style.zIndex = 1000;
    dragEl.style.touchAction = 'none';
    try { dragEl.setPointerCapture(dragPointerId); } catch(e){}

    dragEl.addEventListener('pointermove', onItemPointerMove);
    dragEl.addEventListener('pointerup', onItemPointerUp);
    dragEl.addEventListener('pointercancel', onItemPointerUp);
  }

  function onItemPointerMove(e){
    if (!dragEl || e.pointerId !== dragPointerId) return;
    const cRect = container.getBoundingClientRect();
    const elRect = dragEl.getBoundingClientRect();

    let desiredLeft = e.clientX - cRect.left - grabOffsetX + container.scrollLeft;
    let desiredTop  = e.clientY - cRect.top  - grabOffsetY + container.scrollTop;

    // clamp so element stays fully inside container
    const maxLeft = Math.max(0, container.clientWidth - elRect.width);
    const maxTop  = Math.max(0, container.clientHeight - elRect.height);

    desiredLeft = clamp(desiredLeft, 0, maxLeft);
    desiredTop  = clamp(desiredTop,  0, maxTop);

    dragEl.style.left = desiredLeft + 'px';
    dragEl.style.top  = desiredTop + 'px';
  }

  function onItemPointerUp(e){
    if (!dragEl || e.pointerId !== dragPointerId) return;
    try { dragEl.releasePointerCapture && dragEl.releasePointerCapture(dragPointerId); } catch(e){}
    dragEl.removeEventListener('pointermove', onItemPointerMove);
    dragEl.removeEventListener('pointerup', onItemPointerUp);
    dragEl.removeEventListener('pointercancel', onItemPointerUp);
    // final clamp
    const elRect = dragEl.getBoundingClientRect();
    const left = clamp(parseFloat(dragEl.style.left)||0, 0, Math.max(0, container.clientWidth - elRect.width));
    const top  = clamp(parseFloat(dragEl.style.top)||0, 0, Math.max(0, container.clientHeight - elRect.height));
    dragEl.style.left = left + 'px';
    dragEl.style.top  = top + 'px';
    dragEl.style.zIndex = '';
    dragEl = null; dragPointerId = null;
  }

  container.querySelectorAll('.item').forEach(it => {
    it.style.touchAction = it.style.touchAction || 'none';
    it.addEventListener('pointerdown', startItemDrag);
  });

  // ---------- Container panning (responds to both pointer and synthetic mouse events) ----------
  let panning = false;
  let panStartPageX = 0, panStartPageY = 0;
  let panStartScrollLeft = 0, panStartScrollTop = 0;
  let activePointerId = null;

  function startPanFromEvent(e){
    // if event started over an item, don't pan (item drag should have stopped propagation)
    if (e.target.closest && e.target.closest('.item')) return false;

    // use pageX/pageY if available (Cypress sets pageX)
    const px = (e.pageX !== undefined) ? e.pageX : e.clientX;
    const py = (e.pageY !== undefined) ? e.pageY : e.clientY;

    // only primary mouse
    if (e.button !== undefined && e.button !== 0) return false;

    panning = true;
    panStartPageX = px;
    panStartPageY = py;
    panStartScrollLeft = container.scrollLeft;
    panStartScrollTop  = container.scrollTop;
    activePointerId = e.pointerId !== undefined ? e.pointerId : 'mouse';
    container.classList && container.classList.add('active');

    // attach move/up for pointer events or rely on window for mouse fallback
    if (e.type.startsWith('pointer')){
      try { container.setPointerCapture && container.setPointerCapture(activePointerId); } catch(e){}
      container.addEventListener('pointermove', onPointerPanMove);
      container.addEventListener('pointerup', onPointerPanUp);
      container.addEventListener('pointercancel', onPointerPanUp);
    }
    return true;
  }

  function onPointerPanMove(e){
    if (!panning) return;
    // prefer pageX/pageY
    const px = (e.pageX !== undefined) ? e.pageX : e.clientX;
    const dx = px - panStartPageX;
    const newScroll = panStartScrollLeft - dx;
    // clamp
    const clamped = Math.max(0, Math.min(newScroll, container.scrollWidth - container.clientWidth));
    if (container.scrollLeft !== clamped) container.scrollLeft = clamped;
  }

  function onPointerPanUp(e){
    if (!panning) return;
    panning = false;
    try { container.releasePointerCapture && container.releasePointerCapture(activePointerId); } catch(e){}
    container.classList && container.classList.remove('active');
    container.removeEventListener('pointermove', onPointerPanMove);
    container.removeEventListener('pointerup', onPointerPanUp);
    container.removeEventListener('pointercancel', onPointerPanUp);
    activePointerId = null;
  }

  // Pointer handlers (real user / some Cypress setups)
  container.addEventListener('pointerdown', (e) => {
    startPanFromEvent(e);
    // prevent default to ensure synthetic events are handled consistently
    e.preventDefault();
  }, { passive: false });

  // Mouse fallback for Cypress synthetic events (which often use mouse events with pageX/pageY)
  let mouseMoveHandler = null, mouseUpHandler = null;
  container.addEventListener('mousedown', (e) => {
    // If started on .item, item handler stops propagation - this will not run
    const started = startPanFromEvent(e);
    if (!started) return;
    // attach window-level handlers to catch synthetic mousemove/mouseup
    mouseMoveHandler = function(ev){ if (!panning) return; const px = (ev.pageX!==undefined)?ev.pageX:ev.clientX; const dx = px - panStartPageX; const newScroll = panStartScrollLeft - dx; const clamped = Math.max(0, Math.min(newScroll, container.scrollWidth - container.clientWidth)); if (container.scrollLeft !== clamped) container.scrollLeft = clamped; };
    mouseUpHandler = function(ev){ if (!panning) return; panning = false; container.classList && container.classList.remove('active'); window.removeEventListener('mousemove', mouseMoveHandler); window.removeEventListener('mouseup', mouseUpHandler); mouseMoveHandler = null; mouseUpHandler = null; };
    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', mouseUpHandler);
    e.preventDefault();
  }, { passive: false });

  // A tiny helper you can call from DevTools/Cypress to check bounding rect / scroll values
  window.__itemsDebug = () => {
    const r = container.getBoundingClientRect();
    console.log('rect', r, 'scrollLeft', container.scrollLeft, 'scrollWidth', container.scrollWidth, 'clientWidth', container.clientWidth);
    return { rect: r, scrollLeft: container.scrollLeft, scrollWidth: container.scrollWidth, clientWidth: container.clientWidth };
  };

  // Prevent native dragstart
  container.addEventListener('dragstart', e => e.preventDefault());
})();
