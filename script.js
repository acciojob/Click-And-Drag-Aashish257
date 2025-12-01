// Your code here.
(() => {
  const container = document.querySelector('.items');
  if (!container) return;

  // Ensure container can scroll and position children absolutely when dragged
  const cs = getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';
  container.style.overflow = container.style.overflow || 'auto';
  container.style.touchAction = 'none'; // help with pointer behavior

  // ---------- Utility ----------
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

  // ---------- ITEM DRAG (as before) ----------
  let draggingEl = null;
  let pointerId = null;
  let offsetX = 0, offsetY = 0;

  function onItemPointerDown(e) {
    // only react to primary button for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Prevent container panning when dragging an item
    e.stopPropagation();

    const el = e.currentTarget;
    draggingEl = el;
    pointerId = e.pointerId;

    // bring forward
    el.style.zIndex = 1000;
    el.style.userSelect = 'none';
    el.style.touchAction = 'none';

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // convert to absolute positioned inside container (keep current appearance)
    const left = elRect.left - containerRect.left + container.scrollLeft;
    const top = elRect.top - containerRect.top + container.scrollTop;

    el.style.position = 'absolute';
    el.style.left = left + 'px';
    el.style.top = top + 'px';

    offsetX = e.clientX - elRect.left;
    offsetY = e.clientY - elRect.top;

    try { el.setPointerCapture(pointerId); } catch (err) {}

    el.addEventListener('pointermove', onItemPointerMove);
    el.addEventListener('pointerup', onItemPointerUp);
    el.addEventListener('pointercancel', onItemPointerUp);
  }

  function onItemPointerMove(e) {
    if (!draggingEl || e.pointerId !== pointerId) return;
    const el = draggingEl;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    let desiredLeft = e.clientX - containerRect.left - offsetX + container.scrollLeft;
    let desiredTop  = e.clientY - containerRect.top  - offsetY + container.scrollTop;

    const maxLeft = container.clientWidth - elRect.width;
    const maxTop  = container.clientHeight - elRect.height;

    desiredLeft = clamp(desiredLeft, 0, Math.max(0, maxLeft));
    desiredTop  = clamp(desiredTop,  0, Math.max(0, maxTop));

    el.style.left = desiredLeft + 'px';
    el.style.top  = desiredTop + 'px';
  }

  function onItemPointerUp(e) {
    if (!draggingEl || e.pointerId !== pointerId) return;
    const el = draggingEl;

    try { el.releasePointerCapture(pointerId); } catch (err) {}
    el.removeEventListener('pointermove', onItemPointerMove);
    el.removeEventListener('pointerup', onItemPointerUp);
    el.removeEventListener('pointercancel', onItemPointerUp);

    // clamp final position
    const elRect = el.getBoundingClientRect();
    const left = clamp(parseFloat(el.style.left) || 0, 0, Math.max(0, container.clientWidth - elRect.width));
    const top  = clamp(parseFloat(el.style.top)  || 0, 0, Math.max(0, container.clientHeight - elRect.height));
    el.style.left = left + 'px';
    el.style.top  = top + 'px';

    el.style.zIndex = '';
    draggingEl = null;
    pointerId = null;
  }

  function attachItemHandlers(item) {
    item.style.userSelect = 'none';
    item.addEventListener('pointerdown', onItemPointerDown);
  }

  container.querySelectorAll('.item').forEach(attachItemHandlers);

  // If items are added later
  new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1 && n.matches('.item')) attachItemHandlers(n);
        if (n.nodeType === 1) n.querySelectorAll && n.querySelectorAll('.item').forEach(attachItemHandlers);
      });
    });
  }).observe(container, { childList: true, subtree: true });

  // ---------- CONTAINER DRAG-TO-SCROLL (panning) ----------
  // This implements click-and-drag panning for the container itself.
  let isPanning = false;
  let panStartX = 0, panStartY = 0;
  let scrollStartX = 0, scrollStartY = 0;
  let activePanPointerId = null;

  function onContainerPointerDown(e) {
    // If the pointerdown happened on an .item (or inside), don't start container panning;
    // item handler will have called stopPropagation() and this won't run in that case.
    // However tests may directly target .items — allow panning then.
    if (e.target.closest && e.target.closest('.item')) {
      // precaution: if the event bubbled despite item handler, avoid panning
      return;
    }

    // only primary mouse button
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    isPanning = true;
    activePanPointerId = e.pointerId;
    panStartX = e.clientX;
    panStartY = e.clientY;
    scrollStartX = container.scrollLeft;
    scrollStartY = container.scrollTop;

    container.style.cursor = 'grabbing';
    try { container.setPointerCapture(activePanPointerId); } catch (err) {}

    container.addEventListener('pointermove', onContainerPointerMove);
    container.addEventListener('pointerup', onContainerPointerUp);
    container.addEventListener('pointercancel', onContainerPointerUp);
  }

  function onContainerPointerMove(e) {
    if (!isPanning || e.pointerId !== activePanPointerId) return;
    // delta
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;

    // move scroll opposite to mouse movement (drag content)
    container.scrollLeft = scrollStartX - dx;
    container.scrollTop  = scrollStartY - dy;
  }

  function onContainerPointerUp(e) {
    if (!isPanning || e.pointerId !== activePanPointerId) return;
    isPanning = false;
    try { container.releasePointerCapture(activePanPointerId); } catch (err) {}
    container.style.cursor = '';
    container.removeEventListener('pointermove', onContainerPointerMove);
    container.removeEventListener('pointerup', onContainerPointerUp);
    container.removeEventListener('pointercancel', onContainerPointerUp);
    activePanPointerId = null;
  }

  // Attach to container for pointer events
  container.addEventListener('pointerdown', onContainerPointerDown);

  // ---------- MOUSE EVENT FALLBACK for environments/tests that dispatch mouse events (Cypress) ----------
  // Cypress often uses mouse events like mousedown/mousemove/mouseup via trigger(). The pointer handlers above will usually still be executed
  // by the browser, but to be robust we also add a mouse fallback for container panning.
  let mousePanning = false;
  let mousePanStartX = 0, mousePanStartY = 0, mouseScrollStartX = 0, mouseScrollStartY = 0;

  function onContainerMouseDown(e) {
    // ignore if started on an item
    if (e.target.closest && e.target.closest('.item')) return;
    if (e.button !== 0) return;
    mousePanning = true;
    mousePanStartX = e.pageX;
    mousePanStartY = e.pageY;
    mouseScrollStartX = container.scrollLeft;
    mouseScrollStartY = container.scrollTop;
    container.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onContainerMouseMove);
    window.addEventListener('mouseup', onContainerMouseUp);
    e.preventDefault();
  }

  function onContainerMouseMove(e) {
    if (!mousePanning) return;
    const dx = e.pageX - mousePanStartX;
    const dy = e.pageY - mousePanStartY;
    container.scrollLeft = mouseScrollStartX - dx;
    container.scrollTop  = mouseScrollStartY - dy;
  }

  function onContainerMouseUp(e) {
    if (!mousePanning) return;
    mousePanning = false;
    container.style.cursor = '';
    window.removeEventListener('mousemove', onContainerMouseMove);
    window.removeEventListener('mouseup', onContainerMouseUp);
  }

  container.addEventListener('mousedown', onContainerMouseDown);

})();
