
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hcanvas = document.getElementById('hcanvas');
const hctx = hcanvas.getContext('2d');
const ocanvas = document.createElement('canvas');
const octx = ocanvas.getContext('2d');
ocanvas.width = 1920;
ocanvas.height = 1080;

const url = 'https://pixel-online.herokuapp.com';
const bgdiv = document.getElementById('canvas-bg');
canvas.width = window.innerWidth * .8;
canvas.height = window.innerHeight * .8;
hcanvas.width = window.innerWidth * .8;
hcanvas.height = window.innerHeight * .8;
hcanvas.tabIndex = 1000;
hcanvas.style.outline = "none";
hcanvas.focus();
const colorPicker = document.getElementById('color-picker');
const penSize = document.getElementById('pen-size');
const canvasbg = document.getElementById('canvas-bg');
canvasbg.style.width = `${window.innerWidth * .8}px`;
canvasbg.style.height = `${window.innerHeight * .8}px`;

const MAX_ZOOM = 40;
const MIN_ZOOM = 1;
const VERSION = '1.2.7';
const UPDATE_MS = 50;
const MAX_PEN = 5;
const FETCH_TIMEOUT = 5000;

const speed = 16;

let zoom = 10;
let xOff = Math.ceil(canvas.width/(2*zoom));
let yOff = Math.ceil(canvas.height/(2*zoom));
let pixelIndex = 0;

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
let loaded = false;


function setImage() {
  const xScale = ocanvas.width * zoom;
  const yScale = ocanvas.height * zoom;
  ctx.globalCompositeOperation = 'copy';
  ctx.imageSmoothingEnabled = false;
  const pos = getPos(0, 0);
  ctx.drawImage(ocanvas, pos.x, pos.y, ocanvas.width * zoom, ocanvas.height * zoom);
  ctx.globalCompositeOperation = 'source-over'
}

function drawbg() {
  octx.fillStyle = '#ffffff';
  octx.fillRect(1, 1, ocanvas.width, ocanvas.height);
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
  return !x || !y || x < 0 || x >= ocanvas.width || y < 0 || y >= ocanvas.height;
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
  const pen = penSize.value;
  if(isNaN(pen) || pen < 1 || pen > MAX_PEN) return;

  hctx.clearRect(0, 0, hcanvas.width, hcanvas.height);
  if(!mouseCoords || oob(mouseCoords.x, mouseCoords.y)) return
  hctx.strokeStyle = '#000000';
  if(mouseDown) hctx.strokeStyle = '#FF0000';
  hctx.lineWidth = 2;
  const pos = getPos(mouseCoords.x - Math.ceil(pen/2) + 1, mouseCoords.y - Math.ceil(pen/2) + 1);
  hctx.beginPath();
  hctx.rect(pos.x, pos.y, zoom * pen, zoom * pen);
  hctx.stroke();
}

function warnTimeout() {
  loaded = false;
  ctx.fillStyle = '#dcdce6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '30px Arial';
  ctx.fillStyle = '#FF6666';
  ctx.fillText('Server not responding!', canvas.width * 3 / 8, canvas.height / 2);
}

function fetchPixels(shouldTimeout) {
  let timeout;
  if(shouldTimeout) {
    timeout = setTimeout(warnTimeout, FETCH_TIMEOUT);
  }

  const i = localPixels.length;
  const data = {
    pixels: localPixels,
    index: pixelIndex,
  };
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
    if(shouldTimeout) clearTimeout(timeout);
    pixelIndex = newPixels.index;
    drawPixels(newPixels.pixels);
    drawPixels(localPixels);
    setImage();
    localPixels.splice(0, i);
    setTimeout(() => fetchPixels(true), UPDATE_MS);
  });
}

function penPixel(x, y, color) {
  const pen = parseInt(penSize.value);
  if(isNaN(pen) || pen < 1 || pen > MAX_PEN) return;
  const offset = Math.ceil(pen/2) - 1;
  let i;
  for(i = x - offset; i < x - offset + pen; i += 1) {
    let j;
    for(j = y - offset; j < y - offset + pen; j += 1) {
      fillPixel(i, j, color);
    }
  }
}

function fillPixel(x, y, color) {
  if(!loaded || localPixels.find((pixel) => pixel.x === x && pixel.y === y && pixel.color === color)) return;
  if(oob(x, y)) return;
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
      penPixel(t, y, color);
    }
  } else if (Math.abs(dy) > 0){
    const start = Math.min(prev.y, coords.y);
    const end = Math.max(coords.y, prev.y);
    const slope = dx / dy;
    for(let t = start; t <= end; t += 1) {
      const x = Math.round(slope * (t - prev.y) + prev.x);
      penPixel(x, t, color);
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
    penPixel(coords.x, coords.y, colorPicker.value);
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
  if(!loaded) return;
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
    case 81:
      if(!down && penSize.value > 1) {
        penSize.value = parseInt(penSize.value) - 1;
        drawHighlight();
      }
      break;
    case 69:
      if(!down && penSize.value < MAX_PEN) {
        penSize.value = parseInt(penSize.value) + 1;
        drawHighlight();
      }
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
  if(!loaded) return;
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

function resize() {
  canvas.width = window.innerWidth * .8;
  canvas.height = window.innerHeight * .8;
  hcanvas.width = window.innerWidth * .8;
  hcanvas.height = window.innerHeight * .8;
  canvasbg.style.width = `${window.innerWidth * .8}px`;
  canvasbg.style.height = `${window.innerHeight * .8}px`;
  setImage();
}

document.getElementById('save').addEventListener('click', download, false);
document.getElementById('version').innerHTML =  `(Version ${VERSION})`;
document.getElementById('max-pen').innerHTML = MAX_PEN;
hcanvas.addEventListener('mousemove', setMouseCoords);
hcanvas.addEventListener('mouseleave', unsetMouseCoords);
hcanvas.addEventListener('mousedown', downCanvas);
hcanvas.addEventListener('keydown', (evt) => handleKey(evt, true));
hcanvas.addEventListener('keyup', (evt) => handleKey(evt, false));
hcanvas.addEventListener('wheel', zoomCanvas);
window.addEventListener('drag', () => mouseDown = false);
window.addEventListener('mousedown', down);
window.addEventListener('mouseup', up);
window.addEventListener('resize', resize);

ctx.font = '30px Arial';
ctx.fillStyle = '#666666';
ctx.fillText('Loading please wait...', canvas.width * 3 / 8, canvas.height / 2);

drawbg();
fetchPixels(false)
.then(() => {
  setImage();
  loaded = true;
});
window.requestAnimationFrame(moveCanvas);
