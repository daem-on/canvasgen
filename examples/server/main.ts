import { Canvas } from "npm:@napi-rs/canvas";
import { Duration } from "../../lib/core.ts";
import { createTextSceneRenderer } from "../text-scene.ts";

const canvas = new Canvas(300, 300);
const canvasContext = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

const renderTextScene = createTextSceneRenderer(canvasContext);

function render(frame: number) {
	canvasContext.clearRect(0, 0, canvas.width, canvas.height);
	const painter = renderTextScene.at(new Duration(frame));
	painter(canvasContext);
}

const command = new Deno.Command("ffmpeg", {
	args: ["-f", "rawvideo", "-s", "300x300", "-r", "60", "-pix_fmt", "rgba", "-i", "-", "-y", "text-scene.g.mp4"],
	stdin: 'piped',
});

const child = command.spawn();

const writer = child.stdin.getWriter();

for (let i = 0; i < renderTextScene.duration.frame + 1; i++) {
	render(i);
	await writer.write(canvas.data());
}

await writer.close();
await child.output();
