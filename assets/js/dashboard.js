
(function () {
  'use strict';

  const DEVICE_ID = window.SGG_DEVICE_ID || 'WRBT202642';
  const POLL_MS   = 5000;

  

  let gyroScene, gyroCamera, gyroRenderer, robotMesh;
  let targetQuat = new THREE.Quaternion();
  let currentQuat = new THREE.Quaternion();

  function initGyro() {
    const canvas = document.getElementById('gyro-canvas');
    if (!canvas) return;

    gyroScene    = new THREE.Scene();
    gyroCamera   = new THREE.PerspectiveCamera(50, canvas.clientWidth / 280, 0.1, 100);
    gyroCamera.position.set(0, 0, 3.5);

    gyroRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    gyroRenderer.setSize(canvas.clientWidth, 280);
    gyroRenderer.setClearColor(0x000000, 0);

    
    const bodyGeo  = new THREE.BoxGeometry(1.2, 0.5, 1.6);
    const bodyMat  = new THREE.MeshPhongMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.85, wireframe: false });
    robotMesh      = new THREE.Mesh(bodyGeo, bodyMat);
    gyroScene.add(robotMesh);

    
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12);
    const armMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8 });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.position.set(0, 0.65, 0);
    robotMesh.add(armMesh);

    
    gyroScene.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1.8, 0xff4444, 0.15, 0.1));
    gyroScene.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), 1.8, 0x44ff44, 0.15, 0.1));
    gyroScene.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), 1.8, 0x4488ff, 0.15, 0.1));

    
    gyroScene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 3, 2);
    gyroScene.add(dirLight);

    
    const grid = new THREE.GridHelper(4, 8, 0x334155, 0x1e293b);
    grid.position.y = -0.6;
    gyroScene.add(grid);

    animateGyro();
  }

  function animateGyro() {
    requestAnimationFrame(animateGyro);
    
    currentQuat.slerp(targetQuat, 0.08);
    if (robotMesh) robotMesh.quaternion.copy(currentQuat);
    if (gyroRenderer) gyroRenderer.render(gyroScene, gyroCamera);
  }

  
  function accelToQuat(ax, ay, az) {
    
    const grav = new THREE.Vector3(0, -1, 0);
    const meas = new THREE.Vector3(ax, ay, az).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(grav, meas);
    return q;
  }

  

  function updateKPIs(data) {
    setText('val-temp', data.TempC     != null ? data.TempC.toFixed(1) + ' °C'  : '—');
    setText('val-hum',  data.HumidityPct != null ? data.HumidityPct.toFixed(1) + ' %' : '—');
    setText('val-aq',   data.AirQualityPPM != null ? data.AirQualityPPM.toFixed(0) + ' ppm' : '—');
    setText('val-dist', data.DistanceCm != null ? data.DistanceCm.toFixed(1) + ' cm' : '—');
  }

  function updateIMUDisplay(data) {
    setText('imu-ax', fmt(data.accel_x));
    setText('imu-ay', fmt(data.accel_y));
    setText('imu-az', fmt(data.accel_z));
    setText('imu-gx', fmt(data.gyro_x));
    setText('imu-gy', fmt(data.gyro_y));
    setText('imu-gz', fmt(data.gyro_z));

    
    if (typeof data.accel_x === 'number') {
      targetQuat.copy(accelToQuat(data.accel_x, data.accel_y, data.accel_z));
    }
  }

  async function pollLatest() {
    try {
      const [telRes, imuRes] = await Promise.all([
        fetch(`/api/v1/telemetry/latest?device_id=${DEVICE_ID}`),
        fetch(`/api/v1/telemetry/imu/latest?device_id=${DEVICE_ID}`),
      ]);

      if (telRes.ok) {
        const data = await telRes.json();
        updateKPIs(data);
      }

      if (imuRes.ok) {
        const imu = await imuRes.json();
        updateIMUDisplay(imu);
      }
    } catch (e) {
      console.warn('poll error', e);
    }
  }

  

  let envChart, aqChart;

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 6, font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  };

  function mkLine(label, color, data) {
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 1.5,
      fill: true,
      tension: 0.3,
      pointRadius: 0,
    };
  }

  async function initCharts() {
    const res = await fetch(`/api/v1/telemetry/history?device_id=${DEVICE_ID}&hours=1`);
    if (!res.ok) return;
    const json = await res.json();
    const pts  = json.data || [];

    const labels = pts.map(p => new Date(p.t).toLocaleTimeString());

    const envCanvas = document.getElementById('env-chart');
    if (envCanvas) {
      envChart = new Chart(envCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            mkLine('Temp (°C)',   '#38bdf8', pts.map(p => p.temp_c)),
            mkLine('Humidity (%)', '#a78bfa', pts.map(p => p.humidity_pct)),
          ],
        },
        options: chartDefaults,
      });
    }

    const aqCanvas = document.getElementById('aq-chart');
    if (aqCanvas) {
      aqChart = new Chart(aqCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            mkLine('Air Quality (ppm)', '#34d399', pts.map(p => p.air_quality_ppm)),
          ],
        },
        options: chartDefaults,
      });
    }
  }

  

  async function pollEvents() {
    try {
      const res = await fetch(`/api/v1/events?device_id=${DEVICE_ID}&page=1`);
      if (!res.ok) return;
      const json = await res.json();
      const list = document.getElementById('event-list');
      if (!list) return;
      const evts = json.events || [];
      if (evts.length === 0) return;

      list.innerHTML = evts.slice(0, 10).map(e => {
        const t = new Date(e.CreatedAt).toLocaleTimeString();
        const sev = e.Severity || 'info';
        return `<div class="event-row severity-${sev}">
          <span class="event-badge">${esc(e.EventType)}</span>
          <span class="text-xs text-slate-300 truncate flex-1">${esc(e.Message)}</span>
          <span class="text-xs text-slate-500 ml-2 shrink-0">${t}</span>
        </div>`;
      }).join('');
    } catch (e) {
      console.warn('events poll error', e);
    }
  }

  

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fmt(v) {
    return typeof v === 'number' ? v.toFixed(4) : '—';
  }

  function esc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  

  document.addEventListener('DOMContentLoaded', () => {
    initGyro();
    initCharts();
    pollLatest();
    pollEvents();
    setInterval(pollLatest, POLL_MS);
    setInterval(pollEvents, POLL_MS * 2);
  });

})();
