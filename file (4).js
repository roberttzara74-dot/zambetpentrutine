/* ===========================================================
   PENTRU TINE — main script
   Vanilla JS + GSAP + Three.js
   No backend. No build step. Works straight on GitHub Pages.
   =========================================================== */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* =========================================================
     UTILITIES
     ========================================================= */

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* =========================================================
     INTRO CINEMATIC — text sequence + particle canvas
     ========================================================= */

  var IntroSequence = (function () {
    var introScreen = document.getElementById("intro-screen");
    var enterBtn = document.getElementById("enter-btn");
    var lines = document.querySelectorAll(".intro-line");
    var zoomFlash = document.getElementById("zoom-flash");
    var ambientAudio = document.getElementById("ambient-audio");

    function playLines() {
      var tl = gsap.timeline({ delay: 0.6 });
      lines.forEach(function (line, i) {
        tl.to(line, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power2.out"
        }, i === 0 ? "+=0" : "+=0.55");
      });
      tl.to(enterBtn, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.9,
        ease: "back.out(1.6)"
      }, "+=0.4");
      return tl;
    }

    function bindEnter() {
      enterBtn.addEventListener("click", function () {
        enterBtn.disabled = true;

        // try to start ambient sound on this user gesture
        if (ambientAudio) {
          ambientAudio.volume = 0.35;
          var p = ambientAudio.play();
          if (p && p.catch) { p.catch(function () { /* autoplay blocked, ignore silently */ }); }
        }

        var tl = gsap.timeline({
          onComplete: function () {
            introScreen.classList.add("intro-hide");
            document.body.classList.remove("no-scroll");
            var app = document.getElementById("app");
            app.hidden = false;
            requestAnimationFrame(function () {
              App.init();
            });
            setTimeout(function () {
              introScreen.style.display = "none";
            }, 1500);
          }
        });

        tl.to(".intro-content", {
          opacity: 0,
          scale: 0.9,
          duration: 0.5,
          ease: "power2.in"
        });

        tl.to(zoomFlash, {
          opacity: 1,
          duration: 0.5,
          ease: "power2.in",
          onStart: function () {
            zoomFlash.style.display = "block";
          }
        }, "-=0.2");

        tl.to(zoomFlash, {
          opacity: 0,
          duration: 0.9,
          ease: "power2.out",
          onComplete: function () {
            zoomFlash.style.display = "none";
          }
        }, "+=0.05");
      });
    }

    function init() {
      if (prefersReducedMotion) {
        lines.forEach(function (l) { l.style.opacity = 1; l.style.transform = "none"; });
        enterBtn.style.opacity = 1;
        enterBtn.style.transform = "none";
      } else {
        playLines();
      }
      bindEnter();
      IntroParticles.init();
    }

    return { init: init };
  })();

  /* =========================================================
     INTRO PARTICLES — Three.js petals + stars field
     ========================================================= */

  var IntroParticles = (function () {
    var canvas = document.getElementById("intro-canvas");
    var renderer, scene, camera, petals, stars, frameId;
    var running = false;

    function setup() {
      if (!window.THREE || prefersReducedMotion) return;

      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(window.innerWidth, window.innerHeight);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 12;

      // Stars — small bright points
      var starCount = isTouch ? 140 : 260;
      var starGeo = new THREE.BufferGeometry();
      var starPos = new Float32Array(starCount * 3);
      for (var i = 0; i < starCount; i++) {
        starPos[i * 3] = rand(-14, 14);
        starPos[i * 3 + 1] = rand(-9, 9);
        starPos[i * 3 + 2] = rand(-8, 4);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      var starMat = new THREE.PointsMaterial({
        color: 0xffe3ef,
        size: 0.045,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      });
      stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      // Petals — bigger, softly pink, falling
      var petalCount = isTouch ? 26 : 46;
      var petalGeo = new THREE.BufferGeometry();
      var petalPos = new Float32Array(petalCount * 3);
      var petalSpeeds = new Float32Array(petalCount);
      for (var j = 0; j < petalCount; j++) {
        petalPos[j * 3] = rand(-9, 9);
        petalPos[j * 3 + 1] = rand(-8, 9);
        petalPos[j * 3 + 2] = rand(-4, 6);
        petalSpeeds[j] = rand(0.006, 0.018);
      }
      petalGeo.setAttribute("position", new THREE.BufferAttribute(petalPos, 3));
      var petalMat = new THREE.PointsMaterial({
        color: 0xffb3d1,
        size: 0.16,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      });
      petals = new THREE.Points(petalGeo, petalMat);
      petals.userData.speeds = petalSpeeds;
      scene.add(petals);

      running = true;
      animate();
      window.addEventListener("resize", onResize);
    }

    function onResize() {
      if (!renderer) return;
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }

    function animate() {
      if (!running) return;
      frameId = requestAnimationFrame(animate);

      var pos = petals.geometry.attributes.position;
      var speeds = petals.userData.speeds;
      for (var i = 0; i < pos.count; i++) {
        var y = pos.getY(i) - speeds[i];
        var x = pos.getX(i) + Math.sin(y * 2) * 0.003;
        if (y < -9) { y = 9; }
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;

      stars.rotation.z += 0.0003;

      renderer.render(scene, camera);
    }

    function stop() {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      if (renderer) {
        renderer.dispose();
      }
    }

    function init() {
      setup();
      // stop intro particle loop shortly after the transition finishes to save resources
      setTimeout(function () {
        stop();
      }, 6000);
    }

    return { init: init };
  })();

  /* =========================================================
     MAIN APP — everything after "Intră"
     ========================================================= */

  var App = (function () {
    var initialized = false;

    function init() {
      if (initialized) return;
      initialized = true;

      BackgroundField.init();
      CursorGlow.init();
      SoundToggle.init();
      PetalRain.init();
      HeroTypewriter.init();
      ScrollReveals.init();
      ScrollIndicator.init();
      Surprises.init();
      Gallery.init();
      MiniGame.init();
      Finale.init();
    }

    return { init: init };
  })();

  /* =========================================================
     BACKGROUND FIELD — subtle Three.js particles behind content
     ========================================================= */

  var BackgroundField = (function () {
    var canvas = document.getElementById("bg-canvas");
    var renderer, scene, camera, points, frameId;
    var visible = true;

    function setup() {
      if (!window.THREE || prefersReducedMotion) return;

      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 10;

      var count = isTouch ? 60 : 110;
      var geo = new THREE.BufferGeometry();
      var pos = new Float32Array(count * 3);
      for (var i = 0; i < count; i++) {
        pos[i * 3] = rand(-12, 12);
        pos[i * 3 + 1] = rand(-10, 10);
        pos[i * 3 + 2] = rand(-6, 3);
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      var mat = new THREE.PointsMaterial({
        color: 0xffc3d9,
        size: 0.09,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      });
      points = new THREE.Points(geo, mat);
      scene.add(points);

      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", function () {
        visible = document.visibilityState === "visible";
      });

      animate();
    }

    function onResize() {
      if (!renderer) return;
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }

    function animate() {
      frameId = requestAnimationFrame(animate);
      if (!visible) return;
      points.rotation.y += 0.0006;
      points.rotation.x += 0.0002;
      renderer.render(scene, camera);
    }

    function init() { setup(); }

    return { init: init };
  })();

  /* =========================================================
     CURSOR GLOW — follows pointer with easing
     ========================================================= */

  var CursorGlow = (function () {
    var el = document.getElementById("cursor-glow");
    var tx = 0, ty = 0, cx = 0, cy = 0;
    var raf;

    function onMove(e) {
      tx = e.clientX;
      ty = e.clientY;
    }

    function loop() {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      el.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      raf = requestAnimationFrame(loop);
    }

    function init() {
      if (!el || isTouch) return;
      window.addEventListener("mousemove", onMove);
      loop();
    }

    return { init: init };
  })();

  /* =========================================================
     SOUND TOGGLE
     ========================================================= */

  var SoundToggle = (function () {
    function init() {
      var btn = document.getElementById("sound-toggle");
      var audio = document.getElementById("ambient-audio");
      if (!btn || !audio) return;

      btn.addEventListener("click", function () {
        if (audio.paused) {
          var p = audio.play();
          if (p && p.catch) { p.catch(function () {}); }
          btn.classList.remove("muted");
        } else {
          audio.pause();
          btn.classList.add("muted");
        }
      });

      // reflect initial (likely paused/blocked) state
      if (audio.paused) btn.classList.add("muted");
    }
    return { init: init };
  })();

  /* =========================================================
     PETAL RAIN — DOM based falling petals in hero + ambient
     ========================================================= */

  var PetalRain = (function () {
    var layer;
    var symbols = ["🌸", "🌺", "❀", "✿"];
    var maxPetals = isTouch ? 10 : 18;
    var active = 0;

    function spawnPetal() {
      if (!layer || active >= maxPetals || prefersReducedMotion) return;
      active++;
      var petal = document.createElement("span");
      petal.className = "falling-petal";
      petal.textContent = pick(symbols);
      var startX = rand(0, 100);
      var duration = rand(9, 16);
      var drift = rand(-60, 60);
      var size = rand(0.9, 1.6);

      petal.style.left = startX + "%";
      petal.style.fontSize = size + "rem";
      layer.appendChild(petal);

      if (window.gsap) {
        gsap.fromTo(petal,
          { y: -40, x: 0, rotate: 0, opacity: 0 },
          {
            y: window.innerHeight + 80,
            x: drift,
            rotate: rand(180, 480),
            opacity: 0.85,
            duration: duration,
            ease: "none",
            onComplete: function () {
              petal.remove();
              active--;
            }
          }
        );
        gsap.to(petal, { opacity: 0.85, duration: 1.2, delay: duration - 1.4 });
      } else {
        petal.remove();
        active--;
      }
    }

    function init() {
      layer = document.querySelector(".petal-layer");
      if (!layer) return;
      for (var i = 0; i < 4; i++) {
        setTimeout(spawnPetal, i * 900);
      }
      setInterval(spawnPetal, 1800);
    }

    return { init: init };
  })();

  /* =========================================================
     HERO TYPEWRITER — sequential typing effect for hero lines
     ========================================================= */

  var HeroTypewriter = (function () {
    function typeLine(el, text, speed) {
      return new Promise(function (resolve) {
        var i = 0;
        el.textContent = "";
        (function tick() {
          if (i <= text.length) {
            el.textContent = text.slice(0, i);
            i++;
            setTimeout(tick, speed);
          } else {
            resolve();
          }
        })();
      });
    }

    async function playSequence(lines) {
      for (var i = 0; i < lines.length; i++) {
        await typeLine(lines[i], lines[i].dataset.text, 28);
        await new Promise(function (r) { setTimeout(r, 500); });
      }
    }

    function init() {
      var lines = document.querySelectorAll("#hero-messages .hero-line");
      if (!lines.length) return;

      if (prefersReducedMotion) {
        lines.forEach(function (l) { l.textContent = l.dataset.text; });
        return;
      }

      if (window.gsap && window.ScrollTrigger) {
        ScrollTrigger.create({
          trigger: "#hero",
          start: "top 70%",
          once: true,
          onEnter: function () { playSequence(Array.prototype.slice.call(lines)); }
        });
      } else {
        playSequence(Array.prototype.slice.call(lines));
      }
    }

    return { init: init };
  })();

  /* =========================================================
     SCROLL REVEALS — fade + rise on scroll, staggered per section
     ========================================================= */

  var ScrollReveals = (function () {
    function init() {
      if (!window.gsap || !window.ScrollTrigger) {
        document.querySelectorAll(".reveal-up").forEach(function (el) {
          el.style.opacity = 1;
          el.style.transform = "none";
        });
        return;
      }

      document.querySelectorAll(".section").forEach(function (section) {
        var items = section.querySelectorAll(".reveal-up");
        if (!items.length) return;

        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            once: true
          }
        });
      });

      // subtle parallax on section titles
      document.querySelectorAll(".section-title").forEach(function (title) {
        gsap.to(title, {
          y: -20,
          ease: "none",
          scrollTrigger: {
            trigger: title,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6
          }
        });
      });
    }
    return { init: init };
  })();

  /* =========================================================
     SCROLL INDICATOR
     ========================================================= */

  var ScrollIndicator = (function () {
    function init() {
      var btn = document.getElementById("scroll-indicator");
      if (!btn) return;
      btn.addEventListener("click", function () {
        var next = document.getElementById("messages");
        if (next) next.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
      });
    }
    return { init: init };
  })();

  /* =========================================================
     SURPRISE MODAL — shared modal used by surprise items
     ========================================================= */

  var SurpriseModal = (function () {
    var overlay = document.getElementById("surprise-modal");
    var textEl = document.getElementById("modal-text");
    var closeBtn = document.getElementById("modal-close");
    var bound = false;

    function open(message) {
      if (!overlay) return;
      textEl.textContent = message;
      overlay.classList.add("show");
      overlay.setAttribute("aria-hidden", "false");
    }

    function close() {
      if (!overlay) return;
      overlay.classList.remove("show");
      overlay.setAttribute("aria-hidden", "true");
    }

    function init() {
      if (bound || !overlay) return;
      bound = true;
      closeBtn.addEventListener("click", close);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    }

    return { init: init, open: open, close: close };
  })();

  /* =========================================================
     SURPRISES SECTION — hidden interactive elements
     ========================================================= */

  var Surprises = (function () {
    function burstHearts(x, y) {
      if (prefersReducedMotion) return;
      var symbols = ["💗", "✨", "🌸"];
      for (var i = 0; i < 6; i++) {
        var el = document.createElement("span");
        el.textContent = pick(symbols);
        el.style.position = "fixed";
        el.style.left = x + "px";
        el.style.top = y + "px";
        el.style.fontSize = rand(1, 1.6) + "rem";
        el.style.zIndex = 1500;
        el.style.pointerEvents = "none";
        document.body.appendChild(el);

        if (window.gsap) {
          gsap.to(el, {
            x: rand(-80, 80),
            y: rand(-120, -40),
            opacity: 0,
            rotate: rand(-90, 90),
            duration: rand(0.9, 1.5),
            ease: "power2.out",
            onComplete: function () { el.remove(); }
          });
        } else {
          setTimeout(function () { el.remove(); }, 1200);
        }
      }
    }

    function init() {
      SurpriseModal.init();
      var items = document.querySelectorAll(".surprise-item");
      items.forEach(function (item) {
        item.addEventListener("click", function (e) {
          var rect = item.getBoundingClientRect();
          burstHearts(rect.left + rect.width / 2, rect.top);
          item.classList.add("found");
          SurpriseModal.open(item.dataset.message);
        });
      });
    }

    return { init: init };
  })();

  /* =========================================================
     GALLERY — polaroid flip cards
     ========================================================= */

  var Gallery = (function () {
    function init() {
      var cards = document.querySelectorAll(".polaroid");
      cards.forEach(function (card) {
        card.addEventListener("click", function () {
          card.classList.toggle("flipped");
        });
      });
    }
    return { init: init };
  })();

  /* =========================================================
     MINI GAME — find the 5 hidden strawberries
     ========================================================= */

  var MiniGame = (function () {
    var foundCount = 0;
    var total = 0;

    function checkComplete() {
      if (foundCount >= total) {
        var overlay = document.getElementById("game-complete");
        overlay.classList.add("show");
        Confetti.burst();
      }
    }

    function init() {
      var items = document.querySelectorAll(".hidden-strawberry");
      total = items.length;
      var counter = document.getElementById("found-count");

      items.forEach(function (item) {
        item.addEventListener("click", function () {
          if (item.classList.contains("collected")) return;
          item.classList.add("collected");
          foundCount++;
          if (counter) counter.textContent = String(foundCount);
          checkComplete();
        });
      });

      Confetti.init();
    }

    return { init: init };
  })();

  /* =========================================================
     CONFETTI — canvas 2D particle burst (hearts + confetti)
     ========================================================= */

  var Confetti = (function () {
    var canvas = document.getElementById("confetti-canvas");
    var ctx, particles = [], animId;
    var colors = ["#ff9ec2", "#ffd3e3", "#f582ac", "#f3c98b", "#ffffff"];

    function resize() {
      if (!canvas) return;
      var field = canvas.parentElement;
      canvas.width = field.clientWidth;
      canvas.height = field.clientHeight;
    }

    function spawnParticle() {
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: rand(-6, 6),
        vy: rand(-9, -2),
        gravity: 0.18,
        size: rand(5, 11),
        color: pick(colors),
        rotation: rand(0, Math.PI * 2),
        vr: rand(-0.2, 0.2),
        life: 0,
        maxLife: rand(70, 120),
        shape: Math.random() > 0.5 ? "heart" : "square"
      };
    }

    function drawHeart(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      var s = p.size * 0.09;
      ctx.beginPath();
      ctx.moveTo(0, s * 3);
      ctx.bezierCurveTo(-s * 5, -s * 2, -s * 1.5, -s * 5, 0, -s * 1.5);
      ctx.bezierCurveTo(s * 1.5, -s * 5, s * 5, -s * 2, 0, s * 3);
      ctx.fill();
      ctx.restore();
    }

    function drawSquare(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles = particles.filter(function (p) { return p.life < p.maxLife; });

      particles.forEach(function (p) {
        p.vy += p.gravity * 0.05;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.life++;
        ctx.globalAlpha = clamp(1 - p.life / p.maxLife, 0, 1);
        if (p.shape === "heart") drawHeart(p); else drawSquare(p);
      });
      ctx.globalAlpha = 1;

      if (particles.length > 0) {
        animId = requestAnimationFrame(animate);
      } else {
        animId = null;
      }
    }

    function burst() {
      if (!canvas) return;
      resize();
      ctx = canvas.getContext("2d");
      for (var i = 0; i < 90; i++) {
        particles.push(spawnParticle());
      }
      if (!animId) animate();
    }

    function init() {
      if (!canvas) return;
      resize();
      window.addEventListener("resize", resize);
    }

    return { init: init, burst: burst };
  })();

  /* =========================================================
     FINALE — starfield canvas + sequential line reveal
     ========================================================= */

  var Finale = (function () {
    var canvas = document.getElementById("finale-canvas");
    var ctx, stars = [], animId;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }

    function buildStars() {
      var count = isTouch ? 90 : 160;
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: rand(0, canvas.width),
          y: rand(0, canvas.height),
          r: rand(0.4, 1.8),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.01, 0.03)
        });
      }
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(function (s) {
        s.phase += s.speed;
        var alpha = 0.4 + Math.sin(s.phase) * 0.35;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,230,240," + clamp(alpha, 0.1, 0.9) + ")";
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    }

    function playLines() {
      var lines = document.querySelectorAll("#finale-content .finale-line, #finale-content .finale-flower");
      if (prefersReducedMotion || !window.gsap) {
        lines.forEach(function (l) { l.style.opacity = 1; });
        return;
      }
      var tl = gsap.timeline();
      lines.forEach(function (line, i) {
        tl.to(line, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out"
        }, i === 0 ? "+=0.1" : "+=0.5");
      });
    }

    function initCanvas() {
      if (!canvas || prefersReducedMotion) return;
      ctx = canvas.getContext("2d");
      resize();
      buildStars();
      window.addEventListener("resize", function () {
        resize();
        buildStars();
      });
      animate();
    }

    function init() {
      initCanvas();
      if (window.ScrollTrigger) {
        ScrollTrigger.create({
          trigger: "#finale",
          start: "top 60%",
          once: true,
          onEnter: playLines
        });
      } else {
        playLines();
      }
    }

    return { init: init };
  })();

  /* =========================================================
     BOOT — start the intro as soon as DOM is ready
     ========================================================= */

  document.addEventListener("DOMContentLoaded", function () {
    IntroSequence.init();
  });

})();
