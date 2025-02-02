import { Canvas } from "jsr:@gfx/canvas";
import { Duration } from "../src/lib/core.ts";
import { createTextSceneRenderer } from "../src/text-scene.ts";

const canvas = new Canvas(300, 300);
const canvasContext = canvas.getContext("2d")!;

const renderTextScene = createTextSceneRenderer(canvasContext);

function render(frame: number) {
	canvasContext.clearRect(0, 0, canvas.width, canvas.height);
	const painter = renderTextScene.at(new Duration(frame));
	painter(canvasContext);
}

render(80);

canvas.save("text-scene-80.g.png");
