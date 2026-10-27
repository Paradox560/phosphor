/** Physical rotary faces backed by native, keyboard-accessible range inputs. */
export function initRotaryControls(root = document) {
  const help = document.createElement('span');
  help.id = 'rotary-instructions';
  help.className = 'visually-hidden';
  help.textContent = 'Drag up or right to increase; down or left to decrease. Arrow keys adjust the value. Home and End select the minimum and maximum.';
  root.body.append(help);

  root.querySelectorAll('.rotary-control[data-knob]').forEach(control => {
    const input = document.getElementById(control.dataset.knob);
    const face = control.querySelector('.dial-face');
    if (!input || !face) return;
    input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), help.id].filter(Boolean).join(' '));
    const min = Number(input.min), max = Number(input.max), step = Number(input.step) || 1;
    let drag = null;

    function sync() {
      const ratio = Math.max(0, Math.min(1, (Number(input.value) - min) / (max - min)));
      control.style.setProperty('--knob-angle', `${(-135 + ratio * 270).toFixed(2)}deg`);
      const label = document.querySelector(`label[for="${input.id}"]`);
      face.title = `${label?.textContent.trim() || input.id}: ${input.value}. Drag to adjust.`;
    }

    function setValue(value) {
      const snapped = min + Math.round((value - min) / step) * step;
      const next = Math.max(min, Math.min(max, snapped));
      const previous = input.value;
      input.value = String(Number(next.toFixed(6)));
      if (input.value !== previous) input.dispatchEvent(new Event('input', {bubbles:true}));
      sync();
    }

    face.addEventListener('pointerdown', event => {
      if (drag || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      input.focus({preventScroll:true});
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, value:Number(input.value)};
      face.setPointerCapture(event.pointerId);
      control.dataset.dragging = 'true';
    });
    face.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const distance = (event.clientX - drag.x) - (event.clientY - drag.y);
      setValue(drag.value + distance / 220 * (max - min));
    });
    function finish(event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      delete control.dataset.dragging;
      if (face.hasPointerCapture(event.pointerId)) face.releasePointerCapture(event.pointerId);
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }
    face.addEventListener('pointerup', finish);
    face.addEventListener('pointercancel', finish);
    face.addEventListener('lostpointercapture', event => {
      if (drag?.id === event.pointerId) {drag = null;delete control.dataset.dragging;}
    });
    face.addEventListener('wheel', event => {
      if (document.activeElement !== input || event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      setValue(Number(input.value) + (event.deltaY < 0 ? step : -step));
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }, {passive:false});
    input.addEventListener('input', sync);
    sync();
  });
}
