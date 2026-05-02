/* js/dialogue.js — NPC dialogue system (no AI, fully curated) */

const Dialogue = (() => {
  let active = false;
  let currentNPC = null;

  const box = () => document.getElementById("dialogue-box");
  const nameEl = () => document.getElementById("npc-name");
  const textEl = () => document.getElementById("dialogue-text");
  const choicesEl = () => document.getElementById("dialogue-choices");

  function open(npc) {
    active = true;
    currentNPC = npc;
    box().classList.add("open");
    nameEl().textContent = npc.name.toUpperCase();
    renderNode(npc.dialogueTree["start"]);
    // Release pointer lock
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function renderNode(node) {
    textEl().textContent = node.text;
    choicesEl().innerHTML = "";
    node.choices.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        if (c.next === null) {
          close();
        } else {
          const next = currentNPC.dialogueTree[c.next];
          if (next) renderNode(next);
          else close();
        }
      });
      choicesEl().appendChild(btn);
    });
  }

  function close() {
    active = false;
    currentNPC = null;
    box().classList.remove("open");
    document.getElementById("click-to-play").classList.add("show");
  }

  function isActive() { return active; }

  return { open, close, isActive };
})();
