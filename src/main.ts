import { Duration, PaintingContext } from './lib/core';
import { createTextSceneRenderer } from './text-scene';
import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <canvas id="c" width="300" height="300"></canvas>
    <input type="range" id="r" min="0" max="450">
  </div>
`

const canvas = document.querySelector<HTMLCanvasElement>("#c")!;
const rangeInput = document.querySelector<HTMLInputElement>("#r")!;

const canvasContext = canvas.getContext("2d")!;
const context: PaintingContext = {
  canvasContext,
  canvasHeight: canvas.height,
  canvasWidth: canvas.width,
}

const renderTextScene = createTextSceneRenderer(canvasContext);

function render(frame: number) {
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  const painter = renderTextScene.at(new Duration(frame));
  painter(context);
}

render(0);

rangeInput.max = renderTextScene.duration.frame.toString();

rangeInput.addEventListener("input", () => {
  render(Number.parseFloat(rangeInput.value));
});

rangeInput.value = "0";
