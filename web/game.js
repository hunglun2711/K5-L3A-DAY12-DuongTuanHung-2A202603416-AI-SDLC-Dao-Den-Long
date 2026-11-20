/* Đảo Đèn Lồng — Phase 2 (3 Nights, Standard Palette, Dash, Drifters, Charms, Audio, HUD) */
(async function () {
  const res = await fetch('/game.contract.json');
  const contract = await res.json();
  const T = contract.tuning;
  const DT = 1 / 60;

  // Saved settings
  const settings = {
    vol: parseFloat(localStorage.getItem('ddl_vol') ?? '0.5'),
    sens: parseFloat(localStorage.getItem('ddl_sens') ?? '0.4'),
  };
  document.getElementById('optVol').value = settings.vol;
  document.getElementById('optSens').value = settings.sens;

  // Web Audio procedural SFX & ambient
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

  // Build 10 mote HUD slots
  const moteBar = document.getElementById('moteBar');
  for (let i = 0; i < 10; i++) {
    const d = document.createElement('div');
    d.className = 'mote-slot';
    moteBar.appendChild(d);
  }

  // Three.js scene with standard palette
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0E1430);
  scene.fog = new THREE.FogExp2(0x1B2350, 0.014);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 260);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x8FA3B8, 0.15);
  scene.add(ambientLight);
  const moonLight = new THREE.DirectionalLight(0x9fb8ff, 0.55);
  moonLight.position.set(20, 40, 15);
  scene.add(moonLight);

  // Cloud sea floor
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshBasicMaterial({ color: 0x12384A })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -10.5;
  scene.add(sea);

  // Player (Mây: áo #E8E2D0, khăn #C8102E, nón lá)
  const playerGroup = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.68, 6, 10), new THREE.MeshStandardMaterial({ color: 0xE8E2D0 }));
  body.position.y = 0.68; playerGroup.add(body);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 6, 12), new THREE.MeshStandardMaterial({ color: 0xC8102E }));
  scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.18; playerGroup.add(scarf);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.34, 16), new THREE.MeshStandardMaterial({ color: 0xC9B48A }));
  hat.position.y = 1.65; playerGroup.add(hat);
  const pLight = new THREE.PointLight(0xFFB347, 1.8, 12);
  pLight.position.y = 1.5; playerGroup.add(pLight);
  scene.add(playerGroup);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const QUOTES = {
    1: 'Ông Đăng: "Đêm đầu ở Đảo Bến, hãy gom đom đóm thắp lại 5 ngọn đèn, đừng để Bóng Mực chạm vào."',
    2: 'Ông Đăng: "Đảo Cau chia làm hai bờ. Dùng cầu tre, bục nhảy và Bùa Gió, cẩn thận lũ Gió Lạc."',
    3: 'Ông Đăng: "Đảo Chuông có 3 tầng và gió dữ. Thắp đủ 7 ngọn đèn để đón bình minh!"',
  };

  let curNight = 1, totalScore = 0, mode = 'menu', settingsReturn = 'menu';
  let sim = null;
  const lanternMeshes = [], moteMeshes = new Map(), shadeMeshes = new Map(), drifterMeshes = new Map(), charmMeshes = new Map();

  function polar(r, deg, y = 0) {
    const a = (deg * Math.PI) / 180;
    return [r * Math.cos(a), y, r * Math.sin(a)];
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

    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2F5D50 });
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xC9B48A });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4A2F });

    let lanterns = [], motePts = [], shadePts = [], charms = [], jumpPads = [], shadeSpeed = 4.0, shadeInt = 480, maxShades = 6;
    if (night === 1) {
      const g = new THREE.Mesh(new THREE.CylinderGeometry(40, 38, 2, 48), grassMat); g.position.y = -1; worldGroup.add(g);
      lanterns = [[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]];
      for (let i = 0; i < 8; i++) motePts.push(polar(12, i * 45));
      for (let i = 0; i < 16; i++) motePts.push(polar(33, i * 22.5));
      for (let i = 0; i < 12; i++) shadePts.push(polar(37, 15 + i * 30));
    } else if (night === 2) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(28, 26, 2, 40), grassMat); a.position.y = -1; worldGroup.add(a);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(28, 26, 2, 40), sandMat); b.position.set(70, -1, 0); worldGroup.add(b);
      const br = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), woodMat); br.position.set(35, -0.2, 0); worldGroup.add(br);
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
      const t0 = new THREE.Mesh(new THREE.CylinderGeometry(45, 43, 2, 48), grassMat); t0.position.y = -1; worldGroup.add(t0);
      const t1 = new THREE.Mesh(new THREE.CylinderGeometry(24, 24, 3, 32, 1, false, 0, Math.PI), sandMat);
      t1.rotation.y = -Math.PI / 2; t1.position.y = 1.5; worldGroup.add(t1);
      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 24), grassMat); t2.position.y = 3; worldGroup.add(t2);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 16), woodMat); tower.position.y = 10; worldGroup.add(tower);
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
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0xF2C14E }));
      pad.position.set(jp.pos[0], jp.pos[1] + 0.1, jp.pos[2]);
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

    sim.lanterns.forEach((l) => {
      const g = new THREE.Group(); g.position.set(l.pos[0], l.pos[1], l.pos[2]);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 3, 10), woodMat); post.position.y = 1.5; g.add(post);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x5B5F6E })); head.position.y = 3.4; g.add(head);
      const light = new THREE.PointLight(0xFFB347, 0, 18); light.position.y = 3.4; g.add(light);
      const ring = new THREE.Mesh(new THREE.RingGeometry(T.safe_radius - 0.1, T.safe_radius, 36), new THREE.MeshBasicMaterial({ color: 0xF2C14E, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
      worldGroup.add(g);
      lanternMeshes.push({ head, light, ring });
    });

    for (const c of sim.charms) {
      const cm = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0xC8102E, emissive: 0xF2C14E, emissiveIntensity: 0.7 }));
      cm.position.set(c.pos[0], c.pos[1] + 0.9, c.pos[2]);
      worldGroup.add(cm); charmMeshes.set(c.id, cm);
    }

    const shuffled = [...motePts].sort(() => Math.random() - 0.5).slice(0, 20);
    shuffled.forEach((p, idx) => addMote(p, idx));
    ambientLight.intensity = 0.15;
    showScreen(null);
    mode = 'playing';
  }

  let mSeq = 0, sSeq = 0, dSeq = 0;
  function addMote(pos, _i) {
    const id = `M${++mSeq}`;
    sim.motes.push({ id, pos: [...pos] });
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshStandardMaterial({ color: 0xFFF6C2, emissive: 0xFFE58A, emissiveIntensity: 1.6 }));
    m.position.set(pos[0], pos[1] + 0.8, pos[2]);
    worldGroup.add(m); moteMeshes.set(id, m);
  }
  function addShade(pos) {
    const id = `S${++sSeq}`;
    sim.shades.push({ id, pos: [...pos], state: 'chase', timer: 0 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0x120A1A, emissive: 0x7A3CFF, emissiveIntensity: 0.6 }));
    body.position.set(pos[0], pos[1] + 0.8, pos[2]);
    worldGroup.add(body); shadeMeshes.set(id, body);
    sfx(180, 0.25, 'sawtooth', 0.09);
  }
  function addDrifter(pos) {
    const id = `D${++dSeq}`;
    sim.drifters.push({ id, pos: [...pos], state: 'idle', stolen: 0, timer: 0, hasStolen: false });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 1.2), new THREE.MeshStandardMaterial({ color: 0x8FA3B8, emissive: 0x8FA3B8, emissiveIntensity: 0.4 }));
    m.position.set(pos[0], pos[1] + 1.2, pos[2]);
    worldGroup.add(m); drifterMeshes.set(id, m);
  }

  // Input & UI events
  const keys = {};
  let camYaw = 0, dragging = false, lastX = 0, prevJump = false, prevInt = false, prevPulse = false, prevDash = false;
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
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
    if (r <= 8 && y >= 5.5) h = 6;
    else if (r >= 12 && r <= 24 && z > 0 && y >= 2.5) h = 3;
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

    const dashNow = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyK']);
    if (dashNow && !prevDash && p.dashT === 0 && (p.dashCd === 0 || p.charmT > 0)) {
      p.dashT = 12; p.dashCd = p.charmT > 0 ? 0 : 90; p.dashDir = [...p.facing];
      sfx(500, 0.14, 'triangle', 0.1);
    }
    prevDash = dashNow;

    let vx = p.dashT > 0 ? p.dashDir[0] * T.dash_speed : (p.launched ? p.vel[0] : wx * (p.charmT > 0 ? 7.2 : T.player_speed));
    let vz = p.dashT > 0 ? p.dashDir[1] * T.dash_speed : (p.launched ? p.vel[2] : wz * (p.charmT > 0 ? 7.2 : T.player_speed));
    if (sim.windActive) { const wr = (sim.windDir * Math.PI) / 180; vx += 2 * Math.cos(wr); vz += 2 * Math.sin(wr); }
    p.pos[0] += vx * DT; p.pos[2] += vz * DT; p.vel[0] = vx; p.vel[2] = vz;

    const jNow = !!keys['Space'];
    if (jNow && !prevJump && p.grounded && p.dashT === 0) { p.vel[1] = 7; p.grounded = false; sfx(330, 0.1, 'triangle', 0.07); }
    prevJump = jNow;
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
    if (nearL && p.carried > 0) { promptEl.textContent = `E — Nạp ánh sáng (${nearL.deposited}/10)`; promptEl.style.display = 'block'; }
    else promptEl.style.display = 'none';

    const intNow = !!(keys['KeyE'] || keys['Enter']);
    if (intNow && !prevInt && nearL && p.carried > 0) {
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
    prevInt = intNow;

    const pulseNow = !!(keys['KeyQ'] || keys['KeyF']);
    if (pulseNow && !prevPulse && p.pulseCd === 0 && p.carried >= T.pulse_cost) {
      p.carried -= T.pulse_cost; p.pulseCd = 180; sfx(440, 0.3, 'sine', 0.12);
      for (const s of sim.shades) {
        if (Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) <= T.pulse_radius) {
          s.state = 'stunned'; s.timer = 120; sim.score += 5;
          const dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2], d = Math.hypot(dx, dz) || 1;
          s.pos[0] += (dx / d) * 4; s.pos[2] += (dz / d) * 4;
        }
      }
    }
    prevPulse = pulseNow;

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
    if (!sim) return;
    playerGroup.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
    playerGroup.visible = sim.player.invuln === 0 || Math.floor(now / 80) % 2 === 0;
    sim.lanterns.forEach((l, i) => {
      const lm = lanternMeshes[i];
      if (l.lit) { lm.head.material.color.setHex(0xFFB347); lm.head.material.emissive.setHex(0xFFE9B0); lm.head.material.emissiveIntensity = 1.4; lm.light.intensity = 3; lm.ring.material.opacity = 0.35; }
    });
    for (const m of sim.motes) { const mm = moteMeshes.get(m.id); if (mm) mm.position.y = m.pos[1] + 0.8 + Math.sin(now * 0.004 + m.pos[0]) * 0.2; }
    for (const s of sim.shades) { const sm = shadeMeshes.get(s.id); if (sm) { sm.position.set(s.pos[0], s.pos[1] + 0.8, s.pos[2]); sm.material.color.setHex(s.state === 'stunned' ? 0x3A3450 : 0x120A1A); } }
    for (const d of sim.drifters) { const dm = drifterMeshes.get(d.id); if (dm) { dm.visible = d.state !== 'removed'; dm.position.set(d.pos[0], d.pos[1] + 1.2, d.pos[2]); } }

    const th = (camYaw * Math.PI) / 180;
    camera.position.set(sim.player.pos[0] + Math.sin(th) * 9, sim.player.pos[1] + 5.5, sim.player.pos[2] + Math.cos(th) * 9);
    camera.lookAt(sim.player.pos[0], sim.player.pos[1] + 1.2, sim.player.pos[2]);

    // HUD updates
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
