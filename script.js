(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* custom cursor -------------------------------------------------- */
  var dot = document.querySelector(".cursor-dot");
  var ring = document.querySelector(".cursor-ring");
  if (dot && ring && window.matchMedia("(pointer: fine)").matches) {
    var mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;
    window.addEventListener("mousemove", function (e) {
      mouseX = e.clientX; mouseY = e.clientY;
      dot.style.left = mouseX + "px";
      dot.style.top = mouseY + "px";
    });
    (function animateCursor() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      requestAnimationFrame(animateCursor);
    })();
    document.querySelectorAll("a, button").forEach(function (el) {
      el.addEventListener("mouseenter", function () { ring.classList.add("hover"); });
      el.addEventListener("mouseleave", function () { ring.classList.remove("hover"); });
    });
  }

  /* scroll progress bar --------------------------------------------- */
  var scrollBar = document.querySelector(".scroll-bar span");
  var nav = document.querySelector(".nav");
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - doc.clientHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (scrollBar) scrollBar.style.width = pct + "%";
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* scroll reveal ------------------------------------------------------ */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  document.querySelectorAll(".reveal, .reveal-line").forEach(function (el, i) {
    el.style.transitionDelay = (i % 4) * 70 + "ms";
    revealObserver.observe(el);
  });

  /* magnetic buttons ------------------------------------------------------ */
  if (!reduceMotion) {
    document.querySelectorAll(".magnetic").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.16;
        var y = (e.clientY - r.top - r.height / 2) * 0.16;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = "translate(0,0)"; });
    });
  }

  /* skill chip flip — touch handling for mobile.
     Desktop hover and keyboard focus are handled purely in CSS.
     Tap a card to flip it; tap anywhere else to release it. */
  document.addEventListener("touchstart", function (e) {
    var chip = e.target.closest ? e.target.closest(".skill-chip") : null;
    document.querySelectorAll(".skill-chip.flipped").forEach(function (c) {
      if (c !== chip) c.classList.remove("flipped");
    });
    if (chip) chip.classList.add("flipped");
  }, { passive: true });

  /* project filter ------------------------------------------------------ */
  var filters = document.querySelectorAll(".filter");
  var projects = document.querySelectorAll(".project");
  filters.forEach(function (filter) {
    filter.addEventListener("click", function () {
      var type = filter.textContent.trim().toLowerCase().replace("all work", "all");
      filters.forEach(function (item) { item.classList.remove("active"); });
      filter.classList.add("active");
      projects.forEach(function (project) {
        project.classList.toggle("is-filtered", type !== "all" && !project.dataset.type.includes(type));
      });
    });
  });

  /* project carousels ------------------------------------------------------ */
  document.querySelectorAll(".project-carousel").forEach(function (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".slide"));
    var dotsWrap = carousel.querySelector(".carousel-dots");
    var counter = carousel.querySelector(".image-counter");
    var active = 0;

    // Match the frame's aspect ratio to whichever screenshot is showing,
    // so every image fills the frame edge-to-edge with nothing cropped
    // and no letterboxing bars.
    function matchAspect(img) {
      function apply() {
        if (img.naturalWidth && img.naturalHeight) {
          carousel.style.setProperty("--ar", (img.naturalWidth / img.naturalHeight).toFixed(4));
        }
      }
      if (img.complete && img.naturalWidth) apply();
      else img.addEventListener("load", apply, { once: true });
    }

    function showSlide(index) {
      active = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) { slide.classList.toggle("active", i === active); });
      Array.prototype.slice.call(dotsWrap.children).forEach(function (d, i) {
        d.classList.toggle("active", i === active);
      });
      counter.textContent = String(active + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
      matchAspect(slides[active]);
    }

    slides.forEach(function (_, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("aria-label", "Show screenshot " + (i + 1));
      d.addEventListener("click", function () { showSlide(i); });
      dotsWrap.appendChild(d);
    });

    var prevBtn = carousel.querySelector(".carousel-prev");
    var nextBtn = carousel.querySelector(".carousel-next");
    if (prevBtn) prevBtn.addEventListener("click", function () { showSlide(active - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { showSlide(active + 1); });

    showSlide(0);
  });

  /* count-up stats ------------------------------------------------------ */
  var countEls = document.querySelectorAll("[data-count-to]");
  if (countEls.length) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseFloat(el.dataset.countTo);
        var suffix = el.dataset.suffix || "";
        countObserver.unobserve(el);
        if (reduceMotion) {
          el.textContent = target.toFixed(2).replace(/\.00$/, "") + suffix;
          return;
        }
        var duration = 1300;
        var start = null;
        function tick(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          var value = target * eased;
          el.textContent = value.toFixed(2) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target.toFixed(2) + suffix;
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    countEls.forEach(function (el) { countObserver.observe(el); });
  }

  /* scrollspy nav ------------------------------------------------------ */
  var navLinks = document.querySelectorAll(".nav-links a[data-nav]");
  if (navLinks.length) {
    var sections = Array.prototype.slice.call(navLinks).map(function (link) {
      return document.getElementById(link.dataset.nav);
    }).filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          navLinks.forEach(function (l) { l.classList.toggle("active", l.dataset.nav === id); });
        }
      });
    }, { threshold: 0.5, rootMargin: "-20% 0px -60% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
