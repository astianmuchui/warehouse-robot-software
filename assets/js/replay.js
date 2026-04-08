

(function () {
  'use strict';

  const DEVICE_ID  = window.SGG_DEVICE_ID || 'WRBT202642';
  const BASE_MS    = 500; 

  
  let frames       = [];
  let currentFrame = 0;
  let playing      = false;
  let playTimer    = null;

  
  let scene, camera, renderer, robotMesh;
  let targetQuat  = new THREE.Quaternion();
  let currentQuat = new THREE.Quaternion();

  function initThree() {
    const canvas = document.getElementById('replay-canvas');
    if (!canvas) return;

    scene    = new THREE.Scene();
    camera   = new THREE.PerspectiveCamera(50, canvas.clientWidth / 300, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, 300);
    renderer.setClearColor(0x000000, 0);

    const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 1.6);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.85 });
    robotMesh     = new THREE.Mesh(bodyGeo, bodyMat);
    scene.add(robotMesh);

    const armGeo  = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12);
    const armMat  = new THREE.MeshPhongMaterial({ color: 0x38bdf8 });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.position.set(0, 0.65, 0);
    robotMesh.add(armMesh);

    scene.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,0), 1.8, 0xff4444, 0.15, 0.1));
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,0), 1.8, 0x44ff44, 0.15, 0.1));
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,0), 1.8, 0x4488ff, 0.15, 0.1));

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 3, 2);
    scene.add(dir);

    const grid = new THREE.GridHelper(4, 8, 0x334155, 0x1e293b);
    grid.position.y = -0.6;
    scene.add(grid);

    animateLoop();
  }

  function animateLoop() {
    requestAnimationFrame(animateLoop);
    currentQuat.slerp(targetQuat, 0.1);
    if (robotMesh) robotMesh.quaternion.copy(currentQuat);
    if (renderer)  renderer.render(scene, camera);
  }

  function accelToQuat(ax, ay, az) {
    const grav = new THREE.Vector3(0, -1, 0);
    const meas = new THREE.Vector3(ax, ay, az).normalize();
    const q    = new THREE.Quaternion();
    q.setFromUnitVectors(grav, meas);
    return q;
  }

  

  function showFrame(idx) {
    if (!frames.length) return;
    idx = Math.max(0, Math.min(idx, frames.length - 1));
    currentFrame = idx;

    const f = frames[idx];

    
    if (typeof f.accel_x === 'number') {
      targetQuat.copy(accelToQuat(f.accel_x, f.accel_y, f.accel_z));
    }

    
    setText('r-ax', fmt(f.accel_x));
    setText('r-ay', fmt(f.accel_y));
    setText('r-az', fmt(f.accel_z));
    setText('r-gx', fmt(f.gyro_x));
    setText('r-gy', fmt(f.gyro_y));
    setText('r-gz', fmt(f.gyro_z));

    
    const scrubber = document.getElementById('scrubber');
    if (scrubber) scrubber.value = idx;

    setText('frame-counter', `${idx + 1} / ${frames.length}`);
    setText('frame-time', f.t ? new Date(f.t).toLocaleString() : '—');

    const pct = frames.length > 1 ? (idx / (frames.length - 1)) * 100 : 100;
    const bar = document.getElementById('progress-bar');
    if (bar) bar.style.width = pct + '%';
  }

  

  function speedMs() {
    const sel = document.getElementById('speed-select');
    const spd = sel ? parseFloat(sel.value) : 1;
    return Math.round(BASE_MS / spd);
  }

  function startPlay() {
    if (playing) return;
    if (currentFrame >= frames.length - 1) currentFrame = 0;
    playing = true;
    setPlayUI(true);
    scheduleNext();
  }

  function scheduleNext() {
    playTimer = setTimeout(() => {
      if (!playing) return;
      const next = currentFrame + 1;
      if (next >= frames.length) {
        stopPlay();
        return;
      }
      showFrame(next);
      scheduleNext();
    }, speedMs());
  }

  function stopPlay() {
    playing = false;
    clearTimeout(playTimer);
    setPlayUI(false);
  }

  function setPlayUI(isPlaying) {
    const btn   = document.getElementById('play-btn');
    const label = document.getElementById('play-label');
    const icon  = document.getElementById('play-icon');
    if (!btn) return;

    if (isPlaying) {
      label.textContent = 'Pause';
      icon.innerHTML = '<path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zm7 0a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/>';
    } else {
      label.textContent = 'Play';
      icon.innerHTML = '<path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.34-5.89a1.5 1.5 0 000-2.54L6.3 2.84z"/>';
    }
  }

  

  async function loadFrames() {
    const slider = document.getElementById('limit-slider');
    const limit  = slider ? parseInt(slider.value) : 50;
    const status = document.getElementById('load-status');

    stopPlay();
    if (status) status.textContent = 'Loading…';

    try {
      const res = await fetch(`/api/v1/telemetry/imu/replay?device_id=${DEVICE_ID}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      frames = json.frames || [];

      if (!frames.length) {
        if (status) status.textContent = 'No data available.';
        setControlsEnabled(false);
        return;
      }

      
      const scrubber = document.getElementById('scrubber');
      if (scrubber) {
        scrubber.max   = frames.length - 1;
        scrubber.value = 0;
      }

      currentFrame = 0;
      showFrame(0);
      setControlsEnabled(true);

      if (status) status.textContent = `Loaded ${frames.length} frame${frames.length !== 1 ? 's' : ''}.`;
    } catch (e) {
      if (status) status.textContent = `Error: ${e.message}`;
      console.error('replay load error', e);
    }
  }

  function setControlsEnabled(enabled) {
    ['play-btn', 'restart-btn', 'scrubber'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !enabled;
    });
  }

  

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function fmt(v) {
    return typeof v === 'number' ? v.toFixed(4) : '—';
  }

  

  document.addEventListener('DOMContentLoaded', () => {
    initThree();

    
    const slider  = document.getElementById('limit-slider');
    const display = document.getElementById('limit-display');
    if (slider && display) {
      slider.addEventListener('input', () => { display.textContent = slider.value; });
    }

    
    const loadBtn = document.getElementById('load-btn');
    if (loadBtn) loadBtn.addEventListener('click', loadFrames);

    
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.addEventListener('click', () => {
      if (playing) stopPlay(); else startPlay();
    });

    
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) restartBtn.addEventListener('click', () => {
      stopPlay();
      currentFrame = 0;
      showFrame(0);
    });

    
    const scrubber = document.getElementById('scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', () => {
        stopPlay();
        showFrame(parseInt(scrubber.value));
      });
    }

    
    const speedSel = document.getElementById('speed-select');
    if (speedSel) speedSel.addEventListener('change', () => {
      if (playing) { stopPlay(); startPlay(); }
    });
  });

})();
