// Your code here.
  const slider = document.querySelector('.items');
  let isDown = false;
  let startX;
  let scrollLeft;

  // Mouse down: start dragging
  slider.addEventListener('mousedown', (e) => {
    // only left button (which = 1 in Cypress)
    if (e.which !== 1 && e.button !== 0) return;

    isDown = true;
    slider.classList.add('active');

    // starting mouse position relative to slider
    startX = e.pageX - slider.offsetLeft;
    // starting scroll position
    scrollLeft = slider.scrollLeft;
  });

  // Mouse leave: stop dragging
  slider.addEventListener('mouseleave', () => {
    isDown = false;
    slider.classList.remove('active');
  });

  // Mouse up: stop dragging
  slider.addEventListener('mouseup', () => {
    isDown = false;
    slider.classList.remove('active');
  });

  // Mouse move: while dragging, update scrollLeft
  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault(); // stop text selection etc.

    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 3; // scroll speed multiplier
    slider.scrollLeft = scrollLeft - walk;
  });