(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stories = Array.prototype.slice.call(document.querySelectorAll(".story")).map(function (story) {
    return {
      el: story,
      stage: story.querySelector(".stage"),
      wrap: story.querySelector(".phone-wrap"),
      shotsBox: story.querySelector(".shots"),
      beats: Array.prototype.slice.call(story.querySelectorAll(".beat")),
      frames: Array.prototype.slice.call(story.querySelectorAll(".shot-frame")),
      shots: Array.prototype.slice.call(story.querySelectorAll(".shot")),
      taps: Array.prototype.slice.call(story.querySelectorAll(".tap")),
      pointers: Array.prototype.slice.call(story.querySelectorAll(".pointer")),
      anns: Array.prototype.slice.call(story.querySelectorAll(".ann")),
      dots: Array.prototype.slice.call(story.querySelectorAll(".dot")),
      markers: Array.prototype.slice.call(story.querySelectorAll(".marker")),
      current: -1,
      pending: null,   // a scheduled switch, waiting for its tap to play out
      cleanup: null,   // timer that resets a .leaving frame after its move
    };
  });

  function replay(el) {
    if (!el) return;
    el.classList.remove("fire");
    void el.offsetWidth; // restart the animation from zero
    el.classList.add("fire");
  }

  // The actual class flip: new frame in, old frame plays its exit.
  // "shown" tracks what is on screen; "current" tracks where the scroll is.
  // They differ only for the few hundred ms while a tap is playing out.
  function commit(s, i, prev, fwd) {
    s.shown = i;
    var side = s.markers[i] ? s.markers[i].getAttribute("data-side") : "right";
    s.stage.classList.toggle("flip", side === "left");
    s.shotsBox.classList.toggle("rev", !fwd);

    if (s.cleanup) { clearTimeout(s.cleanup); s.cleanup = null; }
    var enter = s.frames[i] ? s.frames[i].getAttribute("data-enter") : "fade";
    s.frames.forEach(function (f) {
      var fi = +f.getAttribute("data-i");
      // Everyone not in this move snaps to their parking spot with the
      // transition off — otherwise a stray frame (a cancelled exit, or a
      // parked frame whose position just changed with the rev toggle) slides
      // visibly across the screen on its way there.
      if (fi !== i && fi !== prev) {
        f.style.transition = "none";
        f.classList.remove("leaving", "active");
        f.removeAttribute("data-out");
        void f.offsetWidth;
        f.style.transition = "";
        return;
      }
      f.classList.toggle("active", fi === i);
      if (fi === prev && prev !== i && prev !== -1) {
        f.classList.add("leaving");
        f.setAttribute("data-out", fwd ? enter : "fade");
        if (enter === "zoom" && s.pendingTap) {
          f.style.setProperty("--ox", s.pendingTap[0] + "%");
          f.style.setProperty("--oy", s.pendingTap[1] + "%");
        }
      } else {
        f.classList.remove("leaving");
        f.removeAttribute("data-out");
      }
    });
    s.cleanup = setTimeout(function () {
      s.frames.forEach(function (f) {
        if (!f.classList.contains("leaving")) return;
        f.style.transition = "none";
        f.classList.remove("leaving");
        f.removeAttribute("data-out");
        void f.offsetWidth;
        f.style.transition = "";
      });
    }, 900);

    [s.beats, s.anns, s.dots].forEach(function (els) {
      els.forEach(function (el) {
        el.classList.toggle("active", +el.getAttribute("data-i") === i);
      });
    });
  }

  function setActive(s, i) {
    if (i === s.current || i < 0) return;
    s.current = i;
    var prev = s.shown === undefined ? -1 : s.shown;
    var fwd = i > prev;
    if (s.pending) { clearTimeout(s.pending); s.pending = null; }
    if (i === prev) return; // scrolled back to what is already on screen

    // Moving forward into the NEXT beat with a recorded tap: play the tap on
    // the screen we are leaving first, then make the move. Backwards, or when
    // several beats fly by in one scroll, skip the theatre and just switch.
    var tap = fwd && prev !== -1 && i === prev + 1 && !reduce
      ? s.taps.filter(function (t) { return +t.getAttribute("data-i") === i; })[0]
      : null;
    var pointer = tap
      ? s.pointers.filter(function (p) { return +p.getAttribute("data-i") === i; })[0]
      : null;

    if (!tap) { s.pendingTap = null; commit(s, i, prev, fwd); return; }

    s.pendingTap = [parseFloat(tap.style.left), parseFloat(tap.style.top)];
    var delay;
    if (pointer) { replay(pointer); setTimeout(function () { replay(tap); }, 520); delay = 900; }
    else { replay(tap); delay = 300; }
    s.pending = setTimeout(function () { s.pending = null; commit(s, i, prev, fwd); }, delay);
  }

  // Which beat owns the middle of the screen. Plain geometry rather than an
  // IntersectionObserver: the markers are pulled under a sticky stage with a
  // negative margin, and observers were not reporting them reliably there.
  function frame() {
    var mid = window.innerHeight / 2;
    stories.forEach(function (s) {
      var best = -1;
      for (var i = 0; i < s.markers.length; i++) {
        var r = s.markers[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { best = i; break; }
      }
      if (best === -1) {
        var box = s.el.getBoundingClientRect();
        if (box.bottom <= mid) best = s.markers.length - 1;
        else if (box.top >= mid) best = 0;
      }
      setActive(s, best);

      if (reduce) return;

      // A slow drift over the whole story — deliberately a different speed from
      // the per-beat text, so the two never read as the same movement.
      var b = s.el.getBoundingClientRect();
      var q = (window.innerHeight - b.top) / (window.innerHeight + b.height);
      q = Math.max(0, Math.min(1, q));
      if (s.wrap) {
        // Vertical only — a rotation here read as the phone being tilted.
        s.wrap.style.transform = "translateY(" + (14 - q * 28).toFixed(1) + "px)";
      }

      // Tall captures scroll inside the phone.
      s.shots.forEach(function (img, i) {
        if (!img.classList.contains("tall")) return;
        var m = s.markers[i];
        if (!m) return;
        var mr = m.getBoundingClientRect();
        var p = (window.innerHeight - mr.top) / (window.innerHeight + mr.height);
        p = Math.max(0, Math.min(1, p));
        // A hold is a dead zone at the START of the beat: the screen sits still
        // long enough to be read, then the remaining scroll does the whole pan.
        var hold = parseFloat(img.getAttribute("data-hold")) || 0;
        if (hold > 0 && hold < 1) p = p <= hold ? 0 : (p - hold) / (1 - hold);
        var from = parseFloat(img.getAttribute("data-from")) || 0;
        var to = parseFloat(img.getAttribute("data-to")) || 1;
        // data-to past 1 means: reach the bottom early, then rest there.
        var frac = Math.min(1, from + (to - from) * p);
        var travel = img.offsetHeight - img.parentNode.offsetHeight;
        if (travel > 0) img.style.transform = "translateY(" + -(frac * travel).toFixed(1) + "px)";
      });
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { frame(); ticking = false; });
  }
  // Listen in the capture phase on document: if any ancestor ends up being the
  // scrolling box (a stray overflow on body will do it), scroll events fire
  // there and never reach window.
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", frame);
  frame();

  // ── Interaction ──────────────────────────────────────────────────────────
  // Scroll the page so a given beat sits in the middle. Everything else follows
  // from that, so navigation and scrolling can never disagree.
  function goTo(s, i) {
    var m = s.markers[i];
    if (!m) return;
    var r = m.getBoundingClientRect();
    var y = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  stories.forEach(function (s) {
    // Dots jump to their beat.
    s.dots.forEach(function (dot, i) {
      dot.setAttribute("role", "button");
      dot.setAttribute("tabindex", "0");
      dot.setAttribute("aria-label", "Go to step " + (i + 1));
      dot.addEventListener("click", function () { goTo(s, i); });
      dot.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(s, i); }
      });
    });

    // Tapping the phone advances a beat — and wraps at the end, so it never
    // becomes a dead control.
    var phone = s.el.querySelector(".phone");
    if (phone) {
      phone.setAttribute("role", "button");
      phone.setAttribute("tabindex", "0");
      phone.setAttribute("aria-label", "Next step");
      var advance = function () { goTo(s, (s.current + 1) % s.markers.length); };
      phone.addEventListener("click", advance);
      phone.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); }
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); advance(); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          goTo(s, (s.current - 1 + s.markers.length) % s.markers.length);
        }
      });
    }
  });
})();
