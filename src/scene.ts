import { easings } from "./lib/easings";
import { Animatable, CallbackAnimatable, constant, createSequenceWindows, delay, Duration, extend, fromTweenProperties, numberTween, Painter, parallel, timedSequentialTweens } from "./lib/render";

type Point = { x: number, y: number; };

const noop: Painter = () => {};

function createCirclePainterWithAnim(settings: Animatable<{ position: Point, radius: number; fillStyle: string; }>): Animatable<Painter> {
	return new CallbackAnimatable(settings.duration, (time) => ((context) => {
		const x = settings.at(time).position.x;
		const y = settings.at(time).position.y;
		context.canvasContext.beginPath();
		context.canvasContext.fillStyle = settings.at(time).fillStyle;
		context.canvasContext.arc(x, y, settings.at(time).radius, 0, 2 * Math.PI);
		context.canvasContext.closePath();
		context.canvasContext.fill();
	}));
}

function createColoredRectPainter(settings: Animatable<{ color: string; }>): Animatable<Painter> {
	return new CallbackAnimatable(settings.duration, (time) => ((context) => {
		context.canvasContext.fillStyle = settings.at(time).color;
		context.canvasContext.fillRect(0, 0, context.canvasWidth, 20);
	}));
}

function createColorHueAnimation(duration: Duration): Animatable<string> {
	const hueAnim = numberTween(0, 360, duration);
	return new CallbackAnimatable(duration, (time) => `hsl(${hueAnim.at(time)}, 100%, 50%)`);
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
