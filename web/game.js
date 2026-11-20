/* Đảo Đèn Lồng — Phase 2 Enhanced 3D Visuals (Three.js, Standard Palette) */
(async function () {
  const res = await fetch('/game.contract.json');
  const contract = await res.json();
  const T = contract.tuning;
  const DT = 1 / 60;

  const settings = {
    vol: parseFloat(localStorage.getItem('ddl_vol') ?? '0.5'),
    sens: parseFloat(localStorage.getItem('ddl_sens') ?? '0.4'),
  };
  document.getElementById('optVol').value = settings.vol;
  document.getElementById('optSens').value = settings.sens;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function sfx(freq, dur, type = 'sine', g0 = 0.12) {
    if (settings.vol <= 0.01) return;
    try {
      if (!audioCtx) audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      g.gain.setValueAtTime(g0 * settings.vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }

  const moteBar = document.getElementById('moteBar');
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('div');
    d.className = 'mote-slot';
    moteBar.appendChild(d);
  }

  // Scene & Renderer with ACES Filmic tone mapping
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0E1430);
  scene.fog = new THREE.FogExp2(0x1B2350, 0.011);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 300);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x8FA3B8, 0.15);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0x4b5d99, 0x12384A, 0.35);
  scene.add(hemiLight);
  const moonLight = new THREE.DirectionalLight(0xcbdcff, 0.65);
  moonLight.position.set(28, 48, 20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.near = 5;
  moonLight.shadow.camera.far = 140;
  const dCam = 55;
  moonLight.shadow.camera.left = -dCam; moonLight.shadow.camera.right = dCam;
  moonLight.shadow.camera.top = dCam; moonLight.shadow.camera.bottom = -dCam;
  scene.add(moonLight);

  // Starfield & Moon
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 450; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.45;
    const r = 135;
    starPos.push(r * Math.cos(ph) * Math.cos(th), r * Math.sin(ph) + 10, r * Math.cos(ph) * Math.sin(th));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xFFF6C2, size: 0.9, transparent: true, opacity: 0.85 })));

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4.5, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xFFE9B0 })
  );
  moonMesh.position.set(56, 65, -75);
  scene.add(moonMesh);

  // Cloud Sea + Drifting 3D Cloud Puffs
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshBasicMaterial({ color: 0x12384A })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -10.5;
  scene.add(sea);

  const cloudPuffs = [];
  const puffGeo = new THREE.SphereGeometry(5.5, 12, 10);
  const puffMat = new THREE.MeshStandardMaterial({ color: 0x1B2350, roughness: 0.95, transparent: true, opacity: 0.78 });
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(puffGeo, puffMat);
    const a = (i / 28) * Math.PI * 2;
    const r = 52 + (i % 4) * 14;
    m.position.set(Math.cos(a) * r, -6.5 + (i % 3) * 1.4, Math.sin(a) * r);
    m.scale.set(2.1, 0.48, 1.5);
    scene.add(m);
    cloudPuffs.push({ mesh: m, a, r });
  }

  // Detailed Mây character
  const playerGroup = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.95, 14), new THREE.MeshStandardMaterial({ color: 0xE8E2D0, roughness: 0.75 }));
  robe.position.y = 0.55; robe.castShadow = true; playerGroup.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 14), new THREE.MeshStandardMaterial({ color: 0xf7d7c4, roughness: 0.6 }));
  head.position.y = 1.25; head.castShadow = true; playerGroup.add(head);
  const eyeMatP = new THREE.MeshBasicMaterial({ color: 0x120A1A });
  const pe1 = new THREE.Mesh(new THREE.SphereGeometry(0.035), eyeMatP); pe1.position.set(-0.09, 1.27, 0.22);
  const pe2 = new THREE.Mesh(new THREE.SphereGeometry(0.035), eyeMatP); pe2.position.set(0.09, 1.27, 0.22);
  playerGroup.add(pe1, pe2);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.065, 8, 16), new THREE.MeshStandardMaterial({ color: 0xC8102E, roughness: 0.6 }));
  scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.04; playerGroup.add(scarf);
  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.04), new THREE.MeshStandardMaterial({ color: 0xC8102E }));
  scarfTail.position.set(0.12, 0.85, -0.24); scarfTail.rotation.x = 0.25; playerGroup.add(scarfTail);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.34, 20), new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.7 }));
  hat.position.y = 1.52; hat.castShadow = true; playerGroup.add(hat);
  const miniLan = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), new THREE.MeshStandardMaterial({ color: 0xFFE9B0, emissive: 0xFFB347, emissiveIntensity: 1.8 }));
  miniLan.position.set(0.48, 1.32, 0.22); playerGroup.add(miniLan);
  const pLight = new THREE.PointLight(0xFFB347, 2.0, 13);
  pLight.position.set(0, 1.5, 0); playerGroup.add(pLight);

  const pulseWave = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.9, 36),
    new THREE.MeshBasicMaterial({ color: 0xFFE58A, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  pulseWave.rotation.x = -Math.PI / 2; pulseWave.position.y = 0.12;
  playerGroup.add(pulseWave);
  scene.add(playerGroup);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const QUOTES = {
    1: 'Ông Đăng: "Đêm đầu ở Đảo Bến, hãy gom đom đóm thắp lại 5 ngọn đèn, đừng để Bóng Mực chạm vào."',
    2: 'Ông Đăng: "Đảo Cau chia làm hai bờ. Dùng cầu tre, bục nhảy và Bùa Gió, cẩn thận lũ Gió Lạc."',
    3: 'Ông Đăng: "Đảo Chuông có 3 tầng và gió dữ. Thắp đủ 7 ngọn đèn để đón bình minh!"',
  };

  let curNight = 1, totalScore = 0, mode = 'menu', settingsReturn = 'menu';
  let sim = null, pulseAnim = 0;
  const lanternMeshes = [], moteMeshes = new Map(), shadeMeshes = new Map(), drifterMeshes = new Map(), charmMeshes = new Map();

  function polar(r, deg, y = 0) {
    const a = (deg * Math.PI) / 180;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  }

  function addDecoTree(x, y, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.24 * scale, 1.6 * scale, 7), new THREE.MeshStandardMaterial({ color: 0x6B4A2F }));
    trunk.position.y = 0.8 * scale; trunk.castShadow = true; g.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.1 * scale, 2.3 * scale, 8), new THREE.MeshStandardMaterial({ color: 0x2F5D50, roughness: 0.85 }));
    crown.position.y = 2.4 * scale; crown.castShadow = true; g.add(crown);
    g.position.set(x, y, z);
    worldGroup.add(g);
  }

  function showScreen(id) {
    for (const s of ['menuScreen', 'introScreen', 'pauseScreen', 'settingsScreen', 'resultScreen']) {
      document.getElementById(s).style.display = s === id ? 'flex' : 'none';
    }
    const playingUI = id === null;
    document.getElementById('hud').style.display = playingUI ? 'flex' : 'none';
    document.getElementById('moteBar').style.display = playingUI ? 'flex' : 'none';
    document.getElementById('cdBox').style.display = playingUI ? 'flex' : 'none';
  }

  function buildNight(night) {
    while (worldGroup.children.length) worldGroup.remove(worldGroup.children[0]);
    lanternMeshes.length = 0; moteMeshes.clear(); shadeMeshes.clear(); drifterMeshes.clear(); charmMeshes.clear();

    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2F5D50, roughness: 0.9 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.88 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4A2F, roughness: 0.85 });

    let lanterns = [], motePts = [], shadePts = [], charms = [], jumpPads = [], shadeSpeed = 4.0, shadeInt = 480, maxShades = 6;
    if (night === 1) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(40, 37, 2.6, 48), grassMat);
      g.position.y = -1.3; g.receiveShadow = true; worldGroup.add(g);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(39.6, 0.45, 8, 48), sandMat);
      rim.rotation.x = Math.PI / 2; rim.position.y = -0.05; worldGroup.add(rim);
      for (let i = 0; i < 10; i++) { const p = polar(35.5, i * 36 + 12); addDecoTree(p[0], 0, p[2], 0.9 + (i % 3) * 0.2); }
      lanterns = [[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]];
      for (let i = 0; i < 8; i++) motePts.push(polar(12, i * 45));
      for (let i = 0; i < 16; i++) motePts.push(polar(33, i * 22.5));
      for (let i = 0; i < 12; i++) shadePts.push(polar(37, 15 + i * 30));
    } else if (night === 2) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(28, 25.5, 2.6, 40), grassMat); a.position.y = -1.3; a.receiveShadow = true; worldGroup.add(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(28, 25.5, 2.6, 40), sandMat); b.position.set(70, -1.3, 0); b.receiveShadow = true; worldGroup.add(b);
      const br = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), woodMat); br.position.set(35, -0.2, 0); br.receiveShadow = true; worldGroup.add(br);
      for (let x = 27; x <= 43; x += 2) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 4.1), woodMat);
        plank.position.set(x, 0.02, 0); worldGroup.add(plank);
      }
      for (let i = 0; i < 6; i++) { const p = polar(24.5, i * 60 + 25); addDecoTree(p[0], 0, p[2], 0.95); }
      lanterns = [[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]];
      for (const cx of [0, 70]) {
        for (let i = 0; i < 4; i++) { const p = polar(10, i * 90); motePts.push([p[0]+cx, 0, p[2]]); }
        for (let i = 0; i < 8; i++) { const p = polar(22, i * 45); motePts.push([p[0]+cx, 0, p[2]]); }
        for (let i = 0; i < 8; i++) { const p = polar(26, 22.5 + i * 45); shadePts.push([p[0]+cx, 0, p[2]]); }
      }
      charms = [{ id: 'C1', pos: [35, 0, 0], available: true, respawn: 0 }];
      jumpPads = [{ pos: [20,0,18], target: [70,0,0], vy: 14, vh: 24 }, { pos: [50,0,-18], target: [0,0,0], vy: 14, vh: 24 }];
      shadeInt = 420; maxShades = 8;
    } else {
      const t0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 42, 2.6, 48), grassMat); t0.position.y = -1.3; t0.receiveShadow = true; worldGroup.add(t0);
      // Tier 1: elevated half-annulus (12..24m, z > 0, Y = 3)
      const t1Shape = new THREE.Shape();
      t1Shape.absarc(0, 0, 24, 0, Math.PI, false);
      t1Shape.absarc(0, 0, 12, Math.PI, 0, true);
      const t1Geo = new THREE.ExtrudeGeometry(t1Shape, { depth: 0.6, bevelEnabled: false, curveSegments: 32 });
      const t1 = new THREE.Mesh(t1Geo, sandMat);
      t1.rotation.x = Math.PI / 2; t1.position.y = 3.0; t1.receiveShadow = true; worldGroup.add(t1);
      // Tier 2: elevated disk (r <= 8m, Y = 6) supported by pillars so (0,0,0) is open
      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.7, 28), grassMat);
      t2.position.y = 5.65; t2.receiveShadow = true; worldGroup.add(t2);
      for (const a of [45, 135, 225, 315]) {
        const pp = polar(6.2, a, 0);
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 6, 10), woodMat);
        pil.position.set(pp[0], 3, pp[2]); worldGroup.add(pil);
      }
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 8, 16), woodMat); tower.position.y = 10; tower.castShadow = true; worldGroup.add(tower);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0xC8102E })); roof.position.y = 15.1; worldGroup.add(roof);
      // 2 Ramps at 30 deg & 150 deg (r=30 Y=0 -> r=24 Y=3)
      for (const deg of [30, 150]) {
        const rad = (deg * Math.PI) / 180;
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.4, 3.0), woodMat);
        ramp.position.set(27 * Math.cos(rad), 1.35, 27 * Math.sin(rad));
        ramp.rotation.y = -rad;
        ramp.rotation.z = Math.atan2(3, 6);
        worldGroup.add(ramp);
      }
      lanterns = [[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]];
      for (let i = 0; i < 18; i++) motePts.push(polar(34, i * 20, 0));
      for (let i = 0; i < 8; i++) motePts.push(polar(18, 20 + i * 20, 3));
      for (let i = 0; i < 4; i++) motePts.push(polar(5, 45 + i * 90, 6));
      for (let i = 0; i < 16; i++) shadePts.push(polar(43, i * 22.5, 0));
      charms = [{ id: 'C1', pos: [30,0,25], available: true, respawn: 0 }, { id: 'C2', pos: [-30,0,25], available: true, respawn: 0 }];
      jumpPads = [{ pos: [0,3,13], dir: [0,-1], vy: 12, vh: 8 }];
      shadeSpeed = 4.5; shadeInt = 360; maxShades = 10;
    }

    for (const jp of jumpPads) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.25, 20), new THREE.MeshStandardMaterial({ color: 0xF2C14E, emissive: 0xFFB347, emissiveIntensity: 0.6 }));
      pad.position.set(jp.pos[0], jp.pos[1] + 0.12, jp.pos[2]);
      worldGroup.add(pad);
    }

    sim = {
      night, state: 'playing', score: 0, ticks: 0,
      timeLeft: T[`night${night}_duration_s`] || 300,
      player: { pos: [0,0,0], vel: [0,0,0], facing: [0,1], grounded: true, carried: 0, flames: T.flames, invuln: 0, dashT: 0, dashDir: [0,1], dashCd: 0, pulseCd: 0, charmT: 0, launched: false },
      lanterns: lanterns.map((p, i) => ({ id: `L${i+1}`, pos: p, lit: false, deposited: 0 })),
      motes: [], shades: [], drifters: [], charms,
      motePts, shadePts, jumpPads, shadeSpeed, shadeInt, maxShades,
      windActive: false, windDir: 0, windTimer: 1800,
    };

    // Detailed Great Lanterns
    sim.lanterns.forEach((l) => {
      const g = new THREE.Group(); g.position.set(l.pos[0], l.pos[1], l.pos[2]);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.45, 8), woodMat); base.position.y = 0.22; g.add(base);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 2.7, 10), woodMat); post.position.y = 1.65; post.castShadow = true; g.add(post);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.05, 0.86), new THREE.MeshStandardMaterial({ color: 0x5B5F6E, roughness: 0.5 }));
      head.position.y = 3.35; head.castShadow = true; g.add(head);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.55, 4), woodMat);
      roof.position.y = 4.15; roof.rotation.y = Math.PI / 4; g.add(roof);
      const light = new THREE.PointLight(0xFFB347, 0, 22); light.position.y = 3.35; g.add(light);
      const ring = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.14, T.safe_radius, 48), new THREE.MeshBasicMaterial({ color: 0xF2C14E, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
      worldGroup.add(g);
      lanternMeshes.push({ head, light, ring });
    });

    for (const c of sim.charms) {
      const cm = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), new THREE.MeshStandardMaterial({ color: 0xC8102E, emissive: 0xF2C14E, emissiveIntensity: 0.85 }));
      cm.position.set(c.pos[0], c.pos[1] + 0.95, c.pos[2]);
      worldGroup.add(cm); charmMeshes.set(c.id, cm);
    }

    const shuffled = [...motePts].sort(() => Math.random() - 0.5).slice(0, 20);
    shuffled.forEach((p, idx) => addMote(p, idx));
    ambientLight.intensity = 0.15;
    queuedJump = queuedInt = queuedPulse = queuedDash = false;
    showScreen(null);
    mode = 'playing';
  }

  let mSeq = 0, sSeq = 0, dSeq = 0;
  function addMote(pos) {
    const id = `M${++mSeq}`;
    sim.motes.push({ id, pos: [...pos] });
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshStandardMaterial({ color: 0xFFF6C2, emissive: 0xFFE58A, emissiveIntensity: 2.0 }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), new THREE.MeshBasicMaterial({ color: 0xFFE58A, transparent: true, opacity: 0.28 }));
    g.add(core, halo);
    g.position.set(pos[0], pos[1] + 0.85, pos[2]);
    worldGroup.add(g); moteMeshes.set(id, g);
  }
  function addShade(pos) {
    const id = `S${++sSeq}`;
    sim.shades.push({ id, pos: [...pos], state: 'chase', timer: 0 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.55, 12), new THREE.MeshStandardMaterial({ color: 0x120A1A, emissive: 0x7A3CFF, emissiveIntensity: 0.65 }));
    body.position.y = 0.8; body.castShadow = true; g.add(body);
    const eMat = new THREE.MeshBasicMaterial({ color: 0x7A3CFF });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.08), eMat); e1.position.set(-0.14, 1.05, 0.34);
    const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.08), eMat); e2.position.set(0.14, 1.05, 0.34);
    g.add(e1, e2);
    g.position.set(pos[0], pos[1], pos[2]);
    worldGroup.add(g); shadeMeshes.set(id, { group: g, body });
    sfx(180, 0.25, 'sawtooth', 0.09);
  }
  function addDrifter(pos) {
    const id = `D${++dSeq}`;
    sim.drifters.push({ id, pos: [...pos], state: 'idle', stolen: 0, timer: 0, hasStolen: false });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 1.4), new THREE.MeshStandardMaterial({ color: 0x8FA3B8, emissive: 0x8FA3B8, emissiveIntensity: 0.45 }));
    m.position.set(pos[0], pos[1] + 1.3, pos[2]);
    worldGroup.add(m); drifterMeshes.set(id, m);
  }

  const keys = {};
  let camYaw = 0, dragging = false, lastX = 0;
  let queuedJump = false, queuedInt = false, queuedPulse = false, queuedDash = false;
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (!e.repeat && mode === 'playing') {
      if (e.code === 'Space') queuedJump = true;
      if (e.code === 'KeyE' || e.code === 'Enter') queuedInt = true;
      if (e.code === 'KeyQ' || e.code === 'KeyF') queuedPulse = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') queuedDash = true;
    }
    if ((e.code === 'Escape' || e.code === 'KeyP') && (mode === 'playing' || mode === 'paused')) {
      mode = mode === 'playing' ? 'paused' : 'playing';
      showScreen(mode === 'paused' ? 'pauseScreen' : null);
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => { if (dragging) { camYaw -= (e.clientX - lastX) * settings.sens; lastX = e.clientX; } });

  function startIntro(n) {
    curNight = n;
    document.getElementById('introTitle').textContent = `Đêm ${n} — ${n === 1 ? 'Đảo Bến' : n === 2 ? 'Đảo Cau' : 'Đảo Chuông'}`;
    document.getElementById('introQuote').textContent = QUOTES[n];
    showScreen('introScreen');
  }
  document.getElementById('btnStart').onclick = () => { totalScore = 0; startIntro(1); };
  document.getElementById('btnNight2').onclick = () => { totalScore = 0; startIntro(2); };
  document.getElementById('btnNight3').onclick = () => { totalScore = 0; startIntro(3); };
  document.getElementById('btnBeginNight').onclick = () => buildNight(curNight);
  document.getElementById('btnResume').onclick = () => { mode = 'playing'; showScreen(null); };
  document.getElementById('btnRestartNight').onclick = () => buildNight(curNight);
  document.getElementById('btnToMenu').onclick = () => { mode = 'menu'; showScreen('menuScreen'); };
  document.getElementById('btnResMenu').onclick = () => { mode = 'menu'; showScreen('menuScreen'); };
  document.getElementById('btnSettings').onclick = () => { settingsReturn = 'menuScreen'; showScreen('settingsScreen'); };
  document.getElementById('btnPauseSettings').onclick = () => { settingsReturn = 'pauseScreen'; showScreen('settingsScreen'); };
  document.getElementById('btnCloseSettings').onclick = () => {
    settings.vol = parseFloat(document.getElementById('optVol').value);
    settings.sens = parseFloat(document.getElementById('optSens').value);
    localStorage.setItem('ddl_vol', settings.vol);
    localStorage.setItem('ddl_sens', settings.sens);
    showScreen(settingsReturn);
  };

  function floorY(x, z, y) {
    if (sim.night === 1) return Math.hypot(x, z) <= 40 ? 0 : null;
    if (sim.night === 2) return (Math.hypot(x, z) <= 28 || Math.hypot(x - 70, z) <= 28 || (x >= 26 && x <= 44 && Math.abs(z) <= 2)) ? 0 : null;
    const r = Math.hypot(x, z);
    if (r > 45) return null;
    let h = 0;
    if (r <= 8 && y >= 5.5) h = Math.max(h, 6);
    if (r >= 12 && r <= 24 && z > 0 && y >= 2.5) h = Math.max(h, 3);
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const ca = Math.cos(rad), sa = Math.sin(rad);
      const proj = x * ca + z * sa;
      const perp = Math.abs(-x * sa + z * ca);
      if (proj >= 24 && proj <= 30 && perp <= 1.5) {
        const ry = 3 * (30 - proj) / 6;
        if (y >= ry - 0.5) h = Math.max(h, ry);
      }
    }
    return h;
  }

  function stepSim() {
    if (mode !== 'playing' || !sim || sim.state !== 'playing') return;
    sim.ticks++;
    sim.timeLeft = Math.max(0, sim.timeLeft - DT);
    const p = sim.player;
    if (p.invuln > 0) p.invuln--;
    if (p.dashCd > 0) p.dashCd--;
    if (p.pulseCd > 0) p.pulseCd--;
    if (p.charmT > 0) p.charmT--;
    if (p.dashT > 0) p.dashT--;

    if (sim.night === 3) {
      sim.windTimer--;
      document.getElementById('windWarn').style.display = (!sim.windActive && sim.windTimer <= 120) ? 'block' : 'none';
      if (sim.windTimer <= 0) {
        sim.windActive = !sim.windActive;
        if (sim.windActive) { sim.windDir = Math.random() * 360; sim.windTimer = 300; }
        else sim.windTimer = 1500;
      }
    }

    let mx = 0, mz = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
    const th = (camYaw * Math.PI) / 180;
    let wx = mx * Math.cos(th) + mz * Math.sin(th);
    let wz = -mx * Math.sin(th) + mz * Math.cos(th);
    const mag = Math.hypot(wx, wz);
    if (mag > 1) { wx /= mag; wz /= mag; }
    if (mag > 0.05) { p.facing = [wx / (mag || 1), wz / (mag || 1)]; playerGroup.rotation.y = Math.atan2(wx, wz); }

    const doDash = queuedDash; queuedDash = false;
    if (doDash && p.dashT === 0 && (p.dashCd === 0 || p.charmT > 0)) {
      p.dashT = 12; p.dashCd = p.charmT > 0 ? 0 : 90; p.dashDir = [...p.facing];
      sfx(500, 0.14, 'triangle', 0.1);
    }

    let vx = p.dashT > 0 ? p.dashDir[0] * T.dash_speed : (p.launched ? p.vel[0] : wx * (p.charmT > 0 ? 7.2 : T.player_speed));
    let vz = p.dashT > 0 ? p.dashDir[1] * T.dash_speed : (p.launched ? p.vel[2] : wz * (p.charmT > 0 ? 7.2 : T.player_speed));
    if (sim.windActive) { const wr = (sim.windDir * Math.PI) / 180; vx += 2 * Math.cos(wr); vz += 2 * Math.sin(wr); }
    p.pos[0] += vx * DT; p.pos[2] += vz * DT; p.vel[0] = vx; p.vel[2] = vz;

    const doJump = queuedJump; queuedJump = false;
    if (doJump && p.grounded && p.dashT === 0) { p.vel[1] = 7; p.grounded = false; sfx(330, 0.1, 'triangle', 0.07); }
    if (p.dashT === 0) {
      const gh = floorY(p.pos[0], p.pos[2], p.pos[1]);
      if (!p.grounded || gh === null || p.pos[1] > gh + 0.02) {
        p.vel[1] -= 20 * DT; p.pos[1] += p.vel[1] * DT;
        const gh2 = floorY(p.pos[0], p.pos[2], p.pos[1]);
        if (gh2 !== null && p.pos[1] <= gh2 && p.vel[1] <= 0) { p.pos[1] = gh2; p.vel[1] = 0; p.grounded = true; p.launched = false; }
        else p.grounded = false;
      } else { p.pos[1] = gh; p.vel[1] = 0; p.grounded = true; p.launched = false; }
    }

    for (const jp of sim.jumpPads) {
      if (Math.hypot(p.pos[0] - jp.pos[0], p.pos[2] - jp.pos[2]) <= 1.1 && Math.abs(p.pos[1] - jp.pos[1]) <= 1) {
        let ux = jp.dir ? jp.dir[0] : (jp.target[0] - jp.pos[0]), uz = jp.dir ? jp.dir[1] : (jp.target[2] - jp.pos[2]);
        const d = Math.hypot(ux, uz) || 1;
        p.vel = [(ux / d) * jp.vh, jp.vy, (uz / d) * jp.vh]; p.grounded = false; p.launched = true;
      }
    }

    if (p.pos[1] < -10) {
      p.flames--; p.carried = 0; p.pos = [0, 0, 0]; p.vel = [0, 0, 0]; p.invuln = 90; p.launched = false;
      sfx(120, 0.35, 'sawtooth', 0.14);
      if (p.flames <= 0) return finishNight(false, 'Mây đã tắt hết Ngọn Lửa.');
    }

    for (let i = sim.motes.length - 1; i >= 0; i--) {
      const m = sim.motes[i];
      if (p.carried < T.carry_capacity && Math.hypot(p.pos[0] - m.pos[0], p.pos[2] - m.pos[2]) <= 1 && Math.abs(p.pos[1] - m.pos[1]) <= 1.5) {
        p.carried++; worldGroup.remove(moteMeshes.get(m.id)); moteMeshes.delete(m.id); sim.motes.splice(i, 1);
        sfx(660 + p.carried * 40, 0.12, 'sine', 0.08);
      }
    }
    for (const c of sim.charms) {
      if (!c.available && c.respawn > 0 && --c.respawn === 0) { c.available = true; charmMeshes.get(c.id).visible = true; }
      if (c.available && Math.hypot(p.pos[0] - c.pos[0], p.pos[2] - c.pos[2]) <= 1.2) {
        c.available = false; c.respawn = 2700; p.charmT = 600; charmMeshes.get(c.id).visible = false; sfx(880, 0.25, 'sine', 0.1);
      }
    }

    let nearL = null;
    for (const l of sim.lanterns) if (!l.lit && Math.hypot(p.pos[0] - l.pos[0], p.pos[2] - l.pos[2]) <= T.interact_radius) { nearL = l; break; }
    const promptEl = document.getElementById('prompt');
    if (nearL) {
      promptEl.textContent = p.carried > 0 ? `E — Nạp ánh sáng (${nearL.deposited}/10)` : `Đứng gần đèn (${nearL.deposited}/10) — Hãy nhặt thêm đom đóm`;
      promptEl.style.display = 'block';
    } else promptEl.style.display = 'none';

    const doInt = queuedInt; queuedInt = false;
    if (doInt && nearL && p.carried > 0) {
      const amt = Math.min(p.carried, T.lantern_cost - nearL.deposited);
      p.carried -= amt; nearL.deposited += amt; sim.score += amt * 10; sfx(520, 0.18, 'sine', 0.09);
      if (nearL.deposited >= T.lantern_cost) {
        nearL.lit = true; sim.score += 100; sfx(784, 0.4, 'triangle', 0.12);
        const litC = sim.lanterns.filter((x) => x.lit).length;
        ambientLight.intensity = 0.15 + 0.55 * (litC / sim.lanterns.length);
        if (litC === sim.lanterns.length) {
          sim.score += Math.floor(sim.timeLeft) * 2 + p.flames * 50;
          return finishNight(true, `Thắp sáng toàn bộ ${sim.lanterns.length} đèn! Điểm Đêm ${sim.night}: ${sim.score}`);
        }
      }
    }

    const doPulse = queuedPulse; queuedPulse = false;
    if (doPulse && p.pulseCd === 0 && p.carried >= T.pulse_cost) {
      p.carried -= T.pulse_cost; p.pulseCd = 180; pulseAnim = 1.0; sfx(440, 0.3, 'sine', 0.12);
      for (const s of sim.shades) {
        if (Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) <= T.pulse_radius) {
          s.state = 'stunned'; s.timer = 120; sim.score += 5;
          const dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2], d = Math.hypot(dx, dz) || 1;
          s.pos[0] += (dx / d) * 4; s.pos[2] += (dz / d) * 4;
        }
      }
    }

    if (sim.ticks % 240 === 0 && sim.motes.length < 30) addMote(sim.motePts[Math.floor(Math.random() * sim.motePts.length)]);
    if (sim.ticks >= 300 && (sim.ticks === 300 || (sim.ticks - 300) % sim.shadeInt === 0) && sim.shades.length < sim.maxShades) {
      const cnt = sim.ticks === 300 ? 2 : 1;
      for (let i = 0; i < cnt && sim.shades.length < sim.maxShades; i++) addShade(sim.shadePts[Math.floor(Math.random() * sim.shadePts.length)]);
    }
    if (sim.night >= 2 && sim.ticks % 1200 === 0 && sim.drifters.length < 2) addDrifter(sim.shadePts[Math.floor(Math.random() * sim.shadePts.length)]);

    for (const s of sim.shades) {
      if (s.state === 'stunned') { if (--s.timer <= 0) s.state = 'chase'; continue; }
      const dx = p.pos[0] - s.pos[0], dz = p.pos[2] - s.pos[2], d = Math.hypot(dx, dz) || 1;
      s.pos[0] += (dx / d) * sim.shadeSpeed * DT; s.pos[2] += (dz / d) * sim.shadeSpeed * DT;
      for (const l of sim.lanterns) {
        if (!l.lit) continue;
        const ldx = s.pos[0] - l.pos[0], ldz = s.pos[2] - l.pos[2], ld = Math.hypot(ldx, ldz) || 1;
        if (ld < T.safe_radius) { s.pos[0] = l.pos[0] + (ldx / ld) * (T.safe_radius + 0.05); s.pos[2] = l.pos[2] + (ldz / ld) * (T.safe_radius + 0.05); }
      }
      if (p.invuln === 0 && Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) <= 1) {
        p.flames--; p.carried -= Math.floor(p.carried / 2); p.invuln = 90; sfx(110, 0.3, 'sawtooth', 0.14);
        if (p.flames <= 0) return finishNight(false, 'Mây đã tắt hết Ngọn Lửa trước Bóng Mực.');
      }
    }

    for (const dr of sim.drifters) {
      if (dr.state === 'removed') continue;
      const d = Math.hypot(p.pos[0] - dr.pos[0], p.pos[2] - dr.pos[2]);
      if (dr.state === 'idle' && p.carried >= 5 && d <= 15) dr.state = 'chase';
      else if (dr.state === 'chase') {
        if (d <= 1.2 && !dr.hasStolen && p.carried > 0) { const a = Math.min(3, p.carried); p.carried -= a; dr.stolen = a; dr.hasStolen = true; dr.state = 'flee'; dr.timer = 240; }
        else { const dx = p.pos[0] - dr.pos[0], dz = p.pos[2] - dr.pos[2]; dr.pos[0] += (dx / (d || 1)) * 7 * DT; dr.pos[2] += (dz / (d || 1)) * 7 * DT; }
      } else if (dr.state === 'flee') {
        const dx = dr.pos[0] - p.pos[0], dz = dr.pos[2] - p.pos[2], dd = Math.hypot(dx, dz) || 1;
        dr.pos[0] += (dx / dd) * 7 * DT; dr.pos[2] += (dz / dd) * 7 * DT;
        if (--dr.timer <= 0) dr.state = 'removed';
      }
    }

    if (sim.timeLeft <= 0) return finishNight(false, 'Bình minh đã lên.');
  }

  function finishNight(won, msg) {
    mode = 'result';
    if (won) totalScore += sim.score;
    sfx(won ? 880 : 140, 0.5, 'triangle', 0.14);
    const btn = document.getElementById('btnNextOrRetry');
    const replayBtn = document.getElementById('btnReplayThis');
    replayBtn.style.display = won ? 'inline-block' : 'none';
    replayBtn.onclick = () => buildNight(curNight);
    if (won && curNight < 3) {
      document.getElementById('resTitle').textContent = `Qua Đêm ${curNight}!`;
      document.getElementById('resDesc').textContent = `${msg} · Tổng điểm: ${totalScore}`;
      btn.textContent = `Sang Đêm ${curNight + 1}`;
      btn.onclick = () => startIntro(curNight + 1);
    } else if (won && curNight === 3) {
      document.getElementById('resTitle').textContent = 'Bình Minh Trên Ba Hòn Đảo!';
      document.getElementById('resDesc').textContent = `Chúc mừng! Bạn đã hoàn thành cả 3 Đêm! Tổng điểm cuối: ${totalScore}`;
      btn.textContent = 'Chơi lại từ Đêm 1';
      btn.onclick = () => { totalScore = 0; startIntro(1); };
    } else {
      document.getElementById('resTitle').textContent = 'Đêm Tàn...';
      document.getElementById('resDesc').textContent = msg;
      btn.textContent = `Chơi lại Đêm ${curNight}`;
      btn.onclick = () => buildNight(curNight);
    }
    showScreen('resultScreen');
  }

  function syncVisuals(now) {
    for (const cp of cloudPuffs) {
      cp.a += 0.00025;
      cp.mesh.position.x = Math.cos(cp.a) * cp.r;
      cp.mesh.position.z = Math.sin(cp.a) * cp.r;
    }
    if (!sim) return;
    playerGroup.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
    playerGroup.visible = sim.player.invuln === 0 || Math.floor(now / 80) % 2 === 0;
    miniLan.position.x = 0.48 + Math.sin(now * 0.005) * 0.04;

    if (pulseAnim > 0) {
      pulseAnim = Math.max(0, pulseAnim - 0.04);
      const sc = 1 + (1 - pulseAnim) * T.pulse_radius * 1.4;
      pulseWave.scale.set(sc, sc, 1);
      pulseWave.material.opacity = pulseAnim * 0.75;
    } else pulseWave.material.opacity = 0;

    sim.lanterns.forEach((l, i) => {
      const lm = lanternMeshes[i];
      if (l.lit) {
        lm.head.material.color.setHex(0xFFB347); lm.head.material.emissive.setHex(0xFFE9B0);
        lm.head.material.emissiveIntensity = 1.5; lm.light.intensity = 3.4; lm.ring.material.opacity = 0.35;
      } else if (l.deposited > 0) {
        lm.head.material.emissive.setHex(0xFFB347);
        lm.head.material.emissiveIntensity = 0.55 * (l.deposited / 10);
        lm.light.intensity = 0.6;
      }
    });
    for (const m of sim.motes) { const mm = moteMeshes.get(m.id); if (mm) mm.position.y = m.pos[1] + 0.85 + Math.sin(now * 0.0045 + m.pos[0]) * 0.24; }
    for (const s of sim.shades) {
      const sm = shadeMeshes.get(s.id);
      if (sm) {
        sm.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
        sm.body.material.color.setHex(s.state === 'stunned' ? 0x3A3450 : 0x120A1A);
        sm.group.rotation.y += s.state === 'stunned' ? 0.18 : 0.04;
      }
    }
    for (const d of sim.drifters) { const dm = drifterMeshes.get(d.id); if (dm) { dm.visible = d.state !== 'removed'; dm.position.set(d.pos[0], d.pos[1] + 1.3 + Math.sin(now * 0.006) * 0.15, d.pos[2]); } }
    for (const c of sim.charms) { const cm = charmMeshes.get(c.id); if (cm && c.available) { cm.rotation.y += 0.03; cm.position.y = c.pos[1] + 0.95 + Math.sin(now * 0.004) * 0.15; } }

    const th = (camYaw * Math.PI) / 180;
    camera.position.set(sim.player.pos[0] + Math.sin(th) * 9.5, sim.player.pos[1] + 5.6, sim.player.pos[2] + Math.cos(th) * 9.5);
    camera.lookAt(sim.player.pos[0], sim.player.pos[1] + 1.2, sim.player.pos[2]);

    document.getElementById('hudFlames').textContent = sim.player.flames;
    document.getElementById('hudCharm').textContent = sim.player.charmT > 0 ? `🪶 Bùa ${Math.ceil(sim.player.charmT / 60)}s` : '';
    const secs = Math.ceil(sim.timeLeft);
    const tEl = document.getElementById('hudTime');
    tEl.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    tEl.className = secs <= 30 ? 'danger' : 'gold';
    document.getElementById('hudLanterns').textContent = `${sim.lanterns.filter((x) => x.lit).length} / ${sim.lanterns.length}`;
    document.getElementById('hudScore').textContent = sim.score;
    document.getElementById('cdDash').textContent = sim.player.dashCd > 0 ? `${(sim.player.dashCd / 60).toFixed(1)}s` : 'Sẵn sàng';
    document.getElementById('cdPulse').textContent = sim.player.pulseCd > 0 ? `${(sim.player.pulseCd / 60).toFixed(1)}s` : 'Sẵn sàng';
    const slots = moteBar.children;
    for (let i = 0; i < 10; i++) slots[i].className = i < sim.player.carried ? 'mote-slot filled' : 'mote-slot';
  }

  let acc = 0, last = performance.now();
  function loop(now) {
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    while (acc >= DT) { stepSim(); acc -= DT; }
    syncVisuals(now);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
})();
