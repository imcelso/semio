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
  let selectedUid = null;
  var DRAG_THRESHOLD = 6;
  var TOKEN_FALLBACK = 58;

  function tokenExtent(el) {
    if (el && el.offsetWidth) return el.offsetWidth;
    return TOKEN_FALLBACK;
  }

  /* =========================================================
   * 1. Render the symbol library (left column)
   * Pointer drag works on tablet; HTML5 DnD kept for desktop.
   * Tap still places near centre when not dragged.
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

        // HTML5 drag (desktop)
        el.addEventListener("dragstart", function (e) {
          e.dataTransfer.setData("text/symbol-id", item.id);
          e.dataTransfer.effectAllowed = "copy";
        });
        // tap-to-place when user did not drag
        el.addEventListener("click", function () {
          if (el._suppressClick) {
            el._suppressClick = false;
            return;
          }
          addToken(item.id);
        });

        enableLibraryPointerDrag(el, item);

        grid.appendChild(el);
      });

      libraryEl.appendChild(grid);
    });
  }

  /**
   * Tablet-friendly: press + drag from library onto canvas.
   * Ghost follows finger; drop places at point; cancel if released outside.
   */
  function enableLibraryPointerDrag(el, item) {
    var startX = 0, startY = 0, active = false, dragging = false;
    var ghost = null, pointerId = null;

    function ghostAt(clientX, clientY) {
      if (!ghost) return;
      ghost.style.left = clientX + "px";
      ghost.style.top = clientY + "px";
    }

    function ensureGhost() {
      if (ghost) return;
      ghost = document.createElement("div");
      ghost.className = "lib-drag-ghost";
      ghost.textContent = item.emoji;
      ghost.setAttribute("aria-hidden", "true");
      document.body.appendChild(ghost);
      document.body.classList.add("is-library-dragging");
    }

    function clearGhost() {
      if (ghost) {
        ghost.remove();
        ghost = null;
      }
      document.body.classList.remove("is-library-dragging");
      canvasEl.classList.remove("drag-over");
    }

    function pointInCanvas(clientX, clientY) {
      var r = canvasEl.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right &&
             clientY >= r.top && clientY <= r.bottom;
    }

    el.addEventListener("pointerdown", function (e) {
      // left button / touch / pen only
      if (e.button != null && e.button !== 0) return;
      active = true;
      dragging = false;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });

    el.addEventListener("pointermove", function (e) {
      if (!active || e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD + 4) return;
        dragging = true;
        el._suppressClick = true;
        ensureGhost();
      }
      ghostAt(e.clientX, e.clientY);
      if (pointInCanvas(e.clientX, e.clientY)) {
        canvasEl.classList.add("drag-over");
      } else {
        canvasEl.classList.remove("drag-over");
      }
      // avoid scrolling the library while dragging a symbol
      e.preventDefault();
    });

    function endPointer(e) {
      if (!active || (e.pointerId != null && e.pointerId !== pointerId)) return;
      active = false;
      try { el.releasePointerCapture(pointerId); } catch (err) {}
      pointerId = null;

      if (dragging) {
        el._suppressClick = true;
        if (pointInCanvas(e.clientX, e.clientY)) {
          var rect = canvasEl.getBoundingClientRect();
          var half = TOKEN_FALLBACK / 2;
          addToken(
            item.id,
            e.clientX - rect.left - half,
            e.clientY - rect.top - half
          );
        }
        clearGhost();
        dragging = false;
        // swallow the synthetic click that follows touch
        setTimeout(function () { el._suppressClick = false; }, 0);
        return;
      }
      clearGhost();
    }

    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);
  }

  /* =========================================================
   * 2. Canvas drop handling (HTML5 DnD — desktop)
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
    var half = TOKEN_FALLBACK / 2;
    addToken(id, e.clientX - rect.left - half, e.clientY - rect.top - half);
  });

  /* =========================================================
   * 3. Add / remove tokens
   * Drag outside the canvas to destroy (no × button).
   * ========================================================= */
  function addToken(symbolId, x, y) {
    const sym = SYMBOL_INDEX[symbolId];
    if (!sym) return;

    const rect = canvasEl.getBoundingClientRect();
    const half = TOKEN_FALLBACK / 2;
    if (typeof x !== "number" || typeof y !== "number") {
      // click-to-place: scatter near center with small jitter
      x = rect.width / 2 - half + (Math.random() * 120 - 60);
      y = rect.height / 2 - half + (Math.random() * 120 - 60);
    }
    x = clamp(x, 0, Math.max(0, rect.width - TOKEN_FALLBACK));
    y = clamp(y, 0, Math.max(0, rect.height - TOKEN_FALLBACK));

    const uid = "tok_" + (++uidSeq);
    const el = document.createElement("div");
    el.className = "token";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.dataset.uid = uid;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", sym.label + " — drag outside canvas to remove");
    el.textContent = sym.emoji;

    enableTokenDrag(el, uid);
    canvasEl.appendChild(el);

    // Re-clamp with measured size after layout
    var size = tokenExtent(el);
    x = clamp(x, 0, Math.max(0, rect.width - size));
    y = clamp(y, 0, Math.max(0, rect.height - size));
    el.style.left = x + "px";
    el.style.top = y + "px";

    tokens.push({ uid: uid, id: symbolId, x: x, y: y, el: el });
    selectToken(uid);
    onCanvasChange();
  }

  function removeToken(uid) {
    const i = tokens.findIndex(function (t) { return t.uid === uid; });
    if (i === -1) return;
    tokens[i].el.remove();
    tokens.splice(i, 1);
    if (selectedUid === uid) selectedUid = null;
    onCanvasChange();
  }

  /** Play destroy animation, then remove from state. */
  function destroyToken(uid) {
    const t = tokens.find(function (tok) { return tok.uid === uid; });
    if (!t) return;
    var el = t.el;
    if (el.classList.contains("is-destroying")) return;

    el.classList.remove("is-selected", "will-delete", "is-dragging");
    el.classList.add("is-destroying");
    el.style.zIndex = "60";
    el.style.pointerEvents = "none";

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      el.removeEventListener("animationend", finish);
      removeToken(uid);
      canvasEl.classList.remove("is-dragging-token", "is-delete-zone");
      document.body.classList.remove("is-dragging-token");
      var panel = canvasEl.closest(".panel-center");
      if (panel) panel.classList.remove("is-dragging-token");
    }
    el.addEventListener("animationend", finish);
    // Fallback if animationend is skipped
    setTimeout(finish, 380);
  }

  function selectToken(uid) {
    selectedUid = uid;
    tokens.forEach(function (t) {
      t.el.classList.toggle("is-selected", t.uid === uid && !t.el.classList.contains("is-destroying"));
    });
  }

  function clearSelection() {
    selectedUid = null;
    tokens.forEach(function (t) {
      t.el.classList.remove("is-selected");
    });
  }

  /** True when token centre is outside the canvas pad (slight inset so edge is safer). */
  function isOutsideCanvas(clientX, clientY, pad) {
    pad = typeof pad === "number" ? pad : 4;
    var rect = canvasEl.getBoundingClientRect();
    return (
      clientX < rect.left + pad ||
      clientX > rect.right - pad ||
      clientY < rect.top + pad ||
      clientY > rect.bottom - pad
    );
  }

  canvasEl.addEventListener("pointerdown", function (e) {
    if (e.target === canvasEl || e.target.id === "canvas-hint" ||
        (e.target.closest && e.target.closest(".canvas-hint"))) {
      clearSelection();
    }
  });

  /* =========================================================
   * 4. Reposition tokens; drag outside canvas to destroy
   * ========================================================= */
  function enableTokenDrag(el, uid) {
    let startX, startY, origX, origY, dragging = false, moved = false;

    el.addEventListener("pointerdown", function (e) {
      if (el.classList.contains("is-destroying")) return;
      selectToken(uid);
      dragging = true;
      moved = false;
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-dragging");
      el.style.zIndex = "50";
      startX = e.clientX; startY = e.clientY;
      origX = parseFloat(el.style.left); origY = parseFloat(el.style.top);
    });

    el.addEventListener("pointermove", function (e) {
      if (!dragging || el.classList.contains("is-destroying")) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      moved = true;

      canvasEl.classList.add("is-dragging-token");
      document.body.classList.add("is-dragging-token");
      var panel = canvasEl.closest(".panel-center");
      if (panel) panel.classList.add("is-dragging-token");

      // Allow free position (including outside) so the symbol can leave the frame
      var nx = origX + dx;
      var ny = origY + dy;
      el.style.left = nx + "px";
      el.style.top = ny + "px";

      var outside = isOutsideCanvas(e.clientX, e.clientY);
      el.classList.toggle("will-delete", outside);
      canvasEl.classList.toggle("is-delete-zone", outside);

      const t = tokens.find(function (tok) { return tok.uid === uid; });
      if (t) { t.x = nx; t.y = ny; }
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;

      try { el.releasePointerCapture(e.pointerId); } catch (err) {}

      canvasEl.classList.remove("is-dragging-token", "is-delete-zone");
      document.body.classList.remove("is-dragging-token");
      var panel = canvasEl.closest(".panel-center");
      if (panel) panel.classList.remove("is-dragging-token");
      el.classList.remove("is-dragging");

      if (el.classList.contains("is-destroying")) return;

      // Only destroy if user actually dragged (not a pure tap) and released outside
      if (moved && isOutsideCanvas(e.clientX, e.clientY)) {
        destroyToken(uid);
        return;
      }

      // Snap back inside canvas bounds
      el.classList.remove("will-delete");
      var rect = canvasEl.getBoundingClientRect();
      var size = tokenExtent(el);
      var nx = clamp(parseFloat(el.style.left) || 0, 0, Math.max(0, rect.width - size));
      var ny = clamp(parseFloat(el.style.top) || 0, 0, Math.max(0, rect.height - size));
      el.style.left = nx + "px";
      el.style.top = ny + "px";
      el.style.zIndex = "";
      const t = tokens.find(function (tok) { return tok.uid === uid; });
      if (t) { t.x = nx; t.y = ny; }
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
   * 6–7. Tiered reading + confirm/correct loop (demo surface only)
   * propose → Yes → agreed | Not quite → correct → pick/none → agreed/open
   * Canvas change resets; nothing is stored or “learned”.
   * ========================================================= */
  // phase: idle | propose | correct | agreed | open
  var loop = {
    phase: "idle",
    main: "",
    options: [],
    agreedText: ""
  };

  function resetLoop() {
    loop.phase = "idle";
    loop.main = "";
    loop.options = [];
    loop.agreedText = "";
  }

  function runTieredReading() {
    if (thinkTimer) clearTimeout(thinkTimer);
    resetLoop();

    if (tokens.length === 0) {
      renderIdle();
      return;
    }

    showTyping();

    var delay = 700 + Math.random() * 500;
    thinkTimer = setTimeout(function () {
      var reading;
      if (tokens.length === 1) {
        var sym = SYMBOL_INDEX[tokens[0].id];
        reading = (sym && sym.reading)
          ? { main: sym.reading, options: [] }
          : TIERED_READINGS[1];
      } else {
        var idx = Math.min(tokens.length, TIERED_READINGS.length - 1);
        reading = TIERED_READINGS[idx];
      }
      if (!reading) return;
      loop.phase = "propose";
      loop.main = reading.main;
      loop.options = (reading.options || []).slice(0, 3);
      loop.agreedText = "";
      renderLoop();
    }, delay);
  }

  function renderIdle() {
    resetLoop();
    aiBodyEl.innerHTML =
      '<div class="ai-idle">' +
      '<p class="ai-idle-title">Waiting for symbols</p>' +
      '<p class="ai-idle-text">Tap symbols on the left to place them on the canvas and see possible interpretations.</p>' +
      "</div>";
  }

  function showTyping() {
    aiBodyEl.innerHTML =
      '<div class="ai-typing">' +
      '<span class="dots"><span></span><span></span><span></span></span>' +
      "</div>";
  }

  function renderLoop() {
    if (loop.phase === "propose") {
      renderPropose();
    } else if (loop.phase === "correct") {
      renderCorrect();
    } else if (loop.phase === "agreed") {
      renderAgreed();
    } else if (loop.phase === "open") {
      renderOpen();
    }
  }

  function renderPropose() {
    aiBodyEl.innerHTML =
      '<div class="ai-result">' +
        '<p class="ai-phase-label">Possible reading</p>' +
        '<p class="translation">' + escapeHtml(loop.main) + "</p>" +
        '<div class="confirm-block">' +
          '<p class="confirm-q">Does this sound right?</p>' +
          '<div class="confirm-actions">' +
            '<button type="button" class="btn-confirm btn-yes" id="btn-yes">Yes, this</button>' +
            '<button type="button" class="btn-confirm btn-no" id="btn-no">Not quite</button>' +
          "</div>" +
        "</div>" +
      "</div>";

    document.getElementById("btn-yes").addEventListener("click", function () {
      loop.phase = "agreed";
      loop.agreedText = loop.main;
      renderLoop();
    });
    document.getElementById("btn-no").addEventListener("click", function () {
      if (loop.options.length > 0) {
        loop.phase = "correct";
      } else {
        loop.phase = "open";
      }
      renderLoop();
    });
  }

  function renderCorrect() {
    var optsHtml = "";
    loop.options.forEach(function (opt, i) {
      optsHtml +=
        '<button type="button" class="option" data-i="' + i + '">' +
          '<span class="option-tick" aria-hidden="true"></span>' +
          '<span class="option-text">' + escapeHtml(opt) + "</span>" +
        "</button>";
    });

    aiBodyEl.innerHTML =
      '<div class="ai-result">' +
        '<p class="ai-phase-label">Earlier suggestion</p>' +
        '<p class="translation translation-dim">' + escapeHtml(loop.main) + "</p>" +
        '<div class="options-block">' +
          '<p class="options-lead">Which is closer?</p>' +
          '<div class="options">' + optsHtml + "</div>" +
          '<button type="button" class="btn-confirm btn-none" id="btn-none">None of these</button>' +
        "</div>" +
      "</div>";

    aiBodyEl.querySelectorAll(".option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = parseInt(btn.getAttribute("data-i"), 10);
        loop.phase = "agreed";
        loop.agreedText = loop.options[i] || loop.main;
        renderLoop();
      });
    });
    document.getElementById("btn-none").addEventListener("click", function () {
      loop.phase = "open";
      renderLoop();
    });
  }

  function renderAgreed() {
    aiBodyEl.innerHTML =
      '<div class="ai-result">' +
        '<p class="ai-phase-label ai-phase-agreed">Agreed reading</p>' +
        '<p class="translation">' + escapeHtml(loop.agreedText) + "</p>" +
        '<p class="ai-note">For this canvas only — a demo of shared understanding, not saved learning.</p>' +
        '<button type="button" class="btn-confirm btn-revise" id="btn-revise">Revise</button>' +
      "</div>";

    document.getElementById("btn-revise").addEventListener("click", function () {
      loop.phase = "propose";
      loop.agreedText = "";
      renderLoop();
    });
  }

  function renderOpen() {
    aiBodyEl.innerHTML =
      '<div class="ai-result">' +
        '<p class="ai-phase-label ai-phase-open">Not agreed yet</p>' +
        '<p class="translation translation-open">None of these fit. Meaning stays with you for now.</p>' +
        '<p class="ai-note">Try rearranging symbols, or tap Revise to see the suggestion again.</p>' +
        '<button type="button" class="btn-confirm btn-revise" id="btn-revise">Revise</button>' +
      "</div>";

    document.getElementById("btn-revise").addEventListener("click", function () {
      loop.phase = "propose";
      renderLoop();
    });
  }

  /* =========================================================
   * 8. Clear canvas
   * ========================================================= */
  clearBtn.addEventListener("click", function () {
    tokens.forEach(function (t) { t.el.remove(); });
    tokens = [];
    selectedUid = null;
    onCanvasChange();
  });

  /* ---------- helpers ---------- */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* =========================================================
   * 9. Full header hide — control sits in Canvas toolbar (not floating)
   * Default-hidden on a wide tablet range (incl. iPad landscape / Pro).
   * ========================================================= */
  function initHeaderCollapse() {
    var header = document.getElementById("app-header");
    var toggle = document.getElementById("header-chrome-toggle");
    if (!header || !toggle) return;

    var labelEl = toggle.querySelector(".header-chrome-label");
    /*
     * Broader than 1024px so iPad landscape / Pro still match:
     * - width ≤ 1366 (common iPad Pro landscape CSS width)
     * - or primary coarse pointer (touch tablets / convertibles)
     * Desktop mouse + wide screen stays expanded by default.
     */
    var tabletMq = window.matchMedia(
      "(max-width: 1366px), ((pointer: coarse) and (max-width: 1600px))"
    );

    function setCollapsed(on) {
      on = !!on;
      header.classList.toggle("is-collapsed", on);
      document.body.classList.toggle("header-is-collapsed", on);
      document.documentElement.classList.toggle("header-is-collapsed", on);
      toggle.setAttribute("aria-expanded", on ? "false" : "true");
      if (labelEl) labelEl.textContent = on ? "Menu" : "Hide";
      toggle.title = on
        ? "Show top bar (portfolio, about)"
        : "Hide top bar for more canvas room";
      toggle.setAttribute(
        "aria-label",
        on ? "Show top bar" : "Hide top bar"
      );
    }

    function applyDefaultForViewport() {
      setCollapsed(tabletMq.matches);
    }

    toggle.addEventListener("click", function () {
      setCollapsed(!header.classList.contains("is-collapsed"));
    });

    applyDefaultForViewport();
    if (tabletMq.addEventListener) {
      tabletMq.addEventListener("change", applyDefaultForViewport);
    } else if (tabletMq.addListener) {
      tabletMq.addListener(applyDefaultForViewport);
    }
  }

  /* =========================================================
   * 10. Mobile gate — phone breakpoint only (Continue anyway)
   * ========================================================= */
  function initMobileGate() {
    var anyway = document.getElementById("mobile-gate-anyway");
    if (!anyway) return;
    anyway.addEventListener("click", function () {
      document.body.classList.add("mobile-gate-dismissed");
      // Ensure stacked layout can scroll after unlock
      try {
        window.scrollTo(0, 0);
      } catch (e) {}
    });
  }

  /* ---------- init ---------- */
  renderLibrary();
  renderTags();
  initHeaderCollapse();
  initMobileGate();
})();
