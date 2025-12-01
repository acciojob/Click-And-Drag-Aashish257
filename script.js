// Your code here.
// Draggable cubes using Pointer Events
(() => {
  const container = document.querySelector('.items');
  if (!container) return;

  // make sure container is positioned so absolute children are contained
  const containerStyle = getComputedStyle(container);
  if (containerStyle.position === 'static') {
    container.style.position = 'relative';
  }

  let draggingEl = null;
  let pointerId = null;
  let offsetX = 0; // pointer offset inside element
  let offsetY = 0;
  let startLeft = 0;
  let startTop = 0;

  // Utility: clamp value between min and max
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // When pointer goes down on an item
  function onPointerDown(e) {
    // only left button for mouse (button === 0) — pointerdown for touch has button === 0 too
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const el = e.currentTarget;
    draggingEl = el;
    pointerId = e.pointerId;

    // bring to front while dragging
    el.style.zIndex = 1000;

    // Get bounding rects
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Convert element to absolute positioned inside container while keeping current visual position
    // Compute left/top relative to container
    const left = elRect.left - containerRect.left + container.scrollLeft;
    const top = elRect.top - containerRect.top + container.scrollTop;

    // Set absolute positioning
    el.style.position = 'absolute';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.touchAction = 'none'; // prevent scrolling while dragging

    startLeft = left;
    startTop = top;

    // pointer offset inside element (so mouse cursor stays at same relative point)
    offsetX = e.clientX - elRect.left;
    offsetY = e.clientY - elRect.top;

    // capture the pointer to this element so pointermove/up still fire even if cursor leaves element
    el.setPointerCapture(pointerId);

    // listen for pointermove and pointerup on the element itself
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
  }

  // While pointer moves
  function onPointerMove(e) {
    if (!draggingEl || e.pointerId !== pointerId) return;

    const containerRect = container.getBoundingClientRect();
    const el = draggingEl;
    const elRect = el.getBoundingClientRect();

    // desired left/top relative to container
    let desiredLeft = e.clientX - containerRect.left - offsetX + container.scrollLeft;
    let desiredTop  = e.clientY - containerRect.top  - offsetY + container.scrollTop;

    // boundaries (keep entire element inside container)
    const elWidth  = elRect.width;
    const elHeight = elRect.height;
    const minLeft = 0;
    const minTop  = 0;
    const maxLeft = container.clientWidth - elWidth;
    const maxTop  = container.clientHeight - elHeight;

    // clamp
    desiredLeft = clamp(desiredLeft, minLeft, Math.max(minLeft, maxLeft));
    desiredTop  = clamp(desiredTop,  minTop,  Math.max(minTop, maxTop));

    // apply (smooth movement achieved by setting directly; you can add CSS transition for easing if wanted)
    el.style.left = desiredLeft + 'px';
    el.style.top  = desiredTop + 'px';
  }

  // When pointer is released or cancelled
  function onPointerUp(e) {
    if (!draggingEl || e.pointerId !== pointerId) return;

    const el = draggingEl;

    // release capture and remove listeners
    try { el.releasePointerCapture(pointerId); } catch (err) {}
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);

    // drop: ensure inside bounds again (safety)
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const elWidth  = elRect.width;
    const elHeight = elRect.height;

    let left = parseFloat(el.style.left) || 0;
    let top  = parseFloat(el.style.top)  || 0;
    const maxLeft = container.clientWidth - elWidth;
    const maxTop  = container.clientHeight - elHeight;
    left = clamp(left, 0, Math.max(0, maxLeft));
    top  = clamp(top,  0, Math.max(0, maxTop));
    el.style.left = left + 'px';
    el.style.top  = top  + 'px';

    // reset z-index
    el.style.zIndex = '';

    // clear
    draggingEl = null;
    pointerId = null;
  }

  // Attach pointerdown to all current and future .item elements inside container
  function attachHandlersToItem(item) {
    // prevent default dragging image behavior
    item.style.userSelect = 'none';
    item.addEventListener('pointerdown', onPointerDown);
  }

  // Initialize: attach to existing items
  const items = container.querySelectorAll('.item');
  items.forEach(attachHandlersToItem);

  // If items can be added dynamically, you could use a MutationObserver to auto-attach.
  // Example (optional):
  const mo = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && n.matches('.item')) attachHandlersToItem(n);
        // also handle if a subtree contains items
        if (n.nodeType === 1) {
          n.querySelectorAll && n.querySelectorAll('.item').forEach(attachHandlersToItem);
        }
      }
    }
  });
  mo.observe(container, { childList: true, subtree: true });

})();
