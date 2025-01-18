import { easings } from "./lib/easings";
import { Animatable, constant, createSequenceWindows, delay, Duration, extend, fromTweenProperties, numberTween, Painter, parallel, timedSequentialTweens } from "./lib/render";

type Point = { x: number, y: number; };

const noop: Painter = () => {};

function createCirclePainterWithAnim(settingsAnim: Animatable<{ position: Point, radius: number; fillStyle: string; }>): Animatable<Painter> {
	return settingsAnim.derive(settings => context => {
		const x = settings.position.x;
		const y = settings.position.y;
		context.canvasContext.beginPath();
		context.canvasContext.fillStyle = settings.fillStyle;
		context.canvasContext.arc(x, y, settings.radius, 0, 2 * Math.PI);
		context.canvasContext.closePath();
		context.canvasContext.fill();
	});
}

function createColoredRectPainter(settingsAnim: Animatable<{ color: string; }>): Animatable<Painter> {
	return settingsAnim.derive(settings => context => {
		context.canvasContext.fillStyle = settings.color;
		context.canvasContext.fillRect(0, 0, context.canvasWidth, 20);
	});
}

function createColorHueAnimation(duration: Duration): Animatable<string> {
	const hueAnim = numberTween(0, 360, duration);
	return hueAnim.derive(hue => `hsl(${hue}, 100%, 50%)`);
}

const renderRect = createColoredRectPainter(fromTweenProperties({
	color: createColorHueAnimation(new Duration(120)),
}));

const renderCircles = extend(delay(parallel(createSequenceWindows([
	createCirclePainterWithAnim(fromTweenProperties({
		position: fromTweenProperties({
			x: numberTween(20, 280, new Duration(60), easings.easeInOut),
			y: constant(20),
		}),
		radius: constant(20),
		fillStyle: constant("blue")
	})),
	createCirclePainterWithAnim(fromTweenProperties({
		position: fromTweenProperties({
			x: numberTween(20, 280, new Duration(60), easings.easeInOut),
			y: constant(90),
		}),
		radius: timedSequentialTweens([
			numberTween(20, 40, new Duration(30), easings.easeOut),
			numberTween(40, 20, new Duration(30), easings.easeInBounce),
		]),
		fillStyle: constant("red")
	})),
])), new Duration(60)), new Duration(60));

export const renderRectAndCircle = timedSequentialTweens([
	renderRect,
	renderCircles,
	constant(noop),
]);
