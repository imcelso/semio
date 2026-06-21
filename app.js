/* =============================================================
 * app.js — Interaction + the simulated "AI" tiered reading
 * Depends on SYMBOL_LIBRARY and TIERED_READINGS from data.js
 * ============================================================= */

(function () {
  "use strict";

  /* ---------- DOM refs ---------- */
  const libraryEl  = document.getElementById("library");
  const canvasEl   = document.getElementById("canvas");
  const hintEl     = document.getElementById("canvas-hint"); // may be null (removed)
  const tagListEl  = document.getElementById("tag-list");
  const aiBodyEl   = document.getElementById("ai-body");
  const clearBtn   = document.getElementById("clear-btn");

  /* ---------- Lookup map: id -> symbol ---------- */
  const SYMBOL_INDEX = {};
  SYMBOL_LIBRARY.categories.forEach(function (cat) {
    cat.items.forEach(function (it) { SYMBOL_INDEX[it.id] = it; });
  });

  /* ---------- State ---------- */
  // tokens on canvas: { uid, id, x, y, el }
  let tokens = [];
  let uidSeq = 0;
  let thinkTimer = null;

  /* =========================================================
   * 1. Render the symbol library (left column)
   * ========================================================= */
  function renderLibrary() {
    SYMBOL_LIBRARY.categories.forEach(function (cat) {
      // small, low-key category heading (groups symbols; not per-icon labels)
      const head = document.createElement("div");
      head.className = "lib-cat";
      head.setAttribute("aria-hidden", "true");
      head.textContent = cat.name;
      libraryEl.appendChild(head);

      const grid = document.createElement("div");
      grid.className = "lib-grid";

      cat.items.forEach(function (item) {
        const el = document.createElement("div");
        el.className = "lib-item";
        el.setAttribute("role", "listitem");
        el.setAttribute("draggable", "true");
        el.setAttribute("aria-label", item.label);
        el.dataset.id = item.id;
        el.title = item.label; // tooltip only; no visible text label
        el.innerHTML = '<span class="emoji">' + item.emoji + "</span>";

        // HTML5 drag
        el.addEventListener("dragstart", function (e) {
          e.dataTransfer.setData("text/symbol-id", item.id);
          e.dataTransfer.effectAllowed = "copy";
        });
        // click-to-place (accessible alternative to drag)
        el.addEventListener("click", function () {
          addToken(item.id);
        });

        grid.appendChild(el);
      });

      libraryEl.appendChild(grid);
    });
  }

  /* =========================================================
   * 2. Canvas drop handling
   * ========================================================= */
  canvasEl.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    canvasEl.classList.add("drag-over");
  });
  canvasEl.addEventListener("dragleave", function (e) {
    if (e.target === canvasEl) canvasEl.classList.remove("drag-over");
  });
  canvasEl.addEventListener("drop", function (e) {
    e.preventDefault();
    canvasEl.classList.remove("drag-over");
    const id = e.dataTransfer.getData("text/symbol-id");
    if (!id) return;
    const rect = canvasEl.getBoundingClientRect();
    addToken(id, e.clientX - rect.left - 29, e.clientY - rect.top - 29);
  });

  /* =========================================================
   * 3. Add / remove tokens
   * ========================================================= */
  function addToken(symbolId, x, y) {
    const sym = SYMBOL_INDEX[symbolId];
    if (!sym) return;

    const rect = canvasEl.getBoundingClientRect();
    if (typeof x !== "number" || typeof y !== "number") {
      // click-to-place: scatter near center with small jitter
      x = rect.width / 2 - 29 + (Math.random() * 120 - 60);
      y = rect.height / 2 - 29 + (Math.random() * 120 - 60);
    }
    x = clamp(x, 0, rect.width - 58);
    y = clamp(y, 0, rect.height - 58);

    const uid = "tok_" + (++uidSeq);
    const el = document.createElement("div");
    el.className = "token";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.dataset.uid = uid;
    el.innerHTML =
      sym.emoji +
      '<button class="token-remove" aria-label="Remove" title="Remove">×</button>';

    el.querySelector(".token-remove").addEventListener("click", function (ev) {
      ev.stopPropagation();
      removeToken(uid);
    });

    enableTokenDrag(el, uid);
    canvasEl.appendChild(el);

    tokens.push({ uid: uid, id: symbolId, x: x, y: y, el: el });
    onCanvasChange();
  }

  function removeToken(uid) {
    const i = tokens.findIndex(function (t) { return t.uid === uid; });
    if (i === -1) return;
    tokens[i].el.remove();
    tokens.splice(i, 1);
    onCanvasChange();
  }

  /* =========================================================
   * 4. Reposition tokens inside the canvas (pointer drag)
   * ========================================================= */
  function enableTokenDrag(el, uid) {
    let startX, startY, origX, origY, dragging = false;

    el.addEventListener("pointerdown", function (e) {
      if (e.target.classList.contains("token-remove")) return;
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.style.zIndex = 50;
      startX = e.clientX; startY = e.clientY;
      origX = parseFloat(el.style.left); origY = parseFloat(el.style.top);
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      const rect = canvasEl.getBoundingClientRect();
      let nx = clamp(origX + (e.clientX - startX), 0, rect.width - 58);
      let ny = clamp(origY + (e.clientY - startY), 0, rect.height - 58);
      el.style.left = nx + "px";
      el.style.top = ny + "px";
      const t = tokens.find(function (t) { return t.uid === uid; });
      if (t) { t.x = nx; t.y = ny; }
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.style.zIndex = "";
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
  }

  /* =========================================================
   * 5. On any canvas change: update tags + run "AI"
   * ========================================================= */
  function onCanvasChange() {
    if (hintEl) hintEl.classList.toggle("hidden", tokens.length > 0);
    renderTags();
    runTieredReading();
  }

  function renderTags() {
    tagListEl.innerHTML = "";
    if (tokens.length === 0) {
      const empty = document.createElement("span");
      empty.className = "tag-empty";
      empty.textContent = "no symbols yet";
      tagListEl.appendChild(empty);
      return;
    }
    tokens.forEach(function (t) {
      const sym = SYMBOL_INDEX[t.id];
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML =
        '<span class="t-emoji">' + sym.emoji + "</span>" + sym.label;
      tagListEl.appendChild(tag);
    });
  }

  /* =========================================================
   * 6. Tiered reading — count-based, no matching
   * ========================================================= */
  function runTieredReading() {
    if (thinkTimer) clearTimeout(thinkTimer);

    if (tokens.length === 0) {
      renderIdle();
      return;
    }

    showTyping();

    var delay = 700 + Math.random() * 500;
    thinkTimer = setTimeout(function () {
      if (tokens.length === 1) {
        var sym = SYMBOL_INDEX[tokens[0].id];
        if (sym && sym.reading) {
          renderResult({ main: sym.reading, options: [] });
        } else {
          renderResult(TIERED_READINGS[1]);
        }
      } else {
        var idx = Math.min(tokens.length, TIERED_READINGS.length - 1);
        var reading = TIERED_READINGS[idx];
        if (reading) renderResult(reading);
      }
    }, delay);
  }

  /* =========================================================
   * 7. Right-panel renderers
   * ========================================================= */
  function renderIdle() {
    aiBodyEl.innerHTML =
      '<div class="ai-idle">' +
      '<p class="ai-idle-text">Place symbols on the canvas to see the meaning here.</p>' +
      "</div>";
  }

  function showTyping() {
    aiBodyEl.innerHTML =
      '<div class="ai-typing">' +
      '<span class="dots"><span></span><span></span><span></span></span>' +
      "</div>";
  }

  // result shape: { main: string, options: string[] }
  function renderResult(result) {
    const opts = (result.options || []).slice(0, 3);

    let optsHtml = "";
    opts.forEach(function (opt, i) {
      optsHtml +=
        '<button type="button" class="option" data-i="' + i + '">' +
          '<span class="option-tick" aria-hidden="true"></span>' +
          '<span class="option-text">' + escapeHtml(opt) + "</span>" +
        "</button>";
    });

    const secondary = opts.length
      ? '<div class="options-block">' +
          '<p class="options-lead">Which one is closer? Tap to confirm and help me learn.</p>' +
          '<div class="options">' + optsHtml + "</div>" +
        "</div>"
      : "";

    aiBodyEl.innerHTML =
      '<div class="ai-result">' +
        '<p class="translation">' + escapeHtml(result.main) + "</p>" +
        secondary +
      "</div>";

    // tap-to-confirm: highlight the chosen option (simulated learning)
    const buttons = aiBodyEl.querySelectorAll(".option");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const already = btn.classList.contains("is-chosen");
        buttons.forEach(function (b) { b.classList.remove("is-chosen"); });
        const lead = aiBodyEl.querySelector(".options-lead");
        if (already) {
          if (lead) lead.textContent = "Which one is closer? Tap to confirm and help me learn.";
          return;
        }
        btn.classList.add("is-chosen");
        if (lead) lead.textContent = "Got it — I'll remember this reading.";
      });
    });
  }

  /* =========================================================
   * 8. Clear canvas
   * ========================================================= */
  clearBtn.addEventListener("click", function () {
    tokens.forEach(function (t) { t.el.remove(); });
    tokens = [];
    onCanvasChange();
  });

  /* ---------- helpers ---------- */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- init ---------- */
  renderLibrary();
  renderTags();
})();
