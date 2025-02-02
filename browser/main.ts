import { Duration } from "../src/lib/core.ts";
import { createTextSceneRenderer } from "../src/text-scene.ts";
import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
	<div>
		<canvas id="c" width="300" height="300"></canvas>
		<input type="range" id="r" min="0" max="450">
	</div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#c")!;
const rangeInput = document.querySelector<HTMLInputElement>("#r")!;

const canvasContext = canvas.getContext("2d")!;

let renderTextScene = createTextSceneRenderer(canvasContext);

function render(frame: number) {
	canvasContext.clearRect(0, 0, canvas.width, canvas.height);
	const painter = renderTextScene.at(new Duration(frame));
	painter(canvasContext);
}

render(0);

rangeInput.max = renderTextScene.duration.frame.toString();

function renderCurrentTime() {
	render(Number.parseFloat(rangeInput.value));
}

rangeInput.addEventListener("input", () => renderCurrentTime());

rangeInput.value = "0";

if (import.meta.hot) {
	import.meta.hot.accept("../src/text-scene.ts", (newModule) => {
		if (newModule) {
			renderTextScene = newModule.createTextSceneRenderer(canvasContext);
			rangeInput.max = renderTextScene.duration.frame.toString();
			renderCurrentTime();
		}
	});
}
