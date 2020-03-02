
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hcanvas = document.getElementById('hcanvas');
const hctx = hcanvas.getContext('2d');
const ocanvas = document.createElement('canvas');
const octx = ocanvas.getContext('2d');
ocanvas.width = 200;
ocanvas.height = 200;

const url = "https://pixel-online.herokuapp.com";
const bgdiv = document.getElementById('canvas-bg');
canvas.width = window.innerWidth * .8;
canvas.height = window.innerHeight * .8;
hcanvas.width = window.innerWidth * .8;
hcanvas.height = window.innerHeight * .8;
hcanvas.tabIndex = 1000;
hcanvas.style.outline = "none";
hcanvas.focus();
const colorPicker = document.getElementById('color-picker');

const MAX_ZOOM = 40;
const MIN_ZOOM = 1;

const speed = 16;

let xOff = 0;
let yOff = 0;
let zoom = 10;

const keyStates = {
  w: false,
  a: false,
  s: false,
  d: false,
};

let lastMouseEvent = { clientX: 0, clientY: 0 };
let mouseCoords = null;
let prevCoords = null;
let mouseDown = false;
let localPixels = [];
let pixels = [];


function setImage() {
  const xScale = ocanvas.width * zoom;
  const yScale = ocanvas.height * zoom;
  ctx.globalCompositeOperation = "copy";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ocanvas, -xOff, -yOff, xScale, yScale);
  ctx.globalCompositeOperation = "source-over"
}

function drawPixels(pixels) {
  let i;
  for(i = 0; i < pixels.length; i += 1) {
    const pixel = pixels[i];
    octx.fillStyle = pixel.color;
    octx.fillRect(pixel.x, pixel.y, 1, 1);
  }
}

function oob(x, y) {
  return x < 0 || x > ocanvas.width || y < 0 || y > ocanvas.height;
}

function drawPixel(pixel) {
  if(oob(pixel.x, pixel.y)) return;
  const xPos = pixel.x * zoom - xOff;
  const yPos = pixel.y * zoom - yOff;
  ctx.fillStyle = pixel.color;
  ctx.fillRect(xPos, yPos, zoom, zoom);
  octx.fillStyle = pixel.color;
  octx.fillRect(pixel.x, pixel.y, 1, 1);
}

function drawHighlight() {
  hctx.clearRect(0, 0, hcanvas.width, hcanvas.height);
  if(!mouseCoords || oob(mouseCoords.x, mouseCoords.y)) return
  hctx.strokeStyle = '#000000';
  if(mouseDown) hctx.strokeStyle = '#FF0000';
  hctx.lineWidth = 2;
  hctx.beginPath();
  hctx.rect(mouseCoords.x * zoom - xOff, mouseCoords.y * zoom - yOff, zoom, zoom);
  hctx.stroke();
}

function draw() {
  octx.fillStyle = '#FFFFFF';
  octx.fillRect(0, 0, ocanvas.width, ocanvas.height);
  drawPixels(localPixels);
  drawPixels(pixels);
  setImage();
  drawHighlight();
}

function loadPixels() {
  return fetch(`${url}/pixels`)
  .then((res) => res.json())
  .then((newPixels) => {
    pixels = newPixels;
    draw();
  });
}

function fetchPixels() {
  const i = localPixels.length;
  const data = { pixels: localPixels };
  const ops = {
    headers: {
      "content-type":"application/json",
    },
    body: JSON.stringify(data),
    method: "POST",
  };
  return fetch(`${url}/pixels`, ops)
  .then((res) => res.json())
  .then((newPixels) => {
    pixels = newPixels.concat(localPixels);
    localPixels.splice(0, i);
    draw();
  });
}

function fillPixel(x, y, color) {
  if(localPixels.find((pixel) => pixel.x === x && pixel.y === y && pixel.color === color)) return;
  const newPixel = { x, y, color };
  localPixels.push(newPixel);
  drawPixel(newPixel);
}

function fillLine(prev, coords, color) {
  const dx = coords.x - prev.x;
  const dy = coords.y - prev.y;
  if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 0) {
    const start = Math.min(prev.x, coords.x);
    const end = Math.max(coords.x, prev.x);
    const slope = dy / dx;
    for(let t = start; t <= end; t += 1) {
      const y = Math.round(slope * (t - prev.x) + prev.y);
      fillPixel(t, y, color);
    }
  } else if (Math.abs(dy) > 0){
    const start = Math.min(prev.y, coords.y);
    const end = Math.max(coords.y, prev.y);
    const slope = dx / dy;
    for(let t = start; t <= end; t += 1) {
      const x = Math.round(slope * (t - prev.y) + prev.x);
      fillPixel(x, t, color);
    }
  }
}

function getCoords(mouseEvent) {
  lastMouseEvent = mouseEvent;
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((mouseEvent.clientX - rect.left + xOff)/zoom),
    y: Math.floor((mouseEvent.clientY - rect.top + yOff)/zoom),
  };
}

function setMouseCoords(mouseEvent) {
  const newCoords = getCoords(mouseEvent);
  if(mouseCoords && mouseCoords.x === newCoords.x && mouseCoords.y === newCoords.y) return;
  mouseCoords ? prevCoords = mouseCoords : prevCoords = newCoords;
  mouseCoords = newCoords;
  if(mouseDown) fillLine(prevCoords, mouseCoords, colorPicker.value);
  drawHighlight();
}

function unsetMouseCoords(mouseEvent) {
  setMouseCoords(mouseEvent);
  mouseCoords = null;
  drawHighlight();
}

function down(mouseEvent) {
  if(mouseEvent.button !== 0) return;
  mouseDown = true;
  drawHighlight();
}

function up(mouseEvent) {
  if(mouseEvent.button !== 0) return;
  mouseDown = false;
  drawHighlight();
}

function downCanvas(mouseEvent) {
  if(mouseEvent.button !== 0) return;
  const coords = getCoords(mouseEvent);
  fillPixel(coords.x, coords.y, colorPicker.value);
  drawHighlight();
}

function moveCanvas() {
  let shouldDraw = false;
  if(keyStates.w) {
    yOff -= speed;
    shouldDraw = true;
  }
  if(keyStates.a) {
    xOff -= speed;
    shouldDraw = true;
  }
  if(keyStates.s) {
    yOff += speed;
    shouldDraw = true;
  }
  if(keyStates.d) {
    xOff += speed;
    shouldDraw = true;
  }
  if(shouldDraw) {
    setMouseCoords(lastMouseEvent);
    drawHighlight();
    setImage();
  }
  window.requestAnimationFrame(moveCanvas);
}

function handleKey(keyEvent, down) {
  switch(keyEvent.keyCode) {
    case 87:
      keyStates.w = down;
      break;
    case 65:
      keyStates.a = down;
      break;
    case 83:
      keyStates.s = down;
      break;
    case 68:
      keyStates.d = down;
      break;
    default:
      break;
  }
}

hcanvas.addEventListener('mouseenter', (evt) => {
  hcanvas.focus();
  setMouseCoords(evt);
});

function zoomCanvas(wheelEvent) {
  if(wheelEvent.deltaY < 0 && zoom < MAX_ZOOM) zoom += 1;
  if(wheelEvent.deltaY > 0 && zoom > MIN_ZOOM) zoom -= 1;
  setMouseCoords(lastMouseEvent);
  drawHighlight();
  setImage();
}

function download() {
    var dt = ocanvas.toDataURL('image/png');
    this.href = dt;
};

document.getElementById('save').addEventListener('click', download, false);

hcanvas.addEventListener('mousemove', setMouseCoords);
hcanvas.addEventListener('mouseleave', unsetMouseCoords);
hcanvas.addEventListener('mousedown', downCanvas);
hcanvas.addEventListener('keydown', (evt) => handleKey(evt, true));
hcanvas.addEventListener('keyup', (evt) => handleKey(evt, false));
hcanvas.addEventListener('wheel', zoomCanvas);

window.addEventListener('mousedown', down);
window.addEventListener('mouseup', up);

loadPixels();
setInterval(fetchPixels, 3000);
window.requestAnimationFrame(moveCanvas);
