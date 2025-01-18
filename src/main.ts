import { Duration, PaintingContext } from './lib/render';
import { renderRectAndCircle } from './scene';
import './style.css'

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

function render(frame: number) {
  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  const painter = renderRectAndCircle.at(new Duration(frame));
  painter(context);
}

render(0);

rangeInput.addEventListener("input", () => {
  render(Number.parseFloat(rangeInput.value));
});
