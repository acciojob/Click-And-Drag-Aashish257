// Your code here.
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.items');
    if (!container) return;

    if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
    }

    let draggingEl = null;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const items = container.querySelectorAll('.item');
    items.forEach(item => {
        item.style.touchAction = 'none';
        item.style.userSelect = 'none';
        item.addEventListener('pointerdown', onPointerDown);
    });

    function onPointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        draggingEl = e.currentTarget;
        pointerId = e.pointerId;
        draggingEl.setPointerCapture(pointerId);

        draggingEl.style.zIndex = 1000;
        draggingEl.style.transform = 'none'; 
        draggingEl.style.cursor = 'grabbing';

        const containerRect = container.getBoundingClientRect();
        const elRect = draggingEl.getBoundingClientRect();

        initialLeft = elRect.left - containerRect.left + container.scrollLeft;
        initialTop = elRect.top - containerRect.top + container.scrollTop;

        draggingEl.style.position = 'absolute';
        draggingEl.style.left = `${initialLeft}px`;
        draggingEl.style.top = `${initialTop}px`;
        draggingEl.style.margin = 0; 

        startX = e.clientX;
        startY = e.clientY;

        draggingEl.addEventListener('pointermove', onPointerMove);
        draggingEl.addEventListener('pointerup', onPointerUp);
        draggingEl.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
        if (!draggingEl || e.pointerId !== pointerId) return;
        e.preventDefault();

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const elRect = draggingEl.getBoundingClientRect();
        const maxLeft = container.clientWidth - elRect.width;
        const maxTop = container.clientHeight - elRect.height;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        draggingEl.style.left = `${newLeft}px`;
        draggingEl.style.top = `${newTop}px`;
    }

    function onPointerUp(e) {
        if (!draggingEl || e.pointerId !== pointerId) return;

        draggingEl.style.zIndex = '';
        draggingEl.style.cursor = '';
        
        draggingEl.removeEventListener('pointermove', onPointerMove);
        draggingEl.removeEventListener('pointerup', onPointerUp);
        draggingEl.removeEventListener('pointercancel', onPointerUp);
        draggingEl.releasePointerCapture(pointerId);

        draggingEl = null;
        pointerId = null;
    }
});