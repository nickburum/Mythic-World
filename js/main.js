/* js/main.js — Game controller: input, render loop, proximity, legacy system */

(function () {
  /* ── State ─────────────────────────────────────────── */
  let playerName = "Seeker";
  let currentRealm = "greek";
  let selectedRealm = "greek";
  let yaw = 0, pitch = 0;
  let isPointerLocked = false;
  let moveForward = false, moveBack = false, moveLeft = false, moveRight = false;
  let nearbyObject = null;
  let legacyPanelActive = false;
  let worldReady = false;
  let animTime = 0;
  const MOVE_SPEED = 4.2;

  /* ── DOM refs ───────────────────────────────────────── */
  const nameScreen      = document.getElementById("name-screen");
  const clickToPlay     = document.getElementById("click-to-play");
  const interactHint    = document.getElementById("interact-hint");
  const loreBox         = document.getElementById("lore-box");
  const loreTitle       = document.getElementById("lore-title");
  const loreText        = document.getElementById("lore-text");
  const legacyPanel     = document.getElementById("legacy-panel");
  const legacyList      = document.getElementById("legacy-list");
  const legacyCloseBtn  = document.getElementById("legacy-close");
  const legendCountEl   = document.getElementById("legend-count");

  /* ── Realm selector ─────────────────────────────────── */
  document.querySelectorAll(".realm-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".realm-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedRealm = btn.dataset.realm;
    });
  });

  document.getElementById("player-name-input").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("enter-world-btn").click();
  });

  document.getElementById("enter-world-btn").addEventListener("click", () => {
    const val = document.getElementById("player-name-input").value.trim();
    playerName = val || "Seeker";
    currentRealm = selectedRealm;
    nameScreen.classList.add("hidden");
    clickToPlay.classList.add("show");
    startWorld();
  });

  /* ── World start ────────────────────────────────────── */
  function startWorld() {
    World.init(currentRealm);
    setupPointerLock();
    setupInput();
    worldReady = true;
    animate();
  }

  /* ── Pointer lock ───────────────────────────────────── */
  function setupPointerLock() {
    const canvas = World.getRenderer().domElement;
    canvas.addEventListener("click", () => {
      if (!Dialogue.isActive() && !legacyPanelActive) canvas.requestPointerLock();
    });
    clickToPlay.addEventListener("click", () => {
      const canvas = World.getRenderer().domElement;
      if (!Dialogue.isActive() && !legacyPanelActive) canvas.requestPointerLock();
    });
    document.addEventListener("pointerlockchange", () => {
      isPointerLocked = !!document.pointerLockElement;
      if (isPointerLocked) clickToPlay.classList.remove("show");
    });
    document.addEventListener("mousemove", e => {
      if (!isPointerLocked || Dialogue.isActive() || legacyPanelActive) return;
      yaw  -= e.movementX * 0.002;
      pitch -= e.movementY * 0.002;
      pitch = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, pitch));
    });
  }

  /* ── Keyboard ───────────────────────────────────────── */
  function setupInput() {
    document.addEventListener("keydown", e => {
      if (!worldReady) return;
      switch (e.code) {
        case "KeyW": moveForward = true; break;
        case "KeyS": moveBack    = true; break;
        case "KeyA": moveLeft    = true; break;
        case "KeyD": moveRight   = true; break;
        case "KeyE":
          if (!Dialogue.isActive() && !legacyPanelActive && nearbyObject)
            interact(nearbyObject);
          break;
        case "KeyL":
          if (!Dialogue.isActive()) {
            legacyPanelActive ? closeLegacyPanel() : openLegacyPanel();
          }
          break;
        case "KeyP":
          if (!Dialogue.isActive() && !legacyPanelActive) promptLegacy();
          break;
        case "Escape":
          if (Dialogue.isActive()) Dialogue.close();
          if (legacyPanelActive) closeLegacyPanel();
          break;
      }
    });
    document.addEventListener("keyup", e => {
      switch (e.code) {
        case "KeyW": moveForward = false; break;
        case "KeyS": moveBack    = false; break;
        case "KeyA": moveLeft    = false; break;
        case "KeyD": moveRight   = false; break;
      }
    });
  }

  /* ── Movement helpers ───────────────────────────────── */
  function getForward() {
    return new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw, 0));
  }
  function getRight() {
    return new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw, 0));
  }

  /* ── Proximity check ────────────────────────────────── */
  function checkNearby() {
    if (Dialogue.isActive() || legacyPanelActive) return;
    const cam = World.getCamera();
    const allObjs = [...World.getNPCMeshes(), ...World.getStoneMeshes()];
    let closest = null, closestDist = 3.4;
    allObjs.forEach(obj => {
      const d = cam.position.distanceTo(obj.position);
      if (d < closestDist) { closestDist = d; closest = obj; }
    });

    if (closest !== nearbyObject) {
      nearbyObject = closest;
      if (closest) {
        const t = closest.userData.type;
        if (t === "npc")      interactHint.textContent = `[ E ]  Speak with ${closest.userData.npc.name}`;
        else if (t === "memstone") interactHint.textContent = "[ E ]  Read the ancient inscription";
        else if (t === "legacy")   interactHint.textContent = "[ E ]  Read this seeker's legend";
        interactHint.classList.add("show");
        showLore(closest);
      } else {
        interactHint.classList.remove("show");
        hideLore();
      }
    }
  }

  function showLore(obj) {
    if (obj.userData.type === "npc") {
      loreTitle.textContent = "About This Figure";
      loreText.textContent  = obj.userData.npc.lore;
    } else if (obj.userData.type === "memstone") {
      loreTitle.textContent = "Ancient Inscription";
      loreText.textContent  = obj.userData.lore;
    } else if (obj.userData.type === "legacy") {
      const l = obj.userData.legacy;
      loreTitle.textContent = `${l.seeker}  ·  ${l.date}`;
      loreText.textContent  = `"${l.deed}"`;
    }
    loreBox.classList.add("show");
  }
  function hideLore() { loreBox.classList.remove("show"); }

  /* ── Interact ───────────────────────────────────────── */
  function interact(obj) {
    if (!obj) return;
    if (obj.userData.type === "npc") {
      Dialogue.open(obj.userData.npc);
    }
    // memstone and legacy lore already shown in the lore box — no extra action needed
  }

  /* ── Legacy panel ───────────────────────────────────── */
  function openLegacyPanel() {
    legacyPanelActive = true;
    legacyPanel.classList.add("open");
    renderLegacyList();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function closeLegacyPanel() {
    legacyPanelActive = false;
    legacyPanel.classList.remove("open");
    clickToPlay.classList.add("show");
  }
  legacyCloseBtn.addEventListener("click", closeLegacyPanel);

  function renderLegacyList() {
    legacyList.innerHTML = "";
    const all = Storage.getAllLegacies();
    if (all.length === 0) {
      legacyList.innerHTML = '<div style="color:rgba(196,149,58,0.4);font-style:italic;font-size:14px;">No legends yet. Be the first to leave your mark (press P).</div>';
      return;
    }
    // Show newest first
    [...all].reverse().forEach(l => {
      const div = document.createElement("div");
      div.className = "legacy-item";
      div.innerHTML = `
        <div class="legacy-seeker">${escHtml(l.seeker).toUpperCase()}  ·  ${escHtml(REALMS[l.realm]?.name || l.realm)}  ·  ${escHtml(l.date)}</div>
        <div class="legacy-deed">${escHtml(l.deed)}</div>`;
      legacyList.appendChild(div);
    });
  }

  /* ── Legacy prompt (P key) ──────────────────────────── */
  function promptLegacy() {
    // Build modal inline
    let modal = document.getElementById("legacy-prompt");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "legacy-prompt";
      modal.innerHTML = `
        <div id="legacy-prompt-inner">
          <h3>✦ Write Your Legend ✦</h3>
          <p>You walk among the myths. In one sentence, describe your deed — it will be carved into this world forever, and future seekers will find it here.</p>
          <input id="legacy-deed-input" type="text" maxlength="140" placeholder="I walked to the edge of the Styx and heard Charon weep…" />
          <div class="legacy-prompt-btns">
            <button class="primary" id="legacy-confirm-btn">Carve my legend ✦</button>
            <button id="legacy-cancel-btn">Fade into myth</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      document.getElementById("legacy-confirm-btn").addEventListener("click", confirmLegacy);
      document.getElementById("legacy-cancel-btn").addEventListener("click", cancelLegacy);
      document.getElementById("legacy-deed-input").addEventListener("keydown", e => {
        if (e.key === "Enter") confirmLegacy();
        if (e.key === "Escape") cancelLegacy();
      });
    }
    modal.classList.add("show");
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(() => document.getElementById("legacy-deed-input").focus(), 60);
  }

  function confirmLegacy() {
    const input = document.getElementById("legacy-deed-input");
    const deed = input.value.trim();
    if (!deed) return;
    const legacy = Storage.addLegacy({ seeker: playerName, deed, realm: currentRealm });
    const added = Storage.getLegacies(currentRealm);
    World.addLegacyStoneRuntime(added[added.length - 1], currentRealm);
    input.value = "";
    cancelLegacy();
    updateLegendCount();
    // Brief confirmation in interact hint area
    interactHint.textContent = "✦  Your legend has been written into this world forever";
    interactHint.classList.add("show");
    setTimeout(() => {
      if (!nearbyObject) interactHint.classList.remove("show");
    }, 4000);
  }

  function cancelLegacy() {
    const modal = document.getElementById("legacy-prompt");
    if (modal) modal.classList.remove("show");
    clickToPlay.classList.add("show");
  }

  function updateLegendCount() {
    const total = Storage.count();
    legendCountEl.textContent = total > 0 ? `${total} legend${total !== 1 ? "s" : ""} in this world · L to read` : "";
  }

  function escHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* ── Render loop ────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    if (!worldReady) return;

    const delta = World.getClock().getDelta();
    animTime += delta;

    const cam = World.getCamera();

    // Movement
    if (!Dialogue.isActive() && !legacyPanelActive && isPointerLocked) {
      const spd = MOVE_SPEED * delta;
      if (moveForward) cam.position.addScaledVector(getForward(), spd);
      if (moveBack)    cam.position.addScaledVector(getForward(), -spd);
      if (moveLeft)    cam.position.addScaledVector(getRight(), -spd);
      if (moveRight)   cam.position.addScaledVector(getRight(), spd);
      cam.position.y = 1.7;
      // Soft boundary
      const flat = new THREE.Vector2(cam.position.x, cam.position.z);
      if (flat.length() > 26) {
        flat.normalize().multiplyScalar(26);
        cam.position.x = flat.x;
        cam.position.z = flat.y;
      }
    }

    // Camera rotation
    cam.rotation.order = "YXZ";
    cam.rotation.y = yaw;
    cam.rotation.x = pitch;

    checkNearby();
    World.tick(animTime);
    World.getRenderer().render(World.getScene(), cam);
  }
})();
