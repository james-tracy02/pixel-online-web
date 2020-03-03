
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hcanvas = document.getElementById('hcanvas');
const hctx = hcanvas.getContext('2d');
const ocanvas = document.createElement('canvas');
const octx = ocanvas.getContext('2d');
ocanvas.width = 1920;
ocanvas.height = 1080;

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
const VERSION = '1.0.4_2';

const speed = 16;

let zoom = 10;
let xOff = Math.ceil(canvas.width/(2*zoom));
let yOff = Math.ceil(canvas.height/(2*zoom));

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
  const pos = getPos(0, 0);
  ctx.drawImage(ocanvas, pos.x, pos.y, ocanvas.width * zoom, ocanvas.height * zoom);
  ctx.globalCompositeOperation = "source-over"
}

function drawPixels(pixels) {
  let i;
  for(i = 0; i < pixels.length; i += 1) {
    const pixel = pixels[i];
    if(oob(pixel.x, pixel.y)) continue;
    octx.fillStyle = pixel.color;
    octx.fillRect(pixel.x, pixel.y, 1, 1);
  }
}

function oob(x, y) {
  return !x || !y || x < 0 || x > ocanvas.width || y < 0 || y > ocanvas.height;
}

function getPos(x, y) {
  return {
    x: Math.floor((x - xOff) * zoom + canvas.width/2),
    y: Math.floor((y - yOff) * zoom + canvas.height/2),
  };
}

function drawPixel(pixel) {
  if(oob(pixel.x, pixel.y)) return;
  const pos = getPos(pixel.x, pixel.y);
  ctx.fillStyle = pixel.color;
  ctx.fillRect(pos.x, pos.y, zoom, zoom);
  octx.fillStyle = pixel.color;
  octx.fillRect(pixel.x, pixel.y, 1, 1);
}

function drawHighlight() {
  hctx.clearRect(0, 0, hcanvas.width, hcanvas.height);
  if(!mouseCoords || oob(mouseCoords.x, mouseCoords.y)) return
  hctx.strokeStyle = '#000000';
  if(mouseDown) hctx.strokeStyle = '#FF0000';
  hctx.lineWidth = 2;
  const pos = getPos(mouseCoords.x, mouseCoords.y);
  hctx.beginPath();
  hctx.rect(pos.x, pos.y, zoom, zoom);
  hctx.stroke();
}

function draw() {
  octx.fillStyle = '#FFFFFF';
  octx.fillRect(1, 1, ocanvas.width, ocanvas.height);
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
  const res = {
    x: Math.floor((mouseEvent.clientX - rect.left - canvas.width/2)/zoom + xOff),
    y: Math.floor((mouseEvent.clientY - rect.top - canvas.height/2)/zoom + yOff),
  };
  return res;
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
  const coords = getCoords(mouseEvent);
  if(mouseEvent.button === 0) {
    fillPixel(coords.x, coords.y, colorPicker.value);
    drawHighlight();
  } else if (mouseEvent.button === 2) {
    takePixel(coords.x, coords.y);
  }
}

function getSpeed() {
  return speed/zoom;
}

function moveCanvas() {
  let shouldDraw = false;
  if(keyStates.w) {
    yOff -= getSpeed();
    shouldDraw = true;
  }
  if(keyStates.a) {
    xOff -= getSpeed();
    shouldDraw = true;
  }
  if(keyStates.s) {
    yOff += getSpeed();
    shouldDraw = true;
  }
  if(keyStates.d) {
    xOff += getSpeed();
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

function takePixel(x, y) {
  const color = octx.getImageData(x, y, 1, 1).data;
  colorPicker.value = rgbToHex(color);
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(rgb) {
  return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
}


hcanvas.addEventListener('mouseenter', (evt) => {
  hcanvas.focus();
  setMouseCoords(evt);
});

function zoomCanvas(wheelEvent) {
  if(wheelEvent.deltaY < 0 && zoom < MAX_ZOOM) {
    zoom += 1;
  }
  if(wheelEvent.deltaY > 0 && zoom > MIN_ZOOM) {
    zoom -= 1;
  }
  setMouseCoords(lastMouseEvent);
  drawHighlight();
  setImage();
}

function download() {
    var dt = ocanvas.toDataURL('image/png');
    this.href = dt;
};

document.getElementById('save').addEventListener('click', download, false);
document.getElementById('version').innerHTML =  `(Version ${VERSION})`;

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
