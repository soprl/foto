const W = 1080;
const H = 1350;
const CENTER_WIDTH_RATIO = 0.50;
const CENTER_HEIGHT_RATIO = 0.34;

const state = {
  images: { a: null, b: null },
  transforms: {
    left:      { scale: 1, panX: 0, panY: 0 },
    right:     { scale: 1, panX: 0, panY: 0 },
    swapLeft:  { scale: 1, panX: 0, panY: 0 },
    swapRight: { scale: 1, panX: 0, panY: 0 },
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

function layout() {
  const halfW = W / 2;

  const pieceW = (W * CENTER_WIDTH_RATIO) / 2;
  const boxH = H * CENTER_HEIGHT_RATIO;
  const boxY = (H - boxH) / 2;

  return {
    leftCol:   { x: 0,     y: 0, w: halfW, h: H },
    rightCol:  { x: halfW, y: 0, w: halfW, h: H },
    swapLeft:  { x: halfW - pieceW, y: boxY, w: pieceW, h: boxH },
    swapRight: { x: halfW,         y: boxY, w: pieceW, h: boxH },
  };
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

function fillCenterBlack(ctx, lay, sx, sy) {
  ctx.fillStyle = "#000";
  ctx.fillRect(
    lay.swapLeft.x * sx,
    lay.swapLeft.y * sy,
    (lay.swapLeft.w + lay.swapRight.w) * sx,
    lay.swapLeft.h * sy
  );
}

function render(ctx, pw, ph) {
  ctx.clearRect(0, 0, pw, ph);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, pw, ph);

  const lay = layout();
  const sx = pw / W;
  const sy = ph / H;
  const { images, transforms: t } = state;

  if (images.a) drawInRect(ctx, images.a, lay.leftCol,  lay.leftCol,  t.left,  sx, sy);
  if (images.b) drawInRect(ctx, images.b, lay.rightCol, lay.rightCol, t.right, sx, sy);

  fillCenterBlack(ctx, lay, sx, sy);
  if (images.b) drawInRect(ctx, images.b, lay.swapLeft,  lay.swapLeft,  t.swapLeft,  sx, sy, true);
  if (images.a) drawInRect(ctx, images.a, lay.swapRight, lay.swapRight, t.swapRight, sx, sy, true);
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

function refresh() {
  const ready = state.images.a && state.images.b;
  placeholder.classList.toggle("hidden", ready);
  downloadBtn.disabled = !ready;
  adjustHint.hidden = !ready;
  if (ready) requestAnimationFrame(() => requestAnimationFrame(drawPreview));
}

const ZONE_LABELS = {
  left: "Sol — Fotoğraf 1",
  right: "Sağ — Fotoğraf 2",
  swapLeft: "Orta sol — Fotoğraf 2",
  swapRight: "Orta sağ — Fotoğraf 1",
};

function pickZone(cx, cy) {
  const box = previewBox.getBoundingClientRect();
  const x = ((cx - box.left) / box.width) * W;
  const y = ((cy - box.top) / box.height) * H;
  const lay = layout();

  const sl = lay.swapLeft;
  const sr = lay.swapRight;
  if (x >= sl.x && x < sl.x + sl.w && y >= sl.y && y < sl.y + sl.h) return "swapLeft";
  if (x >= sr.x && x < sr.x + sr.w && y >= sr.y && y < sr.y + sr.h) return "swapRight";
  if (x < W / 2) return "left";
  return "right";
}

function selectZone(id) {
  state.active = id;
  const t = state.transforms[id];
  zoomSlider.value = t.scale;
  zoomValue.textContent = `${t.scale.toFixed(1)}×`;
  activeLabel.textContent = ZONE_LABELS[id];
  zoomBar.hidden = false;
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

previewCanvas.addEventListener("mousedown", (e) => {
  if (!state.images.a || !state.images.b) return;
  const id = pickZone(e.clientX, e.clientY);
  selectZone(id);
  const t = state.transforms[id];
  dragging = { id, x: e.clientX, y: e.clientY, panX: t.panX, panY: t.panY };
  previewCanvas.classList.add("dragging");
  e.preventDefault();
});

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const box = previewBox.getBoundingClientRect();
  const t = state.transforms[dragging.id];
  t.panX = dragging.panX + ((e.clientX - dragging.x) / box.width) * W;
  t.panY = dragging.panY + ((e.clientY - dragging.y) / box.height) * H;
  drawPreview();
});

window.addEventListener("mouseup", () => {
  dragging = null;
  previewCanvas.classList.remove("dragging");
});

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
