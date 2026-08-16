(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stories = Array.prototype.slice.call(document.querySelectorAll(".story")).map(function (story) {
    return {
      el: story,
      stage: story.querySelector(".stage"),
      wrap: story.querySelector(".phone-wrap"),
      beats: Array.prototype.slice.call(story.querySelectorAll(".beat")),
      shots: Array.prototype.slice.call(story.querySelectorAll(".shot")),
      anns: Array.prototype.slice.call(story.querySelectorAll(".ann")),
      dots: Array.prototype.slice.call(story.querySelectorAll(".dot")),
      markers: Array.prototype.slice.call(story.querySelectorAll(".marker")),
      current: -1,
    };
  });

  function setActive(s, i) {
    if (i === s.current || i < 0) return;
    s.current = i;
    var side = s.markers[i] ? s.markers[i].getAttribute("data-side") : "right";
    s.stage.classList.toggle("flip", side === "left");
    [s.beats, s.shots, s.anns, s.dots].forEach(function (els) {
      els.forEach(function (el) {
        el.classList.toggle("active", +el.getAttribute("data-i") === i);
      });
    });
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
        s.wrap.style.transform =
          "translateY(" + (14 - q * 28).toFixed(1) + "px) rotate(" + (1.1 - q * 2.2).toFixed(2) + "deg)";
      }

      // Tall captures scroll inside the phone.
      s.shots.forEach(function (img, i) {
        if (!img.classList.contains("tall")) return;
        var m = s.markers[i];
        if (!m) return;
        var mr = m.getBoundingClientRect();
        var p = (window.innerHeight - mr.top) / (window.innerHeight + mr.height);
        p = Math.max(0, Math.min(1, p));
        var from = parseFloat(img.getAttribute("data-from")) || 0;
        var to = parseFloat(img.getAttribute("data-to")) || 1;
        var frac = from + (to - from) * p;
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
