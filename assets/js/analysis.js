
(function () {
  'use strict';

  const DEVICE_ID = window.SGG_DEVICE_ID || 'WRBT202642';

  const chartCfg = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
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

  function line(label, color, data) {
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: color + '18',
      borderWidth: 1.5,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
    };
  }

  let charts = {};

  function makeOrUpdate(id, datasets, labels) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (charts[id]) {
      charts[id].data.labels = labels;
      charts[id].data.datasets.forEach((ds, i) => {
        if (datasets[i]) ds.data = datasets[i].data;
      });
      charts[id].update('none');
      return;
    }
    charts[id] = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: chartCfg,
    });
  }

  function avg(arr) { return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : null; }
  function max(arr) { return arr.length ? Math.max(...arr) : null; }

  function updateStats(pts) {
    const temps = pts.map(p => p.temp_c).filter(v => v != null);
    const hums  = pts.map(p => p.humidity_pct).filter(v => v != null);
    const aqs   = pts.map(p => p.air_quality_ppm).filter(v => v != null);

    setText('stat-temp-avg', avg(temps) != null ? avg(temps).toFixed(1) + ' °C' : '—');
    setText('stat-temp-max', max(temps) != null ? max(temps).toFixed(1) + ' °C' : '—');
    setText('stat-hum-avg',  avg(hums)  != null ? avg(hums).toFixed(1) + ' %'   : '—');
    setText('stat-aq-avg',   avg(aqs)   != null ? avg(aqs).toFixed(0) + ' ppm'  : '—');
  }

  async function loadData() {
    const hours = document.getElementById('hours-select')?.value || 24;
    const res = await fetch(`/api/v1/telemetry/history?device_id=${DEVICE_ID}&hours=${hours}`);
    if (!res.ok) return;
    const json = await res.json();
    const pts  = json.data || [];

    const labels = pts.map(p => new Date(p.t).toLocaleTimeString());

    updateStats(pts);

    makeOrUpdate('chart-env', [
      line('Temp (°C)',   '#38bdf8', pts.map(p => p.temp_c)),
      line('Humidity (%)', '#a78bfa', pts.map(p => p.humidity_pct)),
    ], labels);

    makeOrUpdate('chart-aq', [
      line('Air Quality (ppm)', '#34d399', pts.map(p => p.air_quality_ppm)),
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
    document.getElementById('refresh-btn')?.addEventListener('click', loadData);
  });

})();
