/* global Highcharts */
(function () {
  'use strict';

  const DEVICE_ID = window.SGG_DEVICE_ID || 'WRBT202642';

  // ── Air quality bands ─────────────────────────────────────────────────────

  const AQ_BANDS = [
    { max: 100,      label: 'Excellent', color: '#22c55e', desc: 'Clean air — negligible pollutants' },
    { max: 200,      label: 'Good',      color: '#84cc16', desc: 'Good air quality — safe for all occupants' },
    { max: 400,      label: 'Moderate',  color: '#eab308', desc: 'Trace NH₃ / CO₂ detected — ensure ventilation' },
    { max: 600,      label: 'Poor',      color: '#f97316', desc: 'Elevated NH₃ or smoke — investigate source' },
    { max: 1000,     label: 'Very Poor', color: '#ef4444', desc: 'High NH₃ / CO / smoke — ventilate immediately' },
    { max: Infinity, label: 'Hazardous', color: '#dc2626', desc: 'Dangerous concentration — evacuate area' },
  ];

  function aqBand(ppm) {
    return AQ_BANDS.find(b => ppm <= b.max) ?? AQ_BANDS[AQ_BANDS.length - 1];
  }

  // ── Highcharts global dark theme ──────────────────────────────────────────

  Highcharts.setOptions({
    chart: {
      backgroundColor: 'transparent',
      plotBorderColor: 'transparent',
      style: { fontFamily: "'Outfit', sans-serif" },
    },
    title:    { text: null },
    subtitle: { text: null },
    xAxis: {
      type: 'datetime',
      gridLineColor: 'rgba(255,255,255,0.04)',
      lineColor:     'rgba(255,255,255,0.06)',
      tickColor:     'rgba(255,255,255,0.06)',
      labels: { style: { color: '#64748b', fontSize: '10px' } },
    },
    yAxis: {
      gridLineColor: 'rgba(255,255,255,0.04)',
      lineColor:     'rgba(255,255,255,0.06)',
      tickColor:     'rgba(255,255,255,0.06)',
      labels: { style: { color: '#64748b', fontSize: '10px' } },
      title: { text: null },
    },
    tooltip: {
      backgroundColor: 'rgba(10,13,20,0.92)',
      borderColor:     'rgba(255,255,255,0.08)',
      borderRadius:    10,
      style:           { color: '#f1f5f9', fontSize: '12px' },
      shared:          true,
      xDateFormat:     '%Y-%m-%d %H:%M:%S',
    },
    legend: {
      itemStyle:       { color: '#94a3b8', fontSize: '11px', fontWeight: '400' },
      itemHoverStyle:  { color: '#f1f5f9' },
      itemHiddenStyle: { color: '#374151' },
      layout:          'horizontal',
      align:           'center',
      verticalAlign:   'bottom',
      symbolRadius:    4,
    },
    plotOptions: {
      line: {
        lineWidth: 1.5,
        marker:    { enabled: false },
        states:    { hover: { lineWidth: 2 } },
      },
      area: {
        lineWidth:   1.5,
        marker:      { enabled: false },
        fillOpacity: 0.12,
        states:      { hover: { lineWidth: 2 } },
      },
    },
    credits: { enabled: false },
    exporting: {
      enabled: true,
      fallbackToExportServer: false,
      menuItemDefinitions: {
        viewFullscreen: { text: 'Fullscreen' },
      },
      buttons: {
        contextButton: {
          symbolStroke:      '#64748b',
          symbolStrokeWidth: 1.5,
          menuItems: [
            'viewFullscreen', 'separator',
            'downloadPNG', 'downloadSVG', 'downloadPDF',
            'separator',
            'downloadCSV', 'downloadXLS',
          ],
          theme: {
            fill:   'rgba(255,255,255,0.04)',
            stroke: 'rgba(255,255,255,0.08)',
            r:      6,
            states: {
              hover:   { fill: 'rgba(255,255,255,0.08)' },
              select:  { fill: 'rgba(255,255,255,0.08)' },
            },
          },
        },
      },
    },
  });

  // ── Loader helpers ────────────────────────────────────────────────────────

  const LOADER_IDS = ['loader-env', 'loader-aq', 'loader-accel', 'loader-gyro', 'loader-dist'];

  function showLoaders() {
    LOADER_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('fading', 'gone');
    });
  }

  function hideLoaders() {
    LOADER_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('fading');
      setTimeout(() => el.classList.add('gone'), 280);
    });
  }

  // ── Chart registry ────────────────────────────────────────────────────────

  const charts = {};

  const BASE_CHART_OPTIONS = {
    chart: {
      height:    '100%',
      zoomType:  'x',
      zooming: {
        type: 'x',
        resetButton: {
          theme: {
            fill:   'rgba(255,255,255,0.06)',
            stroke: 'rgba(255,255,255,0.10)',
            style:  { color: '#94a3b8', fontSize: '11px' },
            r:      6,
            states: { hover: { fill: 'rgba(255,255,255,0.10)' } },
          },
        },
      },
      panning:   { enabled: true, type: 'x' },
      panKey:    'shift',
      animation: { duration: 400 },
    },
    xAxis: { type: 'datetime' },
  };

  function makeChart(id, series, extra = {}) {
    if (charts[id]) { charts[id].destroy(); }
    const el = document.getElementById(id);
    if (!el) return;

    // Deep merge base options + overrides
    const cfg = {
      ...BASE_CHART_OPTIONS,
      chart: { ...BASE_CHART_OPTIONS.chart, ...(extra.chart || {}) },
      xAxis: { ...BASE_CHART_OPTIONS.xAxis, ...(extra.xAxis || {}) },
      series,
    };
    if (extra.yAxis) cfg.yAxis = extra.yAxis;
    if (extra.tooltip) cfg.tooltip = extra.tooltip;

    charts[id] = Highcharts.chart(id, cfg);
  }

  // ── Series builder helpers ────────────────────────────────────────────────

  function hcLine(name, color, pts, key) {
    return {
      type:  'line',
      name,
      color,
      data:  pts.map(p => [new Date(p.t).getTime(), p[key] ?? null]),
    };
  }

  function hcArea(name, color, pts, key) {
    return {
      type:  'area',
      name,
      color,
      data:  pts.map(p => [new Date(p.t).getTime(), p[key] ?? null]),
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [[0, color + '28'], [1, color + '02']],
      },
    };
  }

  // ── Stats row ─────────────────────────────────────────────────────────────

  function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
  function maxOf(arr) { return arr.length ? Math.max(...arr) : null; }

  function updateStats(pts) {
    const temps = pts.map(p => p.temp_c).filter(v => v != null);
    const hums  = pts.map(p => p.humidity_pct).filter(v => v != null);
    const aqs   = pts.map(p => p.air_quality_ppm).filter(v => v != null && v >= 0);

    const avgTemp = avg(temps);
    const maxTemp = maxOf(temps);
    const avgHum  = avg(hums);
    const avgAQ   = avg(aqs);
    const peakAQ  = maxOf(aqs);

    setText('stat-temp-avg', avgTemp != null ? avgTemp.toFixed(1) + ' °C' : '—');
    setText('stat-temp-max', maxTemp != null ? maxTemp.toFixed(1) + ' °C' : '—');
    setText('stat-hum-avg',  avgHum  != null ? avgHum.toFixed(1)  + ' %'  : '—');
    setText('stat-aq-avg',   avgAQ   != null ? avgAQ.toFixed(0)   + ' ppm': '—');
    setText('stat-aq-peak',  peakAQ  != null ? peakAQ.toFixed(0)  + ' ppm': '—');

    if (peakAQ != null) {
      const b  = aqBand(peakAQ);
      const el = document.getElementById('stat-aq-class');
      if (el) { el.textContent = b.label; el.style.color = b.color; }
    }

    if (avgAQ != null) renderGauge(avgAQ);
    if (aqs.length)    renderZones(aqs);
  }

  function renderGauge(ppm) {
    const MAX_PPM = 1200;
    const pct     = Math.min(ppm / MAX_PPM * 100, 100).toFixed(1);
    const b       = aqBand(ppm);

    const marker = document.getElementById('aq-gauge-marker');
    const label  = document.getElementById('aq-gauge-label');
    const desc   = document.getElementById('aq-gauge-desc');
    const val    = document.getElementById('aq-gauge-val');

    if (marker) marker.style.left = pct + '%';
    if (label)  { label.textContent = b.label; label.style.color = b.color; }
    if (desc)   desc.textContent = b.desc;
    if (val)    { val.textContent = ppm.toFixed(0) + ' ppm'; val.style.color = b.color; }
  }

  function renderZones(aqs) {
    const buckets = AQ_BANDS.map(b => ({ ...b, count: 0 }));
    for (const ppm of aqs) {
      const b = buckets.find(bk => ppm <= bk.max);
      if (b) b.count++;
    }
    const total = aqs.length;
    const el    = document.getElementById('aq-zones');
    if (!el) return;
    el.innerHTML = buckets.map(z => {
      const pct = (z.count / total * 100).toFixed(1);
      return `
        <div class="flex items-center gap-3 text-xs">
          <span class="w-20 shrink-0 font-medium" style="color:${z.color}">${z.label}</span>
          <div class="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%;background:${z.color}"></div>
          </div>
          <span class="w-10 text-right font-mono text-slate-400">${pct}%</span>
          <span class="w-14 text-right font-mono text-slate-600">${z.count} pts</span>
        </div>`;
    }).join('');
  }

  // ── Total count ───────────────────────────────────────────────────────────

  async function loadTotalCount() {
    try {
      const res = await fetch(`/api/v1/telemetry/count?device_id=${DEVICE_ID}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.count != null) setText('stat-total-readings', json.count.toLocaleString());
    } catch (e) {
      console.warn('count fetch error', e);
    }
  }

  // ── Main data load ────────────────────────────────────────────────────────

  function buildHistoryQuery() {
    const params = new URLSearchParams({ device_id: DEVICE_ID });
    const start = document.getElementById('range-start')?.value || '';
    const end   = document.getElementById('range-end')?.value || '';
    const hoursSel = document.getElementById('hours-select');
    if (start || end) {
      if (start) params.set('start', start);
      if (end)   params.set('end',   end);
      if (hoursSel) hoursSel.disabled = true;
    } else {
      if (hoursSel) hoursSel.disabled = false;
      params.set('hours', hoursSel?.value || '24');
    }
    return params.toString();
  }

  async function loadData() {
    showLoaders();
    try {
      const qs    = buildHistoryQuery();
      const res   = await fetch(`/api/v1/telemetry/history?${qs}`);
      if (!res.ok) return;
      const json  = await res.json();
      const pts   = json.data || [];

      updateStats(pts);

      // Temperature & Humidity
      makeChart('chart-env', [
        hcArea('Temp (°C)',    '#38bdf8', pts, 'temp_c'),
        hcArea('Humidity (%)', '#a78bfa', pts, 'humidity_pct'),
      ]);

      // Air Quality with threshold plot lines
      makeChart('chart-aq', [
        hcArea('Air Quality (ppm)', '#34d399', pts, 'air_quality_ppm'),
      ], {
        yAxis: {
          gridLineColor: 'rgba(255,255,255,0.04)',
          labels: { style: { color: '#64748b', fontSize: '10px' } },
          title: { text: null },
          plotLines: [
            { value: 200,  color: '#84cc16', width: 1, dashStyle: 'ShortDash', label: { text: 'Good 200', align: 'right', style: { color: '#84cc16', fontSize: '10px' } } },
            { value: 400,  color: '#eab308', width: 1, dashStyle: 'ShortDash', label: { text: 'Moderate 400', align: 'right', style: { color: '#eab308', fontSize: '10px' } } },
            { value: 600,  color: '#f97316', width: 1, dashStyle: 'ShortDash', label: { text: 'Poor 600', align: 'right', style: { color: '#f97316', fontSize: '10px' } } },
            { value: 1000, color: '#dc2626', width: 1, dashStyle: 'ShortDash', label: { text: 'Hazardous 1000', align: 'right', style: { color: '#dc2626', fontSize: '10px' } } },
          ],
        },
      });

      // Accelerometer
      makeChart('chart-accel', [
        hcLine('Accel X', '#f87171', pts, 'accel_x'),
        hcLine('Accel Y', '#fb923c', pts, 'accel_y'),
        hcLine('Accel Z', '#fbbf24', pts, 'accel_z'),
      ]);

      // Gyroscope
      makeChart('chart-gyro', [
        hcLine('Gyro X', '#60a5fa', pts, 'gyro_x'),
        hcLine('Gyro Y', '#818cf8', pts, 'gyro_y'),
        hcLine('Gyro Z', '#c084fc', pts, 'gyro_z'),
      ]);

      // Proximity
      makeChart('chart-dist', [
        hcArea('Distance (cm)', '#2dd4bf', pts, 'distance_cm'),
      ]);

    } catch (e) {
      console.warn('analysis loadData error', e);
    } finally {
      hideLoaders();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadTotalCount();
    document.getElementById('hours-select')?.addEventListener('change', loadData);
    document.getElementById('refresh-btn')?.addEventListener('click',  loadData);
    document.getElementById('range-start')?.addEventListener('change', loadData);
    document.getElementById('range-end')?.addEventListener('change',   loadData);
    document.getElementById('range-clear')?.addEventListener('click', () => {
      const s = document.getElementById('range-start');
      const e = document.getElementById('range-end');
      if (s) s.value = '';
      if (e) e.value = '';
      loadData();
    });
  });

})();
