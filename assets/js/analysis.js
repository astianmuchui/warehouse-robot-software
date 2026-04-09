
(function () {
  'use strict';

  const DEVICE_ID = window.SGG_DEVICE_ID || 'WRBT202642';

  
  
  
  

  const AQ_BANDS = [
    { max: 100,      label: 'Excellent',  color: '#22c55e', desc: 'Clean air — negligible pollutants' },
    { max: 200,      label: 'Good',       color: '#84cc16', desc: 'Good air quality — safe for all occupants' },
    { max: 400,      label: 'Moderate',   color: '#eab308', desc: 'Trace NH₃ / CO₂ detected — ensure ventilation' },
    { max: 600,      label: 'Poor',       color: '#f97316', desc: 'Elevated NH₃ or smoke — investigate source' },
    { max: 1000,     label: 'Very Poor',  color: '#ef4444', desc: 'High NH₃ / CO / smoke — ventilate immediately' },
    { max: Infinity, label: 'Hazardous',  color: '#dc2626', desc: 'Dangerous concentration — evacuate area' },
  ];

  function aqBand(ppm) {
    return AQ_BANDS.find(b => ppm <= b.max) ?? AQ_BANDS[AQ_BANDS.length - 1];
  }

  

  const chartCfg = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } },
        grid:  { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid:  { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

  function line(label, color, data, dashed = false) {
    return {
      label,
      data,
      borderColor:     color,
      backgroundColor: dashed ? 'transparent' : color + '18',
      borderWidth:     dashed ? 1 : 1.5,
      borderDash:      dashed ? [5, 5] : [],
      fill:            !dashed,
      tension:         0.3,
      pointRadius:     0,
    };
  }

  const charts = {};

  function makeOrUpdate(id, datasets, labels) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (charts[id]) {
      charts[id].data.labels   = labels;
      charts[id].data.datasets = datasets;
      charts[id].update('none');
      return;
    }
    charts[id] = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: chartCfg,
    });
  }

  

  function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
  function max(arr) { return arr.length ? Math.max(...arr) : null; }

  function updateStats(pts) {
    const temps = pts.map(p => p.temp_c).filter(v => v != null);
    const hums  = pts.map(p => p.humidity_pct).filter(v => v != null);
    const aqs   = pts.map(p => p.air_quality_ppm).filter(v => v != null && v >= 0);

    const avgTemp = avg(temps);
    const maxTemp = max(temps);
    const avgHum  = avg(hums);
    const avgAQ   = avg(aqs);
    const peakAQ  = max(aqs);

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

  

  async function loadData() {
    const hours = document.getElementById('hours-select')?.value || 24;
    const res   = await fetch(`/api/v1/telemetry/history?device_id=${DEVICE_ID}&hours=${hours}`);
    if (!res.ok) return;
    const json = await res.json();
    const pts  = json.data || [];

    const labels = pts.map(p => new Date(p.t).toLocaleTimeString());

    updateStats(pts);

    
    makeOrUpdate('chart-env', [
      line('Temp (°C)',    '#38bdf8', pts.map(p => p.temp_c)),
      line('Humidity (%)', '#a78bfa', pts.map(p => p.humidity_pct)),
    ], labels);

    
    const n = labels.length;
    makeOrUpdate('chart-aq', [
      line('Air Quality (ppm)',    '#34d399', pts.map(p => p.air_quality_ppm)),
      line('Good → 200 ppm',       '#84cc16', Array(n).fill(200),  true),
      line('Moderate → 400 ppm',   '#eab308', Array(n).fill(400),  true),
      line('Poor → 600 ppm',       '#f97316', Array(n).fill(600),  true),
      line('Hazardous → 1000 ppm', '#dc2626', Array(n).fill(1000), true),
    ], labels);

    
    makeOrUpdate('chart-accel', [
      line('Accel X', '#f87171', pts.map(p => p.accel_x)),
      line('Accel Y', '#fb923c', pts.map(p => p.accel_y)),
      line('Accel Z', '#fbbf24', pts.map(p => p.accel_z)),
    ], labels);

    makeOrUpdate('chart-gyro', [
      line('Gyro X', '#60a5fa', pts.map(p => p.gyro_x)),
      line('Gyro Y', '#818cf8', pts.map(p => p.gyro_y)),
      line('Gyro Z', '#c084fc', pts.map(p => p.gyro_z)),
    ], labels);

    
    makeOrUpdate('chart-dist', [
      line('Distance (cm)', '#2dd4bf', pts.map(p => p.distance_cm)),
    ], labels);
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('hours-select')?.addEventListener('change', loadData);
    document.getElementById('refresh-btn')?.addEventListener('click',  loadData);
  });

})();
