const W = 1080;
const H = 1350;
const CENTER_WIDTH_RATIO = 0.50;
const CENTER_HEIGHT_RATIO = 0.34;
const HORIZ_SQUARE_RATIO = 0.40;
const HORIZ_GAP_RATIO = 0.055;

const state = {
  layout: "vertical",
  images: { a: null, b: null },
  transforms: {
    mainA: { scale: 1, panX: 0, panY: 0 },
    mainB: { scale: 1, panX: 0, panY: 0 },
    swapA: { scale: 1, panX: 0, panY: 0 },
    swapB: { scale: 1, panX: 0, panY: 0 },
  },
  active: null,
};

const previewBox = document.getElementById("previewBox");
const previewCanvas = document.getElementById("previewCanvas");
const exportCanvas = document.getElementById("exportCanvas");
const pCtx = previewCanvas.getContext("2d");
const eCtx = exportCanvas.getContext("2d");
const placeholder = document.getElementById("previewPlaceholder");
const downloadBtn = document.getElementById("downloadBtn");
const adjustHint = document.getElementById("adjustHint");
const activeLabel = document.getElementById("activeLabel");
const zoomBar = document.getElementById("zoomBar");
const zoomSlider = document.getElementById("zoomSlider");
const zoomValue = document.getElementById("zoomValue");
const resetBtn = document.getElementById("resetBtn");

let dragging = null;
let pinching = null;

const isMobile =
  window.matchMedia("(max-width: 768px), (hover: none) and (pointer: coarse)").matches;

const ZONE_LABELS = {
  vertical: {
    mainA: "Sol — Fotoğraf 1",
    mainB: "Sağ — Fotoğraf 2",
    swapB: "Orta sol — Fotoğraf 2",
    swapA: "Orta sağ — Fotoğraf 1",
  },
  horizontal: {
    mainA: "Üst — Fotoğraf 1",
    mainB: "Alt — Fotoğraf 2",
    swapB: "Orta üst — Fotoğraf 2",
    swapA: "Orta alt — Fotoğraf 1",
  },
};

function touchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function touchMid(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function layoutVertical() {
  const halfW = W / 2;
  const pieceW = (W * CENTER_WIDTH_RATIO) / 2;
  const boxH = H * CENTER_HEIGHT_RATIO;
  const boxY = (H - boxH) / 2;

  return {
    mainAClip:  { x: 0,     y: 0, w: halfW, h: H },
    mainAFrame: { x: 0,     y: 0, w: halfW, h: H },
    mainBClip:  { x: halfW, y: 0, w: halfW, h: H },
    mainBFrame: { x: halfW, y: 0, w: halfW, h: H },
    swapBClip:  { x: halfW - pieceW, y: boxY, w: pieceW, h: boxH },
    swapBFrame: { x: halfW - pieceW, y: boxY, w: pieceW, h: boxH },
    swapAClip:  { x: halfW,         y: boxY, w: pieceW, h: boxH },
    swapAFrame: { x: halfW,         y: boxY, w: pieceW, h: boxH },
  };
}

function layoutHorizontal() {
  const halfH = H / 2;
  const sq = W * HORIZ_SQUARE_RATIO;
  const gap = H * HORIZ_GAP_RATIO;
  const cx = (W - sq) / 2;
  const midY = H / 2;

  return {
    mainAClip:  { x: 0, y: 0,     w: W, h: halfH },
    mainAFrame: { x: 0, y: 0,     w: W, h: H },
    mainBClip:  { x: 0, y: halfH, w: W, h: halfH },
    mainBFrame: { x: 0, y: 0,     w: W, h: H },
    swapBClip:  { x: cx, y: midY - gap / 2 - sq, w: sq, h: sq },
    swapBFrame: { x: cx, y: midY - gap / 2 - sq, w: sq, h: sq },
    swapAClip:  { x: cx, y: midY + gap / 2,       w: sq, h: sq },
    swapAFrame: { x: cx, y: midY + gap / 2,       w: sq, h: sq },
  };
}

function layout() {
  return state.layout === "horizontal" ? layoutHorizontal() : layoutVertical();
}

function drawInRect(ctx, image, clip, frame, t, sx, sy, blackBg = false) {
  if (!image || clip.w <= 0 || clip.h <= 0) return;

  const c = { x: clip.x * sx, y: clip.y * sy, w: clip.w * sx, h: clip.h * sy };
  const f = { x: frame.x * sx, y: frame.y * sy, w: frame.w * sx, h: frame.h * sy };

  const ia = image.naturalWidth / image.naturalHeight;
  const ra = f.w / f.h;
  const base = ia > ra ? f.h / image.naturalHeight : f.w / image.naturalWidth;
  const sc = base * t.scale;
  const dw = image.naturalWidth * sc;
  const dh = image.naturalHeight * sc;

  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x, c.y, c.w, c.h);
  ctx.clip();
  if (blackBg) {
    ctx.fillStyle = "#000";
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  ctx.drawImage(
    image,
    f.x + f.w / 2 + t.panX * sx - dw / 2,
    f.y + f.h / 2 + t.panY * sy - dh / 2,
    dw,
    dh
  );
  ctx.restore();
}

function fillSwapBlack(ctx, lay, sx, sy) {
  ctx.fillStyle = "#000";
  if (state.layout === "vertical") {
    ctx.fillRect(
      lay.swapBClip.x * sx,
      lay.swapBClip.y * sy,
      (lay.swapBClip.w + lay.swapAClip.w) * sx,
      lay.swapBClip.h * sy
    );
  } else {
    ctx.fillRect(lay.swapBClip.x * sx, lay.swapBClip.y * sy, lay.swapBClip.w * sx, lay.swapBClip.h * sy);
    ctx.fillRect(lay.swapAClip.x * sx, lay.swapAClip.y * sy, lay.swapAClip.w * sx, lay.swapAClip.h * sy);
  }
}

function render(ctx, pw, ph) {
  ctx.clearRect(0, 0, pw, ph);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, pw, ph);

  const lay = layout();
  const sx = pw / W;
  const sy = ph / H;
  const { images, transforms: t } = state;

  if (images.a) drawInRect(ctx, images.a, lay.mainAClip, lay.mainAFrame, t.mainA, sx, sy);
  if (images.b) drawInRect(ctx, images.b, lay.mainBClip, lay.mainBFrame, t.mainB, sx, sy);

  fillSwapBlack(ctx, lay, sx, sy);
  if (images.b) drawInRect(ctx, images.b, lay.swapBClip, lay.swapBFrame, t.swapB, sx, sy, true);
  if (images.a) drawInRect(ctx, images.a, lay.swapAClip, lay.swapAFrame, t.swapA, sx, sy, true);
}

function drawPreview() {
  const box = previewBox.getBoundingClientRect();
  if (box.width < 1) return;
  const dpr = window.devicePixelRatio || 1;
  previewCanvas.width = Math.round(box.width * dpr);
  previewCanvas.height = Math.round(box.height * dpr);
  pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render(pCtx, box.width, box.height);
}

function defaultHint() {
  if (isMobile) return "Sürükleyerek hizala · İki parmakla büyüt/küçült";
  return state.layout === "horizontal"
    ? "Fotoğraf 1 üstte · Fotoğraf 2 altta · Tıklayıp sürükleyin"
    : "Fotoğraf 1 solda · Fotoğraf 2 sağda · Tıklayıp sürükleyin";
}

function refresh() {
  const ready = state.images.a && state.images.b;
  placeholder.classList.toggle("hidden", ready);
  downloadBtn.disabled = !ready;
  if (ready && !state.active) adjustHint.textContent = defaultHint();
  adjustHint.hidden = !ready;
  if (ready) requestAnimationFrame(() => requestAnimationFrame(drawPreview));
}

function pickZone(cx, cy) {
  const box = previewBox.getBoundingClientRect();
  const x = ((cx - box.left) / box.width) * W;
  const y = ((cy - box.top) / box.height) * H;
  const lay = layout();

  const sb = lay.swapBClip;
  const sa = lay.swapAClip;
  if (x >= sb.x && x < sb.x + sb.w && y >= sb.y && y < sb.y + sb.h) return "swapB";
  if (x >= sa.x && x < sa.x + sa.w && y >= sa.y && y < sa.y + sa.h) return "swapA";

  if (state.layout === "horizontal") {
    return y < H / 2 ? "mainA" : "mainB";
  }
  return x < W / 2 ? "mainA" : "mainB";
}

function syncScaleUI(id) {
  const t = state.transforms[id];
  const label = ZONE_LABELS[state.layout][id];
  if (isMobile) {
    adjustHint.textContent = `${label} · ${t.scale.toFixed(1)}× — Sürükle · İki parmakla büyüt/küçült`;
    adjustHint.hidden = false;
  } else {
    zoomSlider.value = t.scale;
    zoomValue.textContent = `${t.scale.toFixed(1)}×`;
    activeLabel.textContent = label;
    zoomBar.hidden = false;
  }
}

function selectZone(id) {
  state.active = id;
  syncScaleUI(id);
}

function loadFile(file, slot) {
  if (!file || !file.type.startsWith("image/")) {
    alert("Lütfen JPG veya PNG seçin.");
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.images[slot] = img;
    const el = document.getElementById(slot === "a" ? "uploadA" : "uploadB");
    el.querySelector(".upload-thumb").src = url;
    el.querySelector(".upload-thumb").hidden = false;
    el.classList.add("filled");
    refresh();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert("Fotoğraf yüklenemedi.");
  };
  img.src = url;
}

document.querySelectorAll('input[type="file"]').forEach((inp) => {
  inp.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) loadFile(f, inp.dataset.slot);
    e.target.value = "";
  });
});

document.querySelectorAll(".layout-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.layout = btn.dataset.layout;
    state.active = null;
    zoomBar.hidden = true;
    document.querySelectorAll(".layout-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.layout === state.layout);
    });
    if (state.images.a && state.images.b) {
      adjustHint.textContent = defaultHint();
      drawPreview();
    }
  });
});

function startDrag(clientX, clientY) {
  if (!state.images.a || !state.images.b) return;
  const id = pickZone(clientX, clientY);
  selectZone(id);
  const t = state.transforms[id];
  dragging = { id, x: clientX, y: clientY, panX: t.panX, panY: t.panY };
  previewCanvas.classList.add("dragging");
}

function moveDrag(clientX, clientY) {
  if (!dragging) return;
  const box = previewBox.getBoundingClientRect();
  const t = state.transforms[dragging.id];
  t.panX = dragging.panX + ((clientX - dragging.x) / box.width) * W;
  t.panY = dragging.panY + ((clientY - dragging.y) / box.height) * H;
  drawPreview();
}

function endDrag() {
  dragging = null;
  previewCanvas.classList.remove("dragging");
}

previewCanvas.addEventListener("mousedown", (e) => {
  startDrag(e.clientX, e.clientY);
  e.preventDefault();
});

window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
window.addEventListener("mouseup", endDrag);

previewCanvas.addEventListener("touchstart", (e) => {
  if (!state.images.a || !state.images.b) return;

  if (e.touches.length === 2) {
    endDrag();
    const mid = touchMid(e.touches);
    const id = pickZone(mid.x, mid.y);
    selectZone(id);
    pinching = {
      id,
      startDist: touchDist(e.touches),
      startScale: state.transforms[id].scale,
    };
    e.preventDefault();
  } else if (e.touches.length === 1) {
    pinching = null;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }
}, { passive: false });

previewCanvas.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2 && pinching) {
    const ratio = touchDist(e.touches) / pinching.startDist;
    const t = state.transforms[pinching.id];
    t.scale = Math.min(3, Math.max(1, pinching.startScale * ratio));
    syncScaleUI(pinching.id);
    drawPreview();
    e.preventDefault();
  } else if (e.touches.length === 1 && dragging) {
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }
}, { passive: false });

previewCanvas.addEventListener("touchend", (e) => {
  if (e.touches.length === 0) {
    pinching = null;
    endDrag();
  } else if (e.touches.length === 1) {
    pinching = null;
    const touch = e.touches[0];
    if (state.active) {
      const t = state.transforms[state.active];
      dragging = {
        id: state.active,
        x: touch.clientX,
        y: touch.clientY,
        panX: t.panX,
        panY: t.panY,
      };
    }
  }
});

if (!isMobile) {
  previewCanvas.addEventListener("wheel", (e) => {
    if (!state.active) return;
    e.preventDefault();
    const t = state.transforms[state.active];
    t.scale = Math.min(3, Math.max(1, t.scale + (e.deltaY > 0 ? -0.05 : 0.05)));
    zoomSlider.value = t.scale;
    zoomValue.textContent = `${t.scale.toFixed(1)}×`;
    drawPreview();
  }, { passive: false });

  zoomSlider.addEventListener("input", () => {
    if (!state.active) return;
    state.transforms[state.active].scale = parseFloat(zoomSlider.value);
    zoomValue.textContent = `${state.transforms[state.active].scale.toFixed(1)}×`;
    drawPreview();
  });
}

document.addEventListener("gesturestart", (e) => {
  if (!previewCanvas.contains(e.target)) e.preventDefault();
}, { passive: false });

document.addEventListener("gesturechange", (e) => {
  if (!previewCanvas.contains(e.target)) e.preventDefault();
}, { passive: false });

resetBtn.addEventListener("click", () => {
  if (!state.active) return;
  state.transforms[state.active] = { scale: 1, panX: 0, panY: 0 };
  selectZone(state.active);
  drawPreview();
});

downloadBtn.addEventListener("click", () => {
  exportCanvas.width = W;
  exportCanvas.height = H;
  render(eCtx, W, H);
  exportCanvas.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kolaj-1080x1350-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, "image/png");
});

new ResizeObserver(() => {
  if (state.images.a && state.images.b) drawPreview();
}).observe(previewBox);
