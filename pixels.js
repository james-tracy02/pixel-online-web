const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const url = "https://pixel-online.herokuapp.com";
const WIDTH = 800;
const HEIGHT = 600;
let zoom = 20;
let xOff = 0;
let yOff = 0;
let color = "#4d80c9";
const colors = 

canvas.width = WIDTH;
canvas.height = HEIGHT;

canvas.addEventListener('mousedown', handleClick, false);
canvas.addEventListener('mousemove', handleMouse, false);
fetchPixels();
setInterval(fetchPixels, 3000);
const colorDiv = document.getElementById("colors");

colors.forEach((color) => {
  const newDiv = document.createElement("DIV");
  newDiv.className = "color-div";
  newDiv.style = "background-color: " + color + ";";
  newDiv.onclick = () => setColor(color);
  colorDiv.appendChild(newDiv)
});

let savedPixels = [];
let highlightPos = null;


function setColor(newColor) {
  console.log("hi")
  console.log(newColor);
  color = newColor;
}

function fetchPixels() {
  fetch(`${url}/pixels`)
  .then((res) => res.json())
  .then((pixels) => {
    savedPixels = pixels;
    drawPixels(pixels)
  });
}

function drawPixels(pixels) {
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  pixels.forEach((pixel) => drawPixel(pixel));
  drawHighlight();
}

function drawPixel(pixel) {
  ctx.fillStyle = pixel.color;
  ctx.fillRect((pixel.x - xOff)*zoom, (pixel.y - yOff)*zoom, zoom, zoom);
}

function handleClick(event) {
  const mousePos = getMousePos(event);
  const coords = getCoords(mousePos);
  const data = { color: getColor() };
  const ops = {
    headers: {
      "content-type":"application/json",
    },
    body: JSON.stringify(data),
    method: "POST",
  };

  fetch(`${url}/pixels/${coords.x}/${coords.y}`, ops)
  .then((res) => fetchPixels())
  .then(() => highlight(coords));
}

function handleMouse(event) {
  const mousePos = getMousePos(event);
  const coords = getCoords(mousePos);
  highlightPos = coords;
  drawPixels(savedPixels);
}

function drawHighlight() {
  ctx.strokeStyle = "#000000";
  ctx.beginPath();
  ctx.rect((highlightPos.x - xOff)*zoom, (highlightPos.y - yOff)*zoom, zoom, zoom);
  ctx.stroke();
}

function getColor() {
  return color;
}

function handleKey(event) {
  console.log(event.keyCode);
}

function zoomChange(event) {
  if(event.target.value) {
    zoom = event.target.value;
    fetchPixels();
  }
}

function xOffChange(event) {
  if(event.target.value) {
    xOff = event.target.value;
    fetchPixels();
  }
}

function yOffChange(event) {
  if(event.target.value) {
    yOff = event.target.value;
    fetchPixels();
  }
}

function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

function getCoords(mousePos) {
  return {
    x: Math.floor(mousePos.x/zoom) + parseInt(xOff),
    y: Math.floor(mousePos.y/zoom) + parseInt(yOff),
  };
}
