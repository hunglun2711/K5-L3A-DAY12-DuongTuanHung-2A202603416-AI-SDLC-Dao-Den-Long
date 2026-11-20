/* Đảo Đèn Lồng — 3D WebGL Game (Three.js) reading game.contract.json */
(async function () {
  const res = await fetch('/game.contract.json');
  const contract = await res.json();
  const T = contract.tuning;

  const ISLAND_RADIUS = 32.0;
  const DT = 1 / 60;

  // Web Audio procedural sound effects (no external assets)
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function playTone(freq, dur, type = 'sine', gainVal = 0.08) {
    try {
      if (!audioCtx) audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      g.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }

  // Scene, camera, renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090614);
  scene.fog = new THREE.FogExp2(0x090614, 0.016);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x4a3b69, 0.55);
  scene.add(ambientLight);
  const moonLight = new THREE.DirectionalLight(0x9fb8ff, 0.6);
  moonLight.position.set(18, 30, 12);
  scene.add(moonLight);

  // Đảo Bến (circular island)
  const islandGeo = new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS * 0.9, 2.4, 48);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x1e2b2e, roughness: 0.9 });
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = -1.2;
  scene.add(island);

  // Decorative sea of clouds below
  const clouds = [];
  const cloudGeo = new THREE.SphereGeometry(4.5, 12, 10);
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0x1b1830, transparent: true, opacity: 0.72 });
  for (let i = 0; i < 24; i++) {
    const c = new THREE.Mesh(cloudGeo, cloudMat);
    const a = (i / 24) * Math.PI * 2;
    const r = ISLAND_RADIUS + 8 + (i % 3) * 6;
    c.position.set(Math.cos(a) * r, -5.5 + (i % 2) * 1.2, Math.sin(a) * r);
    c.scale.set(1.8, 0.5, 1.4);
    scene.add(c);
    clouds.push({ mesh: c, angle: a, radius: r });
  }

  // Mây (player with nón lá + small hanging lantern)
  const playerGroup = new THREE.Group();
  const bodyMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.7, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x4f7cac })
  );
  bodyMesh.position.y = 0.7;
  playerGroup.add(bodyMesh);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf7d7c4 })
  );
  headMesh.position.y = 1.45;
  playerGroup.add(headMesh);

  const nonLaMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 0.36, 16),
    new THREE.MeshStandardMaterial({ color: 0xd9b36c, roughness: 0.7 })
  );
  nonLaMesh.position.y = 1.72;
  playerGroup.add(nonLaMesh);

  const miniLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffb84d, emissive: 0xff9900, emissiveIntensity: 1.5 })
  );
  miniLantern.position.set(0.45, 1.5, 0.25);
  playerGroup.add(miniLantern);

  const playerLight = new THREE.PointLight(0xffae42, 2.0, 12);
  playerLight.position.set(0, 1.6, 0);
  playerGroup.add(playerLight);

  const pulseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.7, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.08;
  playerGroup.add(pulseRing);
  scene.add(playerGroup);

  // Game state
  let state, sim;
  const lanternMeshes = [];
  const moteMeshes = new Map();
  const shadeMeshes = new Map();
  let pulseAnim = 0;

  function clearGroup(map) {
    for (const m of map.values()) scene.remove(m);
    map.clear();
  }

  function initGame() {
    for (const lm of lanternMeshes) scene.remove(lm.group);
    lanternMeshes.length = 0;
    clearGroup(moteMeshes);
    clearGroup(shadeMeshes);

    sim = {
      state: 'playing',
      score: 0,
      timeLeft: T.night1_duration_s,
      player: { pos: [0, 0, 0], vy: 0, grounded: true, carried: 0, flames: T.flames, invuln: 0, pulseCd: 0 },
      lanterns: [],
      motes: [],
      shades: [],
      moteSeq: 0,
      shadeSeq: 0,
      ticks: 0,
    };

    for (let i = 0; i < T.lantern_count_night1; i++) {
      const a = (2 * Math.PI * i) / T.lantern_count_night1;
      const x = 20 * Math.sin(a);
      const z = 20 * Math.cos(a);
      const lan = { id: `L${i + 1}`, pos: [x, 0, z], lit: false, deposited: 0 };
      sim.lanterns.push(lan);

      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.35, 3.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x3b3348 })
      );
      post.position.y = 1.6;
      g.add(post);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.1, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x463a5c, emissive: 0x221833, emissiveIntensity: 0.4 })
      );
      head.position.y = 3.5;
      g.add(head);

      const light = new THREE.PointLight(0xffb84d, 0, 18);
      light.position.y = 3.5;
      g.add(light);

      const safeRing = new THREE.Mesh(
        new THREE.RingGeometry(T.safe_radius - 0.12, T.safe_radius, 48),
        new THREE.MeshBasicMaterial({ color: 0xffc266, side: THREE.DoubleSide, transparent: true, opacity: 0 })
      );
      safeRing.rotation.x = -Math.PI / 2;
      safeRing.position.y = 0.05;
      g.add(safeRing);

      scene.add(g);
      lanternMeshes.push({ group: g, head, light, safeRing });
    }

    for (let i = 0; i < 15; i++) spawnMote();
    for (let i = 0; i < 3; i++) spawnShade();
    document.getElementById('overlay').style.display = 'none';
    ambientLight.intensity = 0.55;
    scene.fog.density = 0.016;
  }

  function spawnMote() {
    const a = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 24;
    const id = `M${++sim.moteSeq}`;
    const pos = [r * Math.cos(a), 0, r * Math.sin(a)];
    sim.motes.push({ id, pos });
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffaa00, emissiveIntensity: 1.8 })
    );
    mesh.position.set(pos[0], 0.8, pos[2]);
    scene.add(mesh);
    moteMeshes.set(id, mesh);
  }

  function spawnShade() {
    const a = Math.random() * Math.PI * 2;
    const r = 22 + Math.random() * 7;
    const id = `S${++sim.shadeSeq}`;
    const pos = [r * Math.cos(a), 0, r * Math.sin(a)];
    sim.shades.push({ id, pos, state: 'chase', stunTimer: 0 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x160a24, emissive: 0x3b0764, emissiveIntensity: 0.7 })
    );
    body.position.y = 0.8;
    g.add(body);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd8b4fe });
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
    const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
    e1.position.set(-0.15, 1.05, 0.35);
    e2.position.set(0.15, 1.05, 0.35);
    g.add(e1, e2);
    g.position.set(pos[0], 0, pos[2]);
    scene.add(g);
    shadeMeshes.set(id, { group: g, body });
  }

  // Input handling
  const keys = {};
  let camYaw = 0;
  let dragging = false;
  let lastX = 0;
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyR' && sim && sim.state !== 'playing') initGame();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (dragging) {
      camYaw -= (e.clientX - lastX) * 0.4;
      lastX = e.clientX;
    }
  });
  document.getElementById('restartBtn').addEventListener('click', initGame);

  let prevInteract = false, prevPulse = false, prevJump = false;

  function xzDist(a, b) {
    return Math.hypot(a[0] - b[0], a[2] - b[2]);
  }

  function stepSim() {
    if (sim.state !== 'playing') return;
    sim.ticks++;
    const p = sim.player;
    if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - DT);
    if (p.pulseCd > 0) p.pulseCd = Math.max(0, p.pulseCd - DT);

    if (keys['KeyQ']) camYaw += 90 * DT;
    if (keys['KeyE']) camYaw -= 90 * DT;

    let mx = 0, mz = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
    if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) mz += 1;

    const theta = (camYaw * Math.PI) / 180;
    let wx = mx * Math.cos(theta) + mz * Math.sin(theta);
    let wz = -mx * Math.sin(theta) + mz * Math.cos(theta);
    const mag = Math.hypot(wx, wz);
    if (mag > 1) { wx /= mag; wz /= mag; }
    p.pos[0] += wx * T.player_speed * DT;
    p.pos[2] += wz * T.player_speed * DT;
    if (mag > 0.05) playerGroup.rotation.y = Math.atan2(wx, wz);

    const jumpNow = !!keys['Space'];
    if (jumpNow && !prevJump && p.grounded) {
      p.vy = 7.5;
      p.grounded = false;
      playTone(340, 0.12, 'triangle', 0.05);
    }
    prevJump = jumpNow;
    if (!p.grounded) {
      p.vy -= 20 * DT;
      p.pos[1] += p.vy * DT;
      if (p.pos[1] <= 0) { p.pos[1] = 0; p.vy = 0; p.grounded = true; }
    }

    if (T.fall_enabled && Math.hypot(p.pos[0], p.pos[2]) > ISLAND_RADIUS) {
      p.flames = Math.max(0, p.flames - 1);
      p.carried -= Math.floor(p.carried * T.hit_drop_ratio);
      p.pos = [0, 0, 0];
      p.vy = 0; p.grounded = true; p.invuln = T.invuln_s;
      playTone(130, 0.35, 'sawtooth', 0.1);
      if (p.flames <= 0) return endGame('lost', 'Mây đã rơi khỏi Đảo Bến và tắt hết lửa.');
    }

    // Mote pickup
    for (let i = sim.motes.length - 1; i >= 0; i--) {
      const m = sim.motes[i];
      if (p.carried < T.carry_capacity && xzDist(p.pos, m.pos) <= T.pickup_radius) {
        p.carried++;
        sim.score += T.score.per_mote;
        scene.remove(moteMeshes.get(m.id));
        moteMeshes.delete(m.id);
        sim.motes.splice(i, 1);
        playTone(660 + p.carried * 60, 0.15, 'sine', 0.07);
      }
    }

    // Interact
    const interactNow = !!(keys['KeyF'] || keys['Enter']);
    let nearLantern = null;
    for (const l of sim.lanterns) {
      if (!l.lit && xzDist(p.pos, l.pos) <= T.interact_radius) { nearLantern = l; break; }
    }
    document.getElementById('prompt').style.display = nearLantern && p.carried > 0 ? 'block' : 'none';

    if (interactNow && !prevInteract && nearLantern && p.carried > 0) {
      const amt = Math.min(p.carried, T.lantern_cost - nearLantern.deposited);
      if (amt > 0) {
        p.carried -= amt;
        nearLantern.deposited += amt;
        playTone(520, 0.2, 'sine', 0.08);
        if (nearLantern.deposited >= T.lantern_cost) {
          nearLantern.lit = true;
          sim.score += T.score.per_lantern;
          playTone(784, 0.45, 'triangle', 0.1);
          const litCount = sim.lanterns.filter((x) => x.lit).length;
          ambientLight.intensity = 0.55 + litCount * 0.16;
          scene.fog.density = Math.max(0.006, 0.016 - litCount * 0.002);
          if (litCount === sim.lanterns.length) {
            sim.score += Math.floor(sim.timeLeft * T.score.per_second_left) + p.flames * T.score.per_flame_left;
            return endGame('won', `Cả 5 Đèn Lồng Lớn đã bừng sáng! Điểm tổng kết: ${sim.score}`);
          }
        }
      }
    }
    prevInteract = interactNow;

    // Pulse
    const pulseNow = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyK']);
    if (pulseNow && !prevPulse && p.pulseCd <= 0 && p.carried >= T.pulse_cost) {
      p.carried -= T.pulse_cost;
      p.pulseCd = T.pulse_cooldown_s;
      pulseAnim = 1.0;
      playTone(440, 0.3, 'sine', 0.1);
      for (const s of sim.shades) {
        if (xzDist(p.pos, s.pos) <= T.pulse_radius) {
          s.state = 'stunned';
          s.stunTimer = T.pulse_stun_s;
          const dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2];
          const d = Math.hypot(dx, dz) || 1;
          s.pos[0] += (dx / d) * T.pulse_push_m;
          s.pos[2] += (dz / d) * T.pulse_push_m;
          sim.score += T.score.per_stun;
        }
      }
    }
    prevPulse = pulseNow;

    if (sim.ticks % 300 === 0 && sim.motes.length < 15) spawnMote();
    if (sim.ticks % 1500 === 0 && sim.shades.length < 5) spawnShade();

    // Shades
    const litLans = sim.lanterns.filter((l) => l.lit);
    for (const s of sim.shades) {
      if (s.state === 'stunned') {
        s.stunTimer -= DT;
        if (s.stunTimer <= 0) s.state = 'chase';
        continue;
      }
      const dx = p.pos[0] - s.pos[0], dz = p.pos[2] - s.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 1e-4) {
        const step = Math.min(d, T.shade_speed * DT);
        s.pos[0] += (dx / d) * step;
        s.pos[2] += (dz / d) * step;
      }
      for (const lan of litLans) {
        const ldx = s.pos[0] - lan.pos[0], ldz = s.pos[2] - lan.pos[2];
        const ld = Math.hypot(ldx, ldz);
        if (ld <= T.safe_radius) {
          const ux = ld > 1e-4 ? ldx / ld : 1, uz = ld > 1e-4 ? ldz / ld : 0;
          s.pos[0] = lan.pos[0] + ux * (T.safe_radius + 0.01);
          s.pos[2] = lan.pos[2] + uz * (T.safe_radius + 0.01);
        }
      }
      if (p.invuln <= 0 && xzDist(p.pos, s.pos) <= T.shade_hit_radius) {
        p.flames = Math.max(0, p.flames - 1);
        p.carried -= Math.floor(p.carried * T.hit_drop_ratio);
        p.invuln = T.invuln_s;
        playTone(110, 0.3, 'sawtooth', 0.12);
        if (p.flames <= 0) return endGame('lost', 'Mây đã tắt hết ngọn lửa trước Bóng Mực.');
      }
    }

    sim.timeLeft = Math.max(0, sim.timeLeft - DT);
    if (sim.timeLeft <= 0) return endGame('lost', 'Bình minh đã lên trước khi kịp thắp hết 5 đèn.');
  }

  function endGame(result, desc) {
    sim.state = result;
    document.getElementById('overTitle').textContent = result === 'won' ? 'Ánh Sáng Trở Lại!' : 'Đêm Tàn...';
    document.getElementById('overDesc').textContent = desc;
    document.getElementById('overlay').style.display = 'flex';
  }

  function syncVisuals(now) {
    playerGroup.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
    playerGroup.visible = sim.player.invuln <= 0 || Math.floor(now / 80) % 2 === 0;

    if (pulseAnim > 0) {
      pulseAnim = Math.max(0, pulseAnim - 0.04);
      const sc = 1 + (1 - pulseAnim) * T.pulse_radius * 1.4;
      pulseRing.scale.set(sc, sc, 1);
      pulseRing.material.opacity = pulseAnim * 0.7;
    } else {
      pulseRing.material.opacity = 0;
    }

    sim.lanterns.forEach((l, i) => {
      const lm = lanternMeshes[i];
      if (l.lit) {
        lm.head.material.color.setHex(0xffc966);
        lm.head.material.emissive.setHex(0xff9900);
        lm.head.material.emissiveIntensity = 1.6;
        lm.light.intensity = 3.2;
        lm.safeRing.material.opacity = 0.35;
      } else if (l.deposited > 0) {
        lm.head.material.emissive.setHex(0xaa5500);
        lm.head.material.emissiveIntensity = 0.7 * (l.deposited / T.lantern_cost);
        lm.light.intensity = 0.6;
      }
    });

    for (const m of sim.motes) {
      const mesh = moteMeshes.get(m.id);
      if (mesh) mesh.position.y = 0.8 + Math.sin(now * 0.004 + m.pos[0]) * 0.25;
    }

    for (const s of sim.shades) {
      const sm = shadeMeshes.get(s.id);
      if (sm) {
        sm.group.position.set(s.pos[0], 0, s.pos[2]);
        sm.body.material.emissive.setHex(s.state === 'stunned' ? 0x6b21a8 : 0x3b0764);
        sm.group.rotation.y += s.state === 'stunned' ? 0.18 : 0.04;
      }
    }

    for (const c of clouds) {
      c.angle += 0.0003;
      c.mesh.position.x = Math.cos(c.angle) * c.radius;
      c.mesh.position.z = Math.sin(c.angle) * c.radius;
    }

    const th = (camYaw * Math.PI) / 180;
    camera.position.set(
      sim.player.pos[0] + Math.sin(th) * 9,
      sim.player.pos[1] + 5.5,
      sim.player.pos[2] + Math.cos(th) * 9
    );
    camera.lookAt(sim.player.pos[0], sim.player.pos[1] + 1.2, sim.player.pos[2]);

    document.getElementById('hudFlames').textContent = sim.player.flames;
    document.getElementById('hudCarried').textContent = `${sim.player.carried} / ${T.carry_capacity}`;
    document.getElementById('hudLanterns').textContent = `${sim.lanterns.filter((x) => x.lit).length} / ${T.lantern_count_night1}`;
    const secs = Math.ceil(sim.timeLeft);
    document.getElementById('hudTime').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    document.getElementById('hudScore').textContent = sim.score;
  }

  initGame();
  let acc = 0, lastTime = performance.now();
  function loop(now) {
    acc += Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    while (acc >= DT) { stepSim(); acc -= DT; }
    syncVisuals(now);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
