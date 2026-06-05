(function () {
  const overlay = document.getElementById("popupOverlay");
  const btn = document.getElementById("popupBtn");
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");

  const COLORS = ["#ff6b9d", "#c084fc", "#5b7fff", "#fbbf24", "#4ade80", "#f472b6", "#a78bfa", "#fff"];
  let particles = [];
  let animating = false;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function burst() {
    resizeCanvas();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    particles = [];

    for (let i = 0; i < 180; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      particles.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * 360,
        spin: (Math.random() - 0.5) * 12,
        gravity: 0.12 + Math.random() * 0.08,
        life: 1,
        decay: 0.006 + Math.random() * 0.008,
      });
    }

    if (!animating) {
      animating = true;
      tick();
    }
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles = particles.filter((p) => p.life > 0);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.rot += p.spin;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (particles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      animating = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function closePopup() {
    overlay.classList.add("closing");
    setTimeout(() => {
      overlay.classList.add("gone");
    }, 500);
  }

  btn.addEventListener("click", () => {
    btn.disabled = true;
    burst();
    setTimeout(closePopup, 2200);
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
})();
