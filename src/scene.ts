import { easings } from "./lib/easings";
import { Animatable, constant, createSequenceWindows, createPainter, Duration, numberTween, parallel, timedSequential, transformTimeWith, fromTweenProperties, Painter } from "./lib/render";

type Point = { x: number, y: number; };

function createCirclePainterWithAnim(settings: { position: Animatable<Point>, radius: Animatable<number>; fillStyle: Animatable<string>; }): Painter {
	return createPainter((context, time) => {
		const x = settings.position(time).x;
		const y = settings.position(time).y;
		context.canvasContext.beginPath();
		context.canvasContext.fillStyle = settings.fillStyle(time);
		context.canvasContext.arc(x, y, settings.radius(time), 0, 2 * Math.PI);
		context.canvasContext.closePath();
		context.canvasContext.fill();
	});
}

function createColoredRectPainter(settings: { color: Animatable<string>; }): Painter {
	return createPainter((context, time) => {
		context.canvasContext.fillStyle = settings.color(time);
		context.canvasContext.fillRect(0, 0, context.canvasWidth, 20);
	});
}

function createColorHueAnimation(duration: Duration): Animatable<string> {
	const hueAnim = numberTween(0, 360, duration);
	return (time) => `hsl(${hueAnim(time)}, 100%, 50%)`;
}

const renderRect = createColoredRectPainter({
	color: createColorHueAnimation(new Duration(120)),
});

const circlesSequence = createSequenceWindows([new Duration(20), new Duration(60), new Duration(60)]);

const renderCircles = parallel([
	transformTimeWith(
		createCirclePainterWithAnim({
			position: fromTweenProperties({
				x: numberTween(20, 280, new Duration(60), easings.easeInOut),
				y: constant(20),
			}),
			radius: constant(20),
			fillStyle: constant("blue")
		}),
		circlesSequence[1],
	),
	transformTimeWith(
		createCirclePainterWithAnim({
			position: fromTweenProperties({
				x: numberTween(20, 280, new Duration(60), easings.easeInOut),
				y: constant(90),
			}),
			radius: constant(20),
			fillStyle: constant("red")
		}),
		circlesSequence[2],
	),
]);

export const renderRectAndCircle = timedSequential([
	[renderRect, new Duration(120)],
	[renderCircles, new Duration(200)],
]);

