// Your code here.
(() => {
  const container = document.querySelector('.items');
  if (!container) return;

  // Ensure container has expected interaction behaviour
  container.style.touchAction = container.style.touchAction || 'none';
  container.style.userSelect = container.style.userSelect || 'none';

  // ---------- Utilities ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Helper: get container rect and scroll offsets
  function getContainerInfo() {
    const rect = container.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    };
  }

  // ---------- ITEM DRAG ----------
  let draggingEl = null;
  let dragPointerId = null;
  let grabOffsetX = 0, grabOffsetY = 0;

  function onItemPointerDown(e) {
    // Only primary button for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Prevent container panning
    e.stopPropagation();
    e.preventDefault();

    draggingEl = e.currentTarget;
    dragPointerId = e.pointerId;

    // compute offset where pointer is inside the element
    const containerInfo = getContainerInfo();
    const elRect = draggingEl.getBoundingClientRect();

    // pointer offset inside element (relative to element top-left in viewport)
    grabOffsetX = e.clientX - elRect.left;
    grabOffsetY = e.clientY - elRect.top;

    // compute left/top relative to container content area (account for scroll)
    const left = elRect.left - containerInfo.left + containerInfo.scrollLeft;
    const top  = elRect.top  - containerInfo.top  + containerInfo.scrollTop;

    // switch to absolute positioning while preserving current visual position
    draggingEl.style.position = 'absolute';
    draggingEl.style.left = left + 'px';
    draggingEl.style.top  = top  + 'px';
    draggingEl.style.zIndex = 1000;
    draggingEl.style.touchAction = 'none';
    draggingEl.style.cursor = 'grabbing';

    // capture pointer for robust events
    try { draggingEl.setPointerCapture(dragPointerId); } catch (err) {}

    draggingEl.addEventListener('pointermove', onItemPointerMove);
    draggingEl.addEventListener('pointerup', onItemPointerUp);
    draggingEl.addEventListener('pointercancel', onItemPointerUp);
  }

  function onItemPointerMove(e) {
    if (!draggingEl || e.pointerId !== dragPointerId) return;
    const containerInfo = getContainerInfo();
    const elRect = draggingEl.getBoundingClientRect();

    // desired left / top relative to container content (include scroll)
    let desiredLeft = e.clientX - containerInfo.left - grabOffsetX + containerInfo.scrollLeft;
    let desiredTop  = e.clientY - containerInfo.top  - grabOffsetY + containerInfo.scrollTop;

    // Because your CSS scales height/width (item height uses calc(100% - 40px)),
    // use the element's bounding width/height to clamp properly
    const elWidth = elRect.width;
    const elHeight = elRect.height;

    // clamp so entire element stays inside container
    desiredLeft = clamp(desiredLeft, 0, Math.max(0, container.clientWidth - elWidth));
    desiredTop  = clamp(desiredTop,  0, Math.max(0, container.clientHeight - elHeight));

    draggingEl.style.left = desiredLeft + 'px';
    draggingEl.style.top  = desiredTop + 'px';
  }

  function onItemPointerUp(e) {
    if (!draggingEl || e.pointerId !== dragPointerId) return;

    try { draggingEl.releasePointerCapture && draggingEl.releasePointerCapture(dragPointerId); } catch (err) {}

    draggingEl.removeEventListener('pointermove', onItemPointerMove);
    draggingEl.removeEventListener('pointerup', onItemPointerUp);
    draggingEl.removeEventListener('pointercancel', onItemPointerUp);

    // final clamping (safety)
    const elRect = draggingEl.getBoundingClientRect();
    const left = clamp(parseFloat(draggingEl.style.left) || 0, 0, Math.max(0, container.clientWidth - elRect.width));
    const top  = clamp(parseFloat(draggingEl.style.top)  || 0, 0, Math.max(0, container.clientHeight - elRect.height));
    draggingEl.style.left = left + 'px';
    draggingEl.style.top  = top  + 'px';

    // restore pointer cursor and stacking
    draggingEl.style.zIndex = '';
    draggingEl.style.cursor = '';
    draggingEl = null;
    dragPointerId = null;
  }

  // Attach item handlers to existing items
  function attachItemHandlers(item) {
    item.style.touchAction = item.style.touchAction || 'none';
    item.style.userSelect = item.style.userSelect || 'none';
    item.addEventListener('pointerdown', onItemPointerDown);
  }
  container.querySelectorAll('.item').forEach(attachItemHandlers);

  // Watch for dynamically added items
  new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.matches('.item')) attachItemHandlers(n);
        if (n.nodeType === 1) n.querySelectorAll && n.querySelectorAll('.item').forEach(attachItemHandlers);
      });
    });
  }).observe(container, { childList: true, subtree: true });

  // ---------- CONTAINER PANNING (drag-to-scroll) ----------
  let isPanning = false;
  let panPointerId = null;
  let panStartX = 0, panStartY = 0;
  let panStartScrollLeft = 0, panStartScrollTop = 0;

  function onContainerPointerDown(e) {
    // don't start pan if pointerdown started on item (item handler stops propagation)
    if (e.target.closest && e.target.closest('.item')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    isPanning = true;
    panPointerId = e.pointerId;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartScrollLeft = container.scrollLeft;
    panStartScrollTop = container.scrollTop;

    // visual feedback using your CSS class
    container.classList.add('active');

    try { container.setPointerCapture(panPointerId); } catch (err) {}

    container.addEventListener('pointermove', onContainerPointerMove);
    container.addEventListener('pointerup', onContainerPointerUp);
    container.addEventListener('pointercancel', onContainerPointerUp);

    e.preventDefault();
  }

  function onContainerPointerMove(e) {
    if (!isPanning || e.pointerId !== panPointerId) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    // invert so content follows pointer movement
    container.scrollLeft = panStartScrollLeft - dx;
    container.scrollTop  = panStartScrollTop  - dy;
  }

  function onContainerPointerUp(e) {
    if (!isPanning || e.pointerId !== panPointerId) return;
    isPanning = false;
    panPointerId = null;

    try { container.releasePointerCapture && container.releasePointerCapture(e.pointerId); } catch (err) {}
    container.classList.remove('active');
    container.removeEventListener('pointermove', onContainerPointerMove);
    container.removeEventListener('pointerup', onContainerPointerUp);
    container.removeEventListener('pointercancel', onContainerPointerUp);
  }

  container.addEventListener('pointerdown', onContainerPointerDown);

  // ---------- MOUSE FALLBACK (for Cypress tests that trigger mouse events) ----------
  let mousePanning = false;
  let mouseStartX = 0, mouseStartY = 0;
  let mouseStartScrollLeft = 0, mouseStartScrollTop = 0;

  function onContainerMouseDown(e) {
    // ignore item start
    if (e.target.closest && e.target.closest('.item')) return;
    if (e.button !== 0) return;

    mousePanning = true;
    mouseStartX = e.pageX;
    mouseStartY = e.pageY;
    mouseStartScrollLeft = container.scrollLeft;
    mouseStartScrollTop = container.scrollTop;

    container.classList.add('active');
    window.addEventListener('mousemove', onContainerMouseMove);
    window.addEventListener('mouseup', onContainerMouseUp);
    e.preventDefault();
  }

  function onContainerMouseMove(e) {
    if (!mousePanning) return;
    const dx = e.pageX - mouseStartX;
    const dy = e.pageY - mouseStartY;
    container.scrollLeft = mouseStartScrollLeft - dx;
    container.scrollTop  = mouseStartScrollTop  - dy;
  }

  function onContainerMouseUp(e) {
    if (!mousePanning) return;
    mousePanning = false;
    container.classList.remove('active');
    window.removeEventListener('mousemove', onContainerMouseMove);
    window.removeEventListener('mouseup', onContainerMouseUp);
  }

  container.addEventListener('mousedown', onContainerMouseDown);

  // ---------- END ----------
  // Small safety: prevent native dragstart on images/text inside items
  container.addEventListener('dragstart', e => e.preventDefault());
})();
