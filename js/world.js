/* js/world.js — Three.js world construction */

const World = (() => {
  let scene, camera, renderer, clock;
  let npcMeshes = [], stoneMeshes = [];
  let currentRealm = null;

  function init(realmKey) {
    currentRealm = realmKey;
    const R = REALMS[realmKey];

    scene = new THREE.Scene();
    scene.background = new THREE.Color(R.sky);
    scene.fog = new THREE.FogExp2(R.fog, 0.052);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 130);
    camera.position.set(0, 1.7, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.insertBefore(renderer.domElement, document.body.firstChild);

    clock = new THREE.Clock();

    // Lighting
    scene.add(new THREE.AmbientLight(R.ambientColor, 0.65));
    const dirLight = new THREE.DirectionalLight(R.torchColor, 0.3);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    buildGround(R);
    buildGroundDetail(R);
    buildRealmEnvironment(realmKey, R);
    buildCentralAltar(R);
    buildTorches(R);
    buildNPCs(R);
    buildMemoryStones(R);
    buildLegacyStones(realmKey, R);

    window.addEventListener("resize", onResize);

    document.getElementById("realm-name").textContent = R.name;
    const total = Storage.count();
    document.getElementById("legend-count").textContent =
      total > 0 ? `${total} legend${total !== 1 ? "s" : ""} in this world · L to read` : "";

    return { scene, camera, renderer, clock };
  }

  function getCamera() { return camera; }
  function getScene() { return scene; }
  function getNPCMeshes() { return npcMeshes; }
  function getStoneMeshes() { return stoneMeshes; }
  function getClock() { return clock; }
  function getRenderer() { return renderer; }

  function buildGround(R) {
    const geo = new THREE.PlaneGeometry(140, 140, 28, 28);
    const mat = new THREE.MeshLambertMaterial({ color: R.ground });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function buildGroundDetail(R) {
    const baseColor = new THREE.Color(R.ground);
    for (let i = 0; i < 70; i++) {
      const isRock = Math.random() < 0.6;
      const geo = isRock
        ? new THREE.DodecahedronGeometry(Math.random() * 0.28 + 0.07, 0)
        : new THREE.SphereGeometry(Math.random() * 0.18 + 0.05, 4, 3);
      const col = baseColor.clone().lerp(new THREE.Color(0x888888), 0.18 + Math.random() * 0.12);
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }));
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 24;
      m.position.set(Math.cos(angle) * dist, 0.04, Math.sin(angle) * dist);
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      m.castShadow = true;
      scene.add(m);
    }
  }

  function buildRealmEnvironment(realmKey, R) {
    if (realmKey === "greek") {
      // Doric columns ring
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const r = 18;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.34, 7, 10),
          new THREE.MeshLambertMaterial({ color: 0x8a8878 })
        );
        col.position.set(Math.cos(a) * r, 3.5, Math.sin(a) * r);
        col.castShadow = true;
        scene.add(col);
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.28, 0.8),
          new THREE.MeshLambertMaterial({ color: 0x787868 })
        );
        cap.position.set(Math.cos(a) * r, 7.14, Math.sin(a) * r);
        scene.add(cap);
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.25, 0.9),
          new THREE.MeshLambertMaterial({ color: 0x787868 })
        );
        base.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
        scene.add(base);
      }
      // River Styx
      const river = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 5),
        new THREE.MeshLambertMaterial({ color: 0x06031a, transparent: true, opacity: 0.9 })
      );
      river.rotation.x = -Math.PI / 2;
      river.position.set(22, 0.02, 0);
      scene.add(river);

    } else if (realmKey === "norse") {
      // Giant Yggdrasil trunk
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 2.2, 35, 12),
        new THREE.MeshLambertMaterial({ color: 0x120a03 })
      );
      trunk.position.set(-16, 17, -22);
      scene.add(trunk);
      for (let i = 0; i < 8; i++) {
        const b = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15 + Math.random() * 0.2, 0.5, 7 + Math.random() * 4, 6),
          new THREE.MeshLambertMaterial({ color: 0x0e0703 })
        );
        b.position.set(-16 + Math.cos(i * 0.8) * 5, 10 + i * 0.5, -22 + Math.sin(i * 0.8) * 5);
        b.rotation.z = (Math.random() - 0.5) * 0.8;
        b.rotation.x = (Math.random() - 0.5) * 0.4;
        scene.add(b);
      }
      // Rune stones
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const rs = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 1.3 + Math.random() * 0.4, 0.12),
          new THREE.MeshLambertMaterial({ color: 0x263344 })
        );
        rs.position.set(Math.cos(a) * 13, 0.7, Math.sin(a) * 13);
        rs.rotation.y = a + (Math.random() - 0.5) * 0.3;
        scene.add(rs);
      }

    } else if (realmKey === "egypt") {
      // Obelisk
      const ob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.42, 11, 4),
        new THREE.MeshLambertMaterial({ color: 0xb8960a })
      );
      ob.position.set(-13, 5.5, 9);
      scene.add(ob);
      const obCap = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 1.1, 4),
        new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: new THREE.Color(0x886600), emissiveIntensity: 0.5 })
      );
      obCap.position.set(-13, 11.55, 9);
      scene.add(obCap);
      // Pyramid silhouettes
      for (let i = 0; i < 3; i++) {
        const py = new THREE.Mesh(
          new THREE.ConeGeometry(12 + i * 2, 14 + i, 4),
          new THREE.MeshLambertMaterial({ color: 0x1a1408, transparent: true, opacity: 0.55, wireframe: i === 2 })
        );
        py.position.set(24 + i * 6, 7, -8 - i * 3);
        scene.add(py);
      }

    } else if (realmKey === "celtic") {
      // Stone circle
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const h = 1.8 + Math.random() * 1.2;
        const st = new THREE.Mesh(
          new THREE.BoxGeometry(0.45 + Math.random() * 0.25, h, 0.28 + Math.random() * 0.1),
          new THREE.MeshLambertMaterial({ color: 0x2a3a28 })
        );
        st.position.set(Math.cos(a) * 15, h / 2, Math.sin(a) * 15);
        st.rotation.y = a + (Math.random() - 0.5) * 0.2;
        st.castShadow = true;
        scene.add(st);
      }
      // Ancient trees
      for (let i = 0; i < 25; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 17 + Math.random() * 7;
        const th = 2.5 + Math.random() * 1.5;
        const trunk2 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.18, th, 6),
          new THREE.MeshLambertMaterial({ color: 0x150d04 })
        );
        trunk2.position.set(Math.cos(a) * r, th / 2, Math.sin(a) * r);
        scene.add(trunk2);
        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(1.1 + Math.random() * 0.6, 7, 5),
          new THREE.MeshLambertMaterial({ color: 0x082208 })
        );
        foliage.position.set(Math.cos(a) * r, th + 0.8, Math.sin(a) * r);
        scene.add(foliage);
      }

    } else if (realmKey === "sumerian") {
      // Cedar trees
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 11 + Math.random() * 12;
        const cth = 4 + Math.random() * 3;
        const ct = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.28, cth, 6),
          new THREE.MeshLambertMaterial({ color: 0x180c04 })
        );
        ct.position.set(Math.cos(a) * r, cth / 2, Math.sin(a) * r);
        scene.add(ct);
        const cf = new THREE.Mesh(
          new THREE.ConeGeometry(1.4, 3.5 + Math.random(), 7),
          new THREE.MeshLambertMaterial({ color: 0x0b1a06 })
        );
        cf.position.set(Math.cos(a) * r, cth + 1.2, Math.sin(a) * r);
        scene.add(cf);
      }
      // Ziggurat
      for (let i = 0; i < 5; i++) {
        const s = 10 - i * 1.6;
        const zs = new THREE.Mesh(
          new THREE.BoxGeometry(s, 1.1, s),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(0x2a1a08).lerp(new THREE.Color(0x483020), i / 5) })
        );
        zs.position.set(-24, i * 1.12 + 0.55, -10);
        scene.add(zs);
      }
    }
  }

  function buildCentralAltar(R) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.9, 0.42, 12),
      new THREE.MeshLambertMaterial({ color: 0x303020 })
    );
    base.position.set(0, 0.21, 0);
    base.castShadow = true;
    scene.add(base);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 1.6, 0.3, 12),
      new THREE.MeshLambertMaterial({ color: 0x404030 })
    );
    top.position.set(0, 0.57, 0);
    scene.add(top);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.75, 8),
      new THREE.MeshLambertMaterial({
        color: R.torchColor,
        emissive: new THREE.Color(R.torchColor),
        emissiveIntensity: 0.9
      })
    );
    flame.position.set(0, 1.15, 0);
    scene.add(flame);

    const altarLight = new THREE.PointLight(R.torchColor, 3.5, 12);
    altarLight.position.set(0, 1.6, 0);
    scene.add(altarLight);
  }

  function buildTorches(R) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = 5;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.3, 5),
        new THREE.MeshLambertMaterial({ color: 0x3a2010 })
      );
      pole.position.set(Math.cos(a) * r, 0.65, Math.sin(a) * r);
      scene.add(pole);

      const fl = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.22, 6),
        new THREE.MeshLambertMaterial({
          color: R.torchColor,
          emissive: new THREE.Color(R.torchColor),
          emissiveIntensity: 0.85
        })
      );
      fl.position.set(Math.cos(a) * r, 1.41, Math.sin(a) * r);
      scene.add(fl);

      const tl = new THREE.PointLight(R.torchColor, 0.9, 5.5);
      tl.position.set(Math.cos(a) * r, 1.55, Math.sin(a) * r);
      scene.add(tl);
    }
  }

  function buildNPCs(R) {
    npcMeshes = [];
    R.npcs.forEach((npc, i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 1.45, 8),
        new THREE.MeshLambertMaterial({ color: npc.color })
      );
      body.position.y = 0.72;
      body.castShadow = true;

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.27, 10, 8),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(npc.color).lerp(new THREE.Color(0xffffff), 0.14) })
      );
      head.position.y = 1.62;
      head.castShadow = true;

      const npcLight = new THREE.PointLight(R.torchColor, 1.4, 6.5);
      npcLight.position.set(0.5, 1.8, 0);

      // Glow orb above head
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 4),
        new THREE.MeshLambertMaterial({
          color: R.torchColor,
          emissive: new THREE.Color(R.torchColor),
          emissiveIntensity: 1
        })
      );
      orb.position.y = 2.15;
      orb.userData.isOrb = true;

      g.add(body);
      g.add(head);
      g.add(npcLight);
      g.add(orb);

      const { angle, dist } = npc.pos;
      g.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      g.userData = { type: "npc", npc, index: i };
      scene.add(g);
      npcMeshes.push(g);
    });
  }

  function buildMemoryStone(stoneData, R) {
    const g = new THREE.Group();
    const h = 1.1 + Math.random() * 0.5;
    const stone = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, h, 0.18),
      new THREE.MeshLambertMaterial({ color: 0x445566 })
    );
    stone.position.y = h / 2;
    stone.castShadow = true;

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 4),
      new THREE.MeshLambertMaterial({
        color: R.torchColor,
        emissive: new THREE.Color(R.torchColor),
        emissiveIntensity: 1
      })
    );
    glow.position.y = h + 0.18;
    glow.userData.isGlow = true;

    g.add(stone);
    g.add(glow);
    g.position.set(stoneData.x, 0, stoneData.z);
    g.userData = { type: "memstone", lore: stoneData.lore };
    return g;
  }

  function buildLegacyStone(legacy, R, pos) {
    const g = new THREE.Group();
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.32, 0),
      new THREE.MeshLambertMaterial({ color: 0x6a4a22 })
    );
    stone.position.y = 0.55;
    stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    stone.castShadow = true;

    const glow2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      new THREE.MeshLambertMaterial({
        color: 0xffcc66,
        emissive: new THREE.Color(0xffcc66),
        emissiveIntensity: 1
      })
    );
    glow2.position.y = 1.05;
    glow2.userData.isGlow = true;

    g.add(stone);
    g.add(glow2);
    g.position.set(pos.x, 0, pos.z);
    g.userData = { type: "legacy", legacy };
    return g;
  }

  function buildMemoryStones(R) {
    R.memorystones.forEach(s => {
      const g = buildMemoryStone(s, R);
      scene.add(g);
      stoneMeshes.push(g);
    });
  }

  function buildLegacyStones(realmKey, R) {
    const realmLegacies = Storage.getLegacies(realmKey);
    realmLegacies.forEach((l, i) => {
      const a = (i / Math.max(realmLegacies.length, 1)) * Math.PI * 2 + 0.4;
      const dist = 9 + (i % 5) * 2;
      const pos = { x: Math.cos(a) * dist, z: Math.sin(a) * dist };
      const g = buildLegacyStone(l, R, pos);
      scene.add(g);
      stoneMeshes.push(g);
    });
  }

  function addLegacyStoneRuntime(legacy, realmKey) {
    const R = REALMS[realmKey];
    const all = Storage.getLegacies(realmKey);
    const i = all.length - 1;
    const a = (i / Math.max(all.length, 1)) * Math.PI * 2 + 0.4;
    const dist = 9 + (i % 5) * 2;
    const pos = { x: Math.cos(a) * dist, z: Math.sin(a) * dist };
    const g = buildLegacyStone(legacy, R, pos);
    scene.add(g);
    stoneMeshes.push(g);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function tick(animTime) {
    // Animate NPC orbs
    npcMeshes.forEach((n, i) => {
      n.children.forEach(child => {
        if (child.isLight) child.intensity = 1.1 + 0.6 * Math.sin(animTime * 2 + i * 1.1);
        if (child.userData.isOrb) child.position.y = 2.15 + 0.06 * Math.sin(animTime * 1.8 + i);
      });
    });
    // Animate stone glows
    stoneMeshes.forEach((s, i) => {
      s.children.forEach(child => {
        if (child.userData.isGlow) {
          const base = s.userData.type === "legacy" ? 1.05 : 1.28;
          child.position.y = base + 0.06 * Math.sin(animTime * 1.4 + i * 1.7);
        }
      });
    });
  }

  return {
    init,
    getCamera, getScene, getNPCMeshes, getStoneMeshes, getClock, getRenderer,
    addLegacyStoneRuntime, tick
  };
})();
