import { easings } from "./lib/easings";
import { Animatable, compose, constant, createPainter, createWeightedChain as createWeightedAnimatableSequence, ease, numberTween, parallel, weightedSequential } from "./lib/render";

function createCirclePainterWithAnim(settings: { yAnim: Animatable, xAnim: Animatable, radius: number; fillStyle: string; }) {
	return createPainter((context, animation) => {
		const x = settings.xAnim(animation);
		const y = settings.yAnim(animation);
		context.canvasContext.beginPath();
		context.canvasContext.fillStyle = settings.fillStyle;
		context.canvasContext.arc(x, y, settings.radius, 0, 2 * Math.PI);
		context.canvasContext.closePath();
		context.canvasContext.fill();
	});
}

const renderRect = createPainter((context, animation) => {
	context.canvasContext.fillStyle = `hsl(${animation * 360}deg, 100%, 50%)`;
	context.canvasContext.fillRect(0, 0, context.canvasWidth, 20);
});

const circlesSequence = createWeightedAnimatableSequence([0.1, 0.25, 0.55]);

const renderCircles = parallel([
	ease(
		createCirclePainterWithAnim({
			xAnim: numberTween(20, 280),
			yAnim: constant(20),
			radius: 20,
			fillStyle: "blue"
		}),
		compose(circlesSequence[1], easings.easeInOut),
	),
	ease(
		createCirclePainterWithAnim({
			xAnim: numberTween(20, 280),
			yAnim: constant(90),
			radius: 20,
			fillStyle: "blue"
		}),
		compose(circlesSequence[2], easings.easeInOut),
	),
]);

export const renderRectAndCircle = weightedSequential([
	[renderRect, 0.2],
	[renderCircles, 0.8],
]);

