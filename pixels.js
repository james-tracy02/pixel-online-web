
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hcanvas = document.getElementById('hcanvas');
const hctx = hcanvas.getContext('2d');
const url = "https://pixel-online.herokuapp.com";
canvas.width = window.innerWidth * .8;
canvas.height = window.innerHeight * .8;
hcanvas.width = window.innerWidth * .8;
hcanvas.height = window.innerHeight * .8;
hcanvas.tabIndex = 1000;
hcanvas.style.outline = "none";
hcanvas.focus();
const colorPicker = document.getElementById('color-picker');

const MAX_ZOOM = 40;
const MAX_LOCAL = 100;

let xOff = 0;
let yOff = 0;
let zoom = 20;

let mouseCoords = null;
let prevCoords = null;
let mouseDown = false;
let pixels = [];
let localPixels = [];
let resolved = 0;

function drawPixel(pixel) {
  if(!pixel) return;
  const xPos = (pixel.x - xOff)*zoom;
  const yPos = (pixel.y - yOff)*zoom;
  if(xPos < 0 - zoom || xPos > canvas.width || yPos < 0 - zoom || yPos > canvas.height) return;
  ctx.fillStyle = pixel.color;
  ctx.fillRect(xPos, yPos, zoom, zoom);
}

function drawHighlight() {
  hctx.clearRect(0, 0, hcanvas.width, hcanvas.height);
  if(!mouseCoords) return
  hctx.strokeStyle = '#000000';
  if(mouseDown) hctx.strokeStyle = '#FF0000';
  hctx.lineWidth = 2;
  hctx.beginPath();
  hctx.rect((mouseCoords.x - xOff) * zoom, (mouseCoords.y - yOff) * zoom, zoom, zoom);
  hctx.stroke();
}

function draw() {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  pixels.forEach((pixel) => drawPixel(pixel));
  localPixels.forEach((pixel) => drawPixel(pixel));
  drawHighlight();
}

function savePixels() {
  localPixels.splice(0, resolved);
  resolved = 0;
  const index = localPixels.length;

  if(localPixels.length > 0) {
    const data = { pixels: localPixels };
    const ops = {
      headers: {
        "content-type":"application/json",
      },
      body: JSON.stringify(data),
      method: "POST",
    };
    fetch(`${url}/pixels`, ops)
    .then((res) => {
      if(res.status === 200) {
        resolved = index;
      } else {
        console.log('error');
      }
    });
  }
}

async function fetchPixels() {
  const res = await fetch(`${url}/pixels`);
  pixels = await res.json();
  draw();
}

function fillPixel(x, y, color) {
  if(localPixels.length + 1 > MAX_LOCAL) return;
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
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.floor((event.clientX - rect.left)/zoom + xOff),
    y: Math.floor((event.clientY - rect.top)/zoom + yOff),
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
  const coords = getCoords(mouseEvent);
  fillPixel(coords.x, coords.y, colorPicker.value);
  drawHighlight();
}

function zoomCanvas(wheelEvent) {
  if(wheelEvent.deltaY < 0 && zoom < MAX_ZOOM) {
    zoom += 1;
  } else if(wheelEvent.deltaY > 0 && zoom > 1) {
    zoom -= 1;
  }
  draw();
}

function moveCanvas(keyEvent) {
  if(keyEvent.keyCode === 68) {
    xOff += 1;
  }
  if(keyEvent.keyCode === 87) {
    yOff -= 1;
  }
  if(keyEvent.keyCode === 65) {
    xOff -= 1;
  }
  if(keyEvent.keyCode === 83) {
    yOff += 1;
  }
  draw();
}

hcanvas.addEventListener('mouseenter', setMouseCoords);
hcanvas.addEventListener('mousemove', setMouseCoords);
hcanvas.addEventListener('mouseleave', unsetMouseCoords);
hcanvas.addEventListener('mousedown', downCanvas);
hcanvas.addEventListener('wheel', zoomCanvas);
hcanvas.addEventListener('keydown', moveCanvas);
window.addEventListener('mousedown', down);
window.addEventListener('mouseup', up);

fetchPixels();

setInterval(() => {
  savePixels();
  fetchPixels();
}, 500);
