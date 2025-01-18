import { easings } from "./lib/easings";
import { Animatable, constant, createAnimatableSequence, createPainter, Frame, numberTween, parallel, timedSequential, transformWith } from "./lib/render";

function createCirclePainterWithAnim(settings: { yAnim: Animatable<number>, xAnim: Animatable<number>, radius: number; fillStyle: string; }) {
	return createPainter((context, frame) => {
		const x = settings.xAnim(frame);
		const y = settings.yAnim(frame);
		context.canvasContext.beginPath();
		context.canvasContext.fillStyle = settings.fillStyle;
		context.canvasContext.arc(x, y, settings.radius, 0, 2 * Math.PI);
		context.canvasContext.closePath();
		context.canvasContext.fill();
	});
}

const hueAnim = numberTween(0, 360, new Frame(120));

const renderRect = createPainter((context, frame) => {
	const hue = hueAnim(frame);
	context.canvasContext.fillStyle = `hsl(${hue}deg, 100%, 50%)`;
	context.canvasContext.fillRect(0, 0, context.canvasWidth, 20);
});

const circlesSequence = createAnimatableSequence([new Frame(20), new Frame(60), new Frame(60)]);

const renderCircles = parallel([
	transformWith(
		createCirclePainterWithAnim({
			xAnim: numberTween(20, 280, new Frame(60), easings.easeInOut),
			yAnim: constant(20),
			radius: 20,
			fillStyle: "blue"
		}),
		circlesSequence[1],
	),
	transformWith(
		createCirclePainterWithAnim({
			xAnim: numberTween(20, 280, new Frame(60), easings.easeInOut),
			yAnim: constant(90),
			radius: 20,
			fillStyle: "blue"
		}),
		circlesSequence[2],
	),
]);

export const renderRectAndCircle = timedSequential([
	[renderRect, new Frame(120)],
	[renderCircles, new Frame(200)],
]);

