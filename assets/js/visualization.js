/* global THREE */
(function () {
  'use strict';

  const DEVICE_ID = window.SGG_DEVICE_ID || 'WRBT202642';
  const SIDEBAR_W = 224; // px — matches w-56 tailwind class
  const W = () => window.innerWidth - SIDEBAR_W;
  const H = () => window.innerHeight;
  const DEG = Math.PI / 180;

  // ── Scene / Camera / Renderer ─────────────────────────────────────────────

  const canvas   = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled  = true;
  renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
  renderer.outputEncoding     = THREE.sRGBEncoding;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0d12');
  scene.fog = new THREE.Fog('#0b0d12', 60, 140);

  const camera = new THREE.PerspectiveCamera(38, W() / H(), 0.1, 500);

  window.addEventListener('resize', () => {
    renderer.setSize(W(), H());
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
  });

  // ── Lighting ──────────────────────────────────────────────────────────────

  scene.add(new THREE.HemisphereLight(0xb0c8ff, 0x1a1d24, 0.45));

  const key = new THREE.DirectionalLight(0xfff0d6, 1.4);
  key.position.set(20, 30, 15);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 80 });
  key.shadow.bias = -0.0005;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x7ea8ff, 0.4);
  fill.position.set(-20, 12, -10);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(0, 5, -25);
  scene.add(rim);

  // ── Ground ────────────────────────────────────────────────────────────────

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.85, metalness: 0.1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(60, 30, 0x2a3040, 0x1a1d24);
  grid.material.transparent = true;
  grid.material.opacity     = 0.6;
  scene.add(grid);

  // ── Materials ─────────────────────────────────────────────────────────────

  const M = {
    acrylic:       new THREE.MeshPhysicalMaterial({ color: 0xddeeff, transparent: true, opacity: 0.32, transmission: 0.85, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, side: THREE.DoubleSide }),
    plasticBlack:  new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.55, metalness: 0.05 }),
    plasticBlackP: new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.7,  metalness: 0.02 }),
    plasticYellow: new THREE.MeshStandardMaterial({ color: 0xf6c324, roughness: 0.55, metalness: 0.0  }),
    plasticWhite:  new THREE.MeshStandardMaterial({ color: 0xe8ebf0, roughness: 0.45, metalness: 0.0  }),
    rubber:        new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.95, metalness: 0.0  }),
    brass:         new THREE.MeshStandardMaterial({ color: 0xc9a35b, roughness: 0.35, metalness: 0.85 }),
    steel:         new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3,  metalness: 0.9  }),
    pcbGreen:      new THREE.MeshStandardMaterial({ color: 0x0a4a25, roughness: 0.4,  metalness: 0.15 }),
    pcbRed:        new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.45, metalness: 0.15 }),
    pcbBlue:       new THREE.MeshStandardMaterial({ color: 0x1a4a8b, roughness: 0.45, metalness: 0.15 }),
    servoBlue:     new THREE.MeshStandardMaterial({ color: 0x2b5fa8, roughness: 0.5,  metalness: 0.05 }),
    servoLabel:    new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6,  metalness: 0.0  }),
    copperPad:     new THREE.MeshStandardMaterial({ color: 0xd99860, roughness: 0.4,  metalness: 0.7  }),
    ledRed:        new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: new THREE.Color(0xff2020), emissiveIntensity: 1.5 }),
    ledGreen:      new THREE.MeshStandardMaterial({ color: 0x20ff60, emissive: new THREE.Color(0x20ff60), emissiveIntensity: 1.5 }),
    wireOrange:    new THREE.MeshStandardMaterial({ color: 0xc46a1c, roughness: 0.7,  metalness: 0.0  }),
    wireRed:       new THREE.MeshStandardMaterial({ color: 0xb02020, roughness: 0.7,  metalness: 0.0  }),
    wireBrown:     new THREE.MeshStandardMaterial({ color: 0x4a2818, roughness: 0.7,  metalness: 0.0  }),
  };

  // ── Component Builders ────────────────────────────────────────────────────

  function makePlate(radius, thickness) {
    const g    = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 64), M.acrylic);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.02, 0.04, 6, 64),
      new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.5, transparent: true, opacity: 0.6 }));
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    return g;
  }

  function makeStandoff(height) {
    const g    = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, height, 6), M.brass);
    post.castShadow = true;
    g.add(post);
    return g;
  }

  function makeTTMotor() {
    const g    = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(7, 1.9, 2.3), M.plasticYellow);
    body.castShadow = true; g.add(body);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2.5, 24), M.steel);
    motor.rotation.z = Math.PI / 2; motor.position.x = -4.5; motor.castShadow = true; g.add(motor);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.5, 12), M.steel);
    shaft.rotation.z = Math.PI / 2; shaft.position.x = 4.5; g.add(shaft);
    return g;
  }

  function makeWheel() {
    const g       = new THREE.Group();
    const spinner = new THREE.Group();
    g.add(spinner);
    g.userData.spinner = spinner;

    const tireR = 3.25, innerR = 2.55, rimR = 2.45, hubR = 0.7, width = 2.6;
    const axCyl = (r, len, segs, mat, open = false) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, segs, 1, open), mat);
      m.rotation.z = Math.PI / 2; return m;
    };

    const tire = axCyl(tireR, width, 40, M.rubber);
    tire.castShadow = true; spinner.add(tire);
    spinner.add(axCyl(innerR, width - 0.8, 32, M.rubber, true));

    for (let i = 0; i < 22; i++) {
      const tg = new THREE.Group(); tg.rotation.x = (i / 22) * Math.PI * 2;
      const block = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.35, 0.55), M.rubber);
      block.position.y = tireR + 0.12; tg.add(block); spinner.add(tg);
    }

    const buildRimSide = (xOff) => {
      const side = new THREE.Group(); side.position.x = xOff;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.18, 8, 32), M.plasticYellow);
      ring.rotation.y = Math.PI / 2; side.add(ring);
      for (let i = 0; i < 5; i++) {
        const sg = new THREE.Group(); sg.rotation.x = (i / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.18, rimR - 0.2, 0.55), M.plasticYellow);
        spoke.position.y = (rimR - 0.2) / 2 + 0.2; sg.add(spoke); side.add(sg);
      }
      return side;
    };
    spinner.add(buildRimSide(width / 2 - 0.25));
    spinner.add(buildRimSide(-(width / 2 - 0.25)));

    spinner.add(axCyl(hubR, width + 0.05, 16, M.plasticYellow));
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, width + 0.4, 12), M.steel);
    bolt.rotation.z = Math.PI / 2; spinner.add(bolt);
    return g;
  }

  function makeCaster() {
    const g = new THREE.Group();
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 1.4), M.steel);
    bracket.castShadow = true; g.add(bracket);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), M.plasticWhite);
    ball.position.y = -1.5; ball.castShadow = true; g.add(ball);
    return g;
  }

  function makeL298N() {
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.18, 4.3), M.pcbGreen), { castShadow: true }));
    const heat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.2), M.plasticBlack);
    heat.position.set(0, 0.9, -0.5); heat.castShadow = true; g.add(heat);
    for (let i = -2; i <= 2; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.7, 1.3), M.plasticBlack);
      fin.position.set(i * 0.45, 0.95, -0.5); g.add(fin);
    }
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x2d6e3d, roughness: 0.5 }));
    t1.position.set(0, 0.6, 1.7); g.add(t1);
    const t2 = t1.clone(); t2.position.z = -1.7; g.add(t2);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.ledRed);
    led.position.set(1.6, 0.2, 1.0); g.add(led);
    return g;
  }

  function makeBuck() {
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.15, 2.1), M.pcbBlue), { castShadow: true }));
    const ind = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.25, 10, 16),
      new THREE.MeshStandardMaterial({ color: 0xc9a235, roughness: 0.6 }));
    ind.rotation.x = Math.PI / 2; ind.position.set(-0.5, 0.45, 0); g.add(ind);
    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x1a4080 }));
    pot.position.set(1.0, 0.42, 0); g.add(pot);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0x222222 }));
    cap.position.set(0.3, 0.45, -0.5); g.add(cap);
    return g;
  }

  function makeBattery() {
    const g    = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 4), M.plasticYellow);
    body.castShadow = true; g.add(body); return g;
  }

  function makeHCSR04() {
    const g     = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 4.5), M.pcbGreen);
    board.castShadow = true; g.add(board);
    for (const z of [1.3, -1.3]) {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 20), M.steel);
      cyl.rotation.z = Math.PI / 2; cyl.position.set(0.7, 0, z); g.add(cyl);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), M.plasticBlack);
      face.rotation.y = -Math.PI / 2; face.position.set(1.31, 0, z); g.add(face);
    }
    return g;
  }

  function makeUltraCone() {
    const g    = new THREE.Group();
    const mat  = new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.27, 1, 24, 1, true), mat);
    cone.rotation.z = -Math.PI / 2; cone.position.x = 0.5; g.add(cone);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.20, 0.28, 24),
      new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.rotation.y = Math.PI / 2; g.add(ring);
    g.userData.cone = cone; g.userData.ring = ring;
    return g;
  }

  function makeIRSensor() {
    const g     = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.0), M.pcbGreen);
    board.castShadow = true; g.add(board);
    for (const x of [-0.3, 0.3]) {
      const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.32, 12), M.plasticBlack);
      dome.position.set(x, 0.16, 0); g.add(dome);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12),
        new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.2, metalness: 0.3 }));
      lens.rotation.x = -Math.PI / 2; lens.position.set(x, 0.33, 0); g.add(lens);
    }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.ledRed.clone());
    led.position.set(0.55, 0.16, -0.4);
    g.userData.led = led; g.add(led);
    return g;
  }

  function makeMPU6050() {
    const purple = new THREE.MeshStandardMaterial({ color: 0x4a1a78, roughness: 0.5, metalness: 0.15 });
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.5), purple), { castShadow: true }));
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.45), M.plasticBlack);
    chip.position.y = 0.18; g.add(chip);
    for (let i = 0; i < 8; i++) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.12), M.plasticBlack);
      pin.position.set(-0.85 + i * 0.24, 0.24, 0.65); g.add(pin);
    }
    return g;
  }

  function makeGPS() {
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 2.5), M.pcbGreen), { castShadow: true }));
    const patch = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xc9a35b, roughness: 0.35, metalness: 0.7 }));
    patch.position.y = 0.23; patch.castShadow = true; g.add(patch);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M.ledGreen);
    led.position.set(1.0, 0.13, -0.95); g.add(led);
    return g;
  }

  function makePCF8574() {
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 1.5), M.pcbGreen), { castShadow: true }));
    const chip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.65), M.plasticBlack);
    chip.position.y = 0.21; g.add(chip);
    for (let i = 0; i < 8; i++) {
      for (const z of [0.4, -0.4]) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), M.steel);
        pin.position.set(-0.9 + i * 0.26, 0.15, z); g.add(pin);
      }
    }
    return g;
  }

  function makeBuzzer() {
    const g   = new THREE.Group();
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.7, 20), M.plasticBlack);
    can.castShadow = true; g.add(can);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0x000000 }));
    hole.rotation.x = -Math.PI / 2; hole.position.y = 0.36; g.add(hole);
    return g;
  }

  function makeServo(horn = true) {
    const g    = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.4, 1.2), M.servoBlue);
    body.castShadow = true; g.add(body);
    const tabL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 1.2), M.servoBlue);
    tabL.position.set(-1.5, 0.7, 0); g.add(tabL);
    const tabR = tabL.clone(); tabR.position.x = 1.5; g.add(tabR);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), M.servoLabel);
    label.position.set(0, 0.05, 0.61); g.add(label);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12), M.steel);
    shaft.position.set(0.6, 1.45, 0); g.add(shaft);
    if (horn) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 16), M.plasticWhite);
      h.position.set(0.6, 1.75, 0); g.add(h);
    }
    return g;
  }

  function makeLink(length, width = 0.8, thickness = 0.5) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(length, thickness, width), M.plasticBlackP);
    m.castShadow = true; g.add(m);
    for (const sx of [-1, 1]) {
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(width / 2, width / 2, thickness * 1.2, 16), M.plasticBlackP);
      boss.rotation.x = Math.PI / 2; boss.position.x = sx * length / 2; g.add(boss);
    }
    return g;
  }

  function makeWire(points, mat, radius = 0.08) {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), mat);
  }

  function makeCustomPCB() {
    const g     = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(11, 0.2, 8), M.pcbGreen);
    board.castShadow = true; g.add(board);

    // MQ-135
    const mqBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 2.2), M.pcbBlue);
    mqBase.position.set(-4.2, 0.21, 3.0); g.add(mqBase);
    const mqCan = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 20), M.steel);
    mqCan.position.set(-4.2, 0.65, 3.0); g.add(mqCan);

    // DHT11
    const dhtBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 2.0), M.pcbBlue);
    dhtBase.position.set(0.5, 0.20, 3.0); g.add(dhtBase);
    const dhtBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1a78c8, roughness: 0.5 }));
    dhtBody.position.set(0.5, 0.45, 3.0); g.add(dhtBody);

    // ESP32
    const esp = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x0a2a4a, roughness: 0.5 }));
    esp.position.set(-1.5, 0.25, 0); g.add(esp);
    const can = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.0), M.steel);
    can.position.set(-1.5, 0.5, 0); g.add(can);

    // PCA9685
    const pca = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 6.2), M.pcbRed);
    pca.position.set(4.0, 0.21, 0); g.add(pca);
    const pcaIc = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.9), M.plasticBlack);
    pcaIc.position.set(4.0, 0.4, -1.5); g.add(pcaIc);

    // IMU / GPS / PCF / Buzzer
    const mpu = makeMPU6050(); mpu.position.set(-3.8, 0.21, -3.0); g.add(mpu);
    const pcf = makePCF8574(); pcf.position.set(-1.2, 0.21, -3.0); g.add(pcf);
    const gps = makeGPS();     gps.position.set( 1.5, 0.21, -2.8); g.add(gps);
    const buz = makeBuzzer();  buz.position.set( 3.8, 0.31, -3.5); g.add(buz);

    // Status LEDs
    for (const [x, mat] of [[0.3, M.ledRed], [0.7, M.ledGreen]]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), mat);
      l.position.set(x, 0.32, -1.6); g.add(l);
    }
    return g;
  }

  // ── Build Arm ─────────────────────────────────────────────────────────────
  // EEZYbotARM MK1 — parallelogram wrist mechanism.
  // Servo A drives the upper arm (shoulder angle).
  // Slider B ("elbow") sets the forearm WORLD angle; the joint rotation
  // compensates for the shoulder so the wrist stays level (true MK1 behaviour).

  function buildArm() {
    const arm = new THREE.Group();

    // Pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 2.5, 32), M.plasticBlackP);
    ped.position.y = 1.25; ped.castShadow = true; arm.add(ped);
    const pedTop = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 32), M.plasticBlackP);
    pedTop.position.y = 2.6; arm.add(pedTop);

    const UPPER_LEN  = 8.0;
    const FOREARM_LEN = 6.5;

    // Yaw joint (base rotation)
    const jointBase = new THREE.Group();
    jointBase.position.y = 2.8;
    arm.add(jointBase);

    // U-bracket
    const bracketBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 3.6), M.plasticBlackP);
    bracketBase.position.y = 0.25; jointBase.add(bracketBase);
    const bracketL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.5), M.plasticBlackP);
    bracketL.position.set(0, 1.45, -1.55); jointBase.add(bracketL);
    const bracketR = bracketL.clone(); bracketR.position.z = 1.55; jointBase.add(bracketR);

    // Servo A (drives upper arm)
    const servoA = makeServo();
    servoA.position.set(0, 1.5, -2.1); servoA.rotation.y = Math.PI; jointBase.add(servoA);
    // Servo B (drives forearm via parallelogram)
    const servoB = makeServo();
    servoB.position.set(0, 1.5, 2.1); jointBase.add(servoB);

    // Shoulder pivot
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(0, 2.4, 0);
    jointBase.add(shoulderPivot);

    // Upper arm — rotates with shoulder
    const jointShoulder = new THREE.Group();
    shoulderPivot.add(jointShoulder);
    const upperArm = makeLink(UPPER_LEN);
    upperArm.position.x = UPPER_LEN / 2;
    jointShoulder.add(upperArm);

    // Elbow pivot at upper-arm tip
    const elbowPivot = new THREE.Group();
    elbowPivot.position.x = UPPER_LEN;
    jointShoulder.add(elbowPivot);

    // Forearm — parallelogram: world angle = elbow slider value
    const jointElbow = new THREE.Group();
    elbowPivot.add(jointElbow);
    const forearm = makeLink(FOREARM_LEN);
    forearm.position.x = FOREARM_LEN / 2;
    jointElbow.add(forearm);

    // Wrist group at forearm tip
    const wristGroup = new THREE.Group();
    wristGroup.position.x = FOREARM_LEN;
    jointElbow.add(wristGroup);
    const wristServo = makeServo(false);
    wristServo.rotation.z = Math.PI / 2; wristServo.position.y = 0.4;
    wristGroup.add(wristServo);

    // Gripper
    const gripperGroup = new THREE.Group();
    gripperGroup.position.set(0, 1.4, 0);
    wristGroup.add(gripperGroup);
    const jawMount = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 2.0), M.plasticBlackP);
    gripperGroup.add(jawMount);

    const jawL = new THREE.Group(); jawL.position.set(0, -0.3, -1.0);
    const jawBodyL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.5, 0.4), M.plasticBlackP);
    jawBodyL.position.y = -0.75; jawL.add(jawBodyL); gripperGroup.add(jawL);

    const jawR = new THREE.Group(); jawR.position.set(0, -0.3, 1.0);
    const jawBodyR = jawBodyL.clone(); jawR.add(jawBodyR); gripperGroup.add(jawR);

    // Connecting rod (cosmetic — represents the parallelogram link)
    const connRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 6.0, 8),
      M.plasticBlackP
    );
    connRod.rotation.z = Math.PI / 2; connRod.position.set(4.0, 3.5, 1.4);
    jointBase.add(connRod);

    return { arm, jointBase, jointShoulder, jointElbow, wristGroup, gripperGroup, jawL, jawR };
  }

  // ── Build Robot ───────────────────────────────────────────────────────────

  function buildRobot() {
    const robot   = new THREE.Group();
    const motorY  = 3.25;
    const yBottom = 4.5;
    const yMiddle = 7.8;
    const yTop    = 11.6;

    // Plates
    [yBottom, yMiddle, yTop].forEach(y => { const p = makePlate(6.5, 0.3); p.position.y = y; robot.add(p); });

    // Standoffs
    const s1Len = (yMiddle - 0.15) - (yBottom + 0.15);
    const s2Len = (yTop    - 0.15) - (yMiddle + 0.15);
    const s1Y   = (yBottom + yMiddle) / 2;
    const s2Y   = (yMiddle + yTop) / 2;
    for (let i = 0; i < 4; i++) {
      const a  = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x  = Math.cos(a) * 5.5, z = Math.sin(a) * 5.5;
      const s1 = makeStandoff(s1Len); s1.position.set(x, s1Y, z); robot.add(s1);
      const s2 = makeStandoff(s2Len); s2.position.set(x, s2Y, z); robot.add(s2);
    }

    // Drive train
    const motorL = makeTTMotor(); motorL.position.set(0, motorY, -2.2); motorL.rotation.y = Math.PI; robot.add(motorL);
    const wheelL = makeWheel();   wheelL.position.set(-5.2, motorY, -2.2); robot.add(wheelL);
    const motorR = makeTTMotor(); motorR.position.set(0, motorY,  2.2); robot.add(motorR);
    const wheelR = makeWheel();   wheelR.position.set( 5.2, motorY,  2.2); robot.add(wheelR);

    const casterF = makeCaster(); casterF.position.set( 5.5, motorY - 0.6, 0); robot.add(casterF);
    const casterB = makeCaster(); casterB.position.set(-5.5, motorY - 0.6, 0); robot.add(casterB);

    // Bottom deck: power electronics
    const l298 = makeL298N(); l298.position.set(-1.2, yBottom + 0.25, -1.5); robot.add(l298);
    const buck = makeBuck();  buck.position.set( 2.2, yBottom + 0.22, -2.0); robot.add(buck);
    const batt = makeBattery(); batt.position.set(0.5, yBottom + 1.0, 2.4); robot.add(batt);

    // Middle deck: sensor PCB
    const pcb = makeCustomPCB(); pcb.position.set(0, yMiddle + 0.35, 0); robot.add(pcb);

    // Top deck: arm
    const armData = buildArm(); armData.arm.position.set(0, yTop + 0.4, 0); robot.add(armData.arm);

    // Wires
    robot.add(makeWire([new THREE.Vector3(-1.2, yBottom+0.6, -1.5), new THREE.Vector3(-2.5, yBottom+1.8, -2.5), new THREE.Vector3(-3.0, yMiddle-0.2, -2.0), new THREE.Vector3(-3.5, yMiddle+0.7, 1.0)], M.wireOrange));
    robot.add(makeWire([new THREE.Vector3(0.5, yBottom+1.6, 2.0), new THREE.Vector3(1.5, yBottom+1.0, 0.0), new THREE.Vector3(2.2, yBottom+0.6, -1.5)], M.wireRed));
    robot.add(makeWire([new THREE.Vector3(3.0, yMiddle+0.7, 0.5), new THREE.Vector3(3.5, yMiddle+2.0, 0.5), new THREE.Vector3(1.5, yTop+0.5, 0.5), new THREE.Vector3(0.5, yTop+1.5, 0.0)], M.wireOrange));

    // HC-SR04
    const ultraBracket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 1.5), M.plasticBlackP);
    ultraBracket.position.set(6.3, yMiddle + 0.65, 0); robot.add(ultraBracket);
    const ultrasonic = makeHCSR04(); ultrasonic.position.set(6.7, yMiddle + 1.2, 0); robot.add(ultrasonic);
    const ultraCone  = makeUltraCone(); ultraCone.position.set(7.6, yMiddle + 1.2, 0); robot.add(ultraCone);

    // IR sensors
    const irL = makeIRSensor(); irL.position.set(5.6, yBottom - 0.6, -1.6); irL.rotation.x =  Math.PI; irL.rotation.z = -Math.PI / 12; robot.add(irL);
    const irR = makeIRSensor(); irR.position.set(5.6, yBottom - 0.6,  1.6); irR.rotation.x =  Math.PI; irR.rotation.z = -Math.PI / 12; robot.add(irR);

    scene.add(robot);
    return { robot, wheelL, wheelR, armData, ultraCone, irL, irR };
  }

  // ── State & Robot Handles ─────────────────────────────────────────────────

  const state = {
    base: 0, shoulder: 40, elbow: 10, grip: 15,
    motL: 0, motR: 0,
    distCm: 42.5, irL: false, irR: false,
    demo: false, demoTime: 0,
    robotX: 0, robotZ: 0, robotYaw: 0,
    imuPitch: 0, imuRoll: 0,
    snapBack: true,
  };
  const keys = {};
  const { robot, wheelL, wheelR, armData, ultraCone, irL, irR } = buildRobot();

  function applyServos() {
    armData.jointBase.rotation.y     =  state.base     * DEG;
    armData.jointShoulder.rotation.z =  state.shoulder * DEG;
    // Parallelogram: forearm world angle = elbow slider → compensate for shoulder
    armData.jointElbow.rotation.z    = (state.elbow - state.shoulder) * DEG;
    const openRad = state.grip * DEG;
    armData.jawL.rotation.z =  openRad;
    armData.jawR.rotation.z = -openRad;
  }

  function setIRState(irGroup, detected) {
    const led = irGroup.userData.led;
    if (!led) return;
    led.material.color.setHex(detected ? 0xff2020 : 0x333333);
    led.material.emissive.setHex(detected ? 0xff2020 : 0x000000);
    led.material.emissiveIntensity = detected ? 1.5 : 0;
  }

  // ── Orbit Controls ────────────────────────────────────────────────────────

  const orbit = { theta: Math.PI / 4, phi: 1.07, r: 45, target: new THREE.Vector3(0, 7, 0) };
  let   drag  = { active: false, right: false, lx: 0, ly: 0 };

  canvas.addEventListener('mousedown', e => { drag = { active: true, right: e.button === 2, lx: e.clientX, ly: e.clientY }; });
  window.addEventListener('mouseup',   ()  => { drag.active = false; });
  window.addEventListener('mousemove', e   => {
    if (!drag.active) return;
    const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
    drag.lx = e.clientX; drag.ly = e.clientY;
    if (drag.right) {
      orbit.target.x -= dx * 0.04;
      orbit.target.z += dy * 0.04;
    } else {
      orbit.theta -= dx * 0.012;
      orbit.phi    = Math.max(0.08, Math.min(Math.PI / 2 - 0.05, orbit.phi - dy * 0.012));
    }
  });
  canvas.addEventListener('wheel', e => { orbit.r = Math.max(8, Math.min(90, orbit.r + e.deltaY * 0.05)); }, { passive: true });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Touch orbit
  let lastTouch = null;
  canvas.addEventListener('touchstart', e => { lastTouch = e.touches[0]; }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (!lastTouch) return;
    const t = e.touches[0];
    orbit.theta -= (t.clientX - lastTouch.clientX) * 0.012;
    orbit.phi    = Math.max(0.08, Math.min(Math.PI / 2 - 0.05, orbit.phi - (t.clientY - lastTouch.clientY) * 0.012));
    lastTouch = t;
  }, { passive: true });

  // ── View Presets ──────────────────────────────────────────────────────────

  const VIEWS = {
    iso:   { theta: Math.PI / 4, phi: 1.07, r: 45 },
    front: { theta: 0,           phi: Math.PI / 2.2, r: 40 },
    top:   { theta: Math.PI / 4, phi: 0.08, r: 55 },
    side:  { theta: Math.PI / 2, phi: Math.PI / 2.5, r: 42 },
  };

  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = VIEWS[btn.dataset.view];
      if (v) { orbit.theta = v.theta; orbit.phi = v.phi; orbit.r = v.r; }
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── UI Bindings ───────────────────────────────────────────────────────────

  function syncSliders() {
    for (const [id, key, suffix] of [
      ['s_motL', 'motL', '%'], ['s_motR', 'motR', '%'],
      ['s_base', 'base', '°'], ['s_shoulder', 'shoulder', '°'],
      ['s_elbow', 'elbow', '°'], ['s_grip', 'grip', '°'],
    ]) {
      const el = document.getElementById(id);
      if (el) el.value = state[key];
      const vEl = document.getElementById(id.replace('s_', 'v_'));
      if (vEl) vEl.textContent = state[key] + suffix;
    }
  }

  // ── MQTT command helpers ──────────────────────────────────────────────────
  // Only emit when the resolved value actually changes — keeps the wire quiet
  // while letting genuine changes propagate instantly.

  // Hard ceiling on drive speed. The frontend owns the cap — it never emits a
  // speed above this, so the robot can't be commanded faster than 70 % duty.
  const DRIVE_SPEED_MAX = 70;

  let lastDriveCmd = null;   // last "cmd@speed" string sent, for de-duplication
  async function sendDrive(cmd, speed) {
    // Resolve speed: clamp into 0–DRIVE_SPEED_MAX. Omitted → use the cap.
    const spd = (speed == null)
      ? DRIVE_SPEED_MAX
      : Math.max(0, Math.min(DRIVE_SPEED_MAX, Math.round(speed)));

    const sig = cmd + '@' + spd;
    if (sig === lastDriveCmd) return;
    lastDriveCmd = sig;
    try {
      await fetch('/api/v1/cmd/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd, speed: spd }),
      });
    } catch (e) {
      lastDriveCmd = null;
      console.warn('drive cmd error', e);
    }
  }

  // Map each slider's UI range → servo 0–180° for the firmware
  const ARM_TO_DEG = {
    base:     v => Math.round(v + 90),         // -90..90  → 0..180
    shoulder: v => Math.round(v * 2),          // 0..90    → 0..180
    elbow:    v => Math.round((v + 30) * 2),   // -30..60  → 0..180
    gripper:  v => Math.round(v * 4.5),        // 0..40    → 0..180
  };

  const lastArmAngle = { base: null, shoulder: null, elbow: null, gripper: null };
  async function sendArm(joint, uiVal) {
    const angle = Math.max(0, Math.min(180, ARM_TO_DEG[joint](uiVal)));
    if (lastArmAngle[joint] === angle) return;
    lastArmAngle[joint] = angle;
    try {
      await fetch('/api/v1/cmd/arm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joint, angle }),
      });
    } catch (e) {
      lastArmAngle[joint] = null;
      console.warn('arm cmd error', e);
    }
  }

  // Derive a single drive command string from both motor slider values
  function deriveDriveCmd(l, r) {
    const th = 15;
    if (l > th  && r > th)  return 'forward';
    if (l < -th && r < -th) return 'backward';
    if (l < -th && r > th)  return 'left';
    if (l > th  && r < -th) return 'right';
    return 'stop';
  }

  // Arm send fires immediately on change. Deduplication in `sendArm` keeps the
  // bus quiet when slider movement doesn't actually change the servo angle.

  // Evaluate the active key set → send one drive command
  function syncDriveCommand() {
    if (state.demo) return;
    const fwd   = keys['KeyW']  || keys['ArrowUp'];
    const back  = keys['KeyS']  || keys['ArrowDown'];
    const left  = keys['KeyA']  || keys['ArrowLeft'];
    const right = keys['KeyD']  || keys['ArrowRight'];
    const stop  = keys['Space'];
    let cmd = 'stop';
    if (fwd)   cmd = 'forward';
    if (back)  cmd = 'backward';
    if (left)  cmd = 'left';
    if (right) cmd = 'right';
    if (stop)  cmd = 'stop';
    sendDrive(cmd);
  }

  function bindUI() {
    // Motor sliders — update visual state and derive MQTT drive cmd
    ['s_motL', 's_motR'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const key = id === 's_motL' ? 'motL' : 'motR';
      el.addEventListener('input', () => {
        state[key] = +el.value;
        const vEl = document.getElementById(id.replace('s_', 'v_'));
        if (vEl) vEl.textContent = el.value + '%';
        // Speed = larger of the two slider magnitudes (sendDrive caps it at 70).
        const speed = Math.max(Math.abs(state.motL), Math.abs(state.motR));
        sendDrive(deriveDriveCmd(state.motL, state.motR), speed);
      });
    });

    // Arm sliders — update visual state and send debounced MQTT arm cmd
    const armSliders = [
      ['s_base',     'base',     'base',     '°'],
      ['s_shoulder', 'shoulder', 'shoulder', '°'],
      ['s_elbow',    'elbow',    'elbow',    '°'],
      ['s_grip',     'grip',     'gripper',  '°'],
    ];
    armSliders.forEach(([id, stateKey, joint, suffix]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        state[stateKey] = +el.value;
        const vEl = document.getElementById(id.replace('s_', 'v_'));
        if (vEl) vEl.textContent = el.value + suffix;
        sendArm(joint, state[stateKey]);
      });
    });

    document.getElementById('t_stop')?.addEventListener('click', () => {
      state.motL = state.motR = 0; syncSliders(); sendDrive('stop');
    });
    document.getElementById('t_home')?.addEventListener('click', () => {
      state.base = 0; state.shoulder = 40; state.elbow = 10; state.grip = 15;
      syncSliders();
      // Park all joints at 90° (firmware boot position)
      sendArm('base',     state.base);
      sendArm('shoulder', state.shoulder);
      sendArm('elbow',    state.elbow);
      sendArm('gripper',  state.grip);
    });

    const demoBtn = document.getElementById('t_animate');
    demoBtn?.addEventListener('click', () => {
      state.demo = !state.demo;
      demoBtn.classList.toggle('active', state.demo);
      demoBtn.textContent = state.demo ? 'Stop' : 'Demo';
    });

    // t_drive: toggle snap-back (joystick) vs hold mode
    const driveBtn = document.getElementById('t_drive');
    driveBtn?.addEventListener('click', () => {
      state.snapBack = !state.snapBack;
      driveBtn.classList.toggle('active', state.snapBack);
      driveBtn.textContent = state.snapBack ? 'Wheels' : 'Hold';
    });

    // Motor sliders return to 0 and send stop on release when snap-back is on
    ['s_motL', 's_motR'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const key = id === 's_motL' ? 'motL' : 'motR';
      const snap = () => {
        if (state.snapBack && !state.demo) {
          state[key] = 0; syncSliders();
          sendDrive(deriveDriveCmd(state.motL, state.motR));
        }
      };
      el.addEventListener('mouseup',  snap);
      el.addEventListener('touchend', snap);
    });

    // Keyboard drive — WASD / arrows; send command on press and release
    const DRIVE_KEYS = new Set(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
    window.addEventListener('keydown', e => {
      if (DRIVE_KEYS.has(e.code)) e.preventDefault();
      if (!keys[e.code]) { keys[e.code] = true; syncDriveCommand(); }
      else keys[e.code] = true;
    });
    window.addEventListener('keyup', e => {
      keys[e.code] = false;
      if (DRIVE_KEYS.has(e.code) && !state.demo) {
        state.motL = 0; state.motR = 0; syncSliders();
        syncDriveCommand();
      }
    });
  }

  // ── API Polling ───────────────────────────────────────────────────────────

  async function pollSensors() {
    try {
      const res = await fetch(`/api/v1/telemetry/latest?device_id=${DEVICE_ID}`);
      if (!res.ok) return;
      const d = await res.json();

      if (d.DistanceCm  != null && d.DistanceCm  >= 0) state.distCm = d.DistanceCm;
      if (d.RSSI        != null) setText('t_rssi',   d.RSSI + ' dBm');
      if (d.UptimeS     != null) {
        const h = Math.floor(d.UptimeS / 3600), m = Math.floor((d.UptimeS % 3600) / 60);
        setText('t_uptime', `${h}h ${m}m`);
      }

      // Derive pitch / roll from accelerometer (MPU-6050 axes)
      if (d.accel_x != null) {
        const ax = d.accel_x, ay = d.accel_y, az = d.accel_z;
        state.imuPitch = Math.atan2(ax, Math.sqrt(ay * ay + az * az));
        state.imuRoll  = Math.atan2(-ay, az);
      }

      // IR proxy — if obstacle < 20 cm light both IR LEDs
      const close = d.DistanceCm != null && d.DistanceCm >= 0 && d.DistanceCm < 20;
      state.irL = state.irR = close;
      setText('v_dist', d.DistanceCm != null ? d.DistanceCm.toFixed(1) : '—');
      if (d.DistanceCm != null) {
        const pct = Math.min(d.DistanceCm / 200, 1);
        const bar = document.getElementById('bar_dist');
        if (bar) bar.style.width = (pct * 100).toFixed(0) + '%';
      }

      setText('v_irL', close ? 'DETECTED' : 'CLEAR');
      setText('v_irR', close ? 'DETECTED' : 'CLEAR');
      const ledL = document.getElementById('led_irL'), ledR = document.getElementById('led_irR');
      if (ledL) ledL.classList.toggle('active', close);
      if (ledR) ledR.classList.toggle('active', close);

      // Connection type from raw JSON
      if (d.RawJSON) {
        try {
          const raw = JSON.parse(d.RawJSON);
          const tr  = raw?.system?.transport;
          if (tr) setText('t_mqtt', tr);
        } catch (_) {}
      }
    } catch (e) {
      console.warn('viz poll error', e);
    }
  }

  // ── Animation Loop ────────────────────────────────────────────────────────

  function animate() {
    requestAnimationFrame(animate);

    // ── Keyboard drive input ─────────────────────────────────────────────────
    if (!state.demo) {
      const SPEED = 70;
      let nl = state.motL, nr = state.motR, changed = false;
      if (keys['KeyW'] || keys['ArrowUp'])    { nl =  SPEED; nr =  SPEED; changed = true; }
      if (keys['KeyS'] || keys['ArrowDown'])  { nl = -SPEED; nr = -SPEED; changed = true; }
      if (keys['KeyA'] || keys['ArrowLeft'])  { nl = -SPEED; nr =  SPEED; changed = true; }
      if (keys['KeyD'] || keys['ArrowRight']) { nl =  SPEED; nr = -SPEED; changed = true; }
      if (keys['Space'])                      { nl = 0;      nr = 0;      changed = true; }
      if (changed) { state.motL = nl; state.motR = nr; syncSliders(); }
    }

    // ── Locomotion (differential drive) ──────────────────────────────────────
    if (!state.demo) {
      const v = (state.motL + state.motR) * 0.5 * 0.008;
      const w = (state.motR - state.motL) * 0.004;
      state.robotYaw += w;
      state.robotX   += Math.sin(state.robotYaw) * v;
      state.robotZ   += Math.cos(state.robotYaw) * v;
    }
    robot.position.set(state.robotX, 0, state.robotZ);
    robot.rotation.y = state.robotYaw;
    // IMU tilt layered on top of locomotion yaw
    robot.rotation.x = state.imuPitch;
    robot.rotation.z = state.imuRoll;

    // ── Camera follows robot ──────────────────────────────────────────────────
    orbit.target.set(state.robotX, 7, state.robotZ);

    // Camera
    camera.position.set(
      orbit.target.x + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      orbit.target.y + orbit.r * Math.cos(orbit.phi),
      orbit.target.z + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);

    // Wheel spin
    wheelL.userData.spinner.rotation.x -= state.motL * 0.003;
    wheelR.userData.spinner.rotation.x += state.motR * 0.003;

    // Demo motion
    if (state.demo) {
      state.demoTime += 0.016;
      const t = state.demoTime;
      state.shoulder = 40 + 30 * Math.sin(t * 0.7);
      state.elbow    = 10 + 25 * Math.sin(t * 0.9 + 0.5);
      state.base     = 45 * Math.sin(t * 0.4);
      state.grip     = 15 + 12 * Math.abs(Math.sin(t * 1.1));
      syncSliders();
    }

    applyServos();

    // Ultrasonic cone: length = measured distance, color by proximity
    const d   = Math.max(1, Math.min(200, state.distCm));
    ultraCone.scale.set(d, 1, 1);
    const pct   = d / 200;
    const cHex  = pct < 0.15 ? 0xff4444 : pct < 0.35 ? 0xffaa22 : 0x4488ff;
    ultraCone.userData.cone.material.color.setHex(cHex);
    ultraCone.userData.ring.material.color.setHex(cHex);

    setIRState(irL, state.irL);
    setIRState(irR, state.irR);

    renderer.render(scene, camera);
  }

  // ── Helper ────────────────────────────────────────────────────────────────

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

  // ── Boot ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    bindUI();
    pollSensors();
    setInterval(pollSensors, 5000);
    animate();
  });

})();
