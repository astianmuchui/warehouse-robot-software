/* SGG Warehouse Robot — Thresholds page JS */

(function () {
  'use strict';

  const DEVICE_ID = window.SGG_DEVICE_ID || 'WRBT202642';

  

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('threshold-form');
    const msg  = document.getElementById('form-msg');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));

      const body = {
        device_id: DEVICE_ID,
        metric:    data.metric,
        label:     data.label || data.metric,
      };

      if (data.min_value !== '') body.min_value = parseFloat(data.min_value);
      if (data.max_value !== '') body.max_value = parseFloat(data.max_value);

      try {
        const res = await fetch('/api/v1/thresholds', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });

        if (res.ok) {
          showMsg(msg, '✓ Threshold added — reload to see it', 'text-emerald-400');
          form.reset();
          setTimeout(() => location.reload(), 800);
        } else {
          const err = await res.json();
          showMsg(msg, 'Error: ' + (err.error || res.status), 'text-red-400');
        }
      } catch (e) {
        showMsg(msg, 'Network error: ' + e.message, 'text-red-400');
      }
    });

    
    document.querySelectorAll('.toggle-enabled').forEach(checkbox => {
      checkbox.addEventListener('change', async function () {
        const id = this.dataset.id;
        await fetch(`/api/v1/thresholds/${id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ enabled: this.checked }),
        });
      });
    });

    
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async function () {
        const id = this.dataset.id;
        if (!confirm('Delete this threshold?')) return;
        const res = await fetch(`/api/v1/thresholds/${id}`, { method: 'DELETE' });
        if (res.ok) {
          this.closest('.threshold-row')?.remove();
        }
      });
    });
  });

  function showMsg(el, text, cls) {
    if (!el) return;
    el.textContent  = text;
    el.className    = `mt-2 text-xs ${cls}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }

})();
