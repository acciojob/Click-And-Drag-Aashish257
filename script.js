// Your code here.
const slider = document.querySelector('.items');
let isDown = false;
let startX;
let scrollLeft;

slider.addEventListener('mousedown', (e) => {
  isDown = true;
  slider.classList.add('active');
  // Capture initial starting point
  startX = e.pageX - slider.offsetLeft;
  // Capture current scroll position
  scrollLeft = slider.scrollLeft;
});

slider.addEventListener('mouseleave', () => {
  isDown = false;
  slider.classList.remove('active');
});

slider.addEventListener('mouseup', () => {
  isDown = false;
  slider.classList.remove('active');
});

slider.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  
  // Calculate how far the mouse has moved
  const x = e.pageX - slider.offsetLeft;
  const walk = (x - startX) * 3; // Scroll speed multiplier
  
  // Update the scroll position of the container
  slider.scrollLeft = scrollLeft - walk;
});