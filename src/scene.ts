import {
	Animation,
	animationSequence,
	animationStaggered,
	ConstantAnimation,
	Duration,
	fromAnimationArray,
	fromAnimationProperties,
	paintAll,
	Painter,
} from "./lib/core";
import { easings } from "./lib/easings";
import {
	createCirclePainter,
	createRectPainter,
	tweenNumber,
	tweenPoint,
} from "./lib/std";

const noop: Painter = () => {};

function createColorHueAnimation(duration: Duration): Animation<string> {
	const hueAnim = tweenNumber({ from: 0, to: 360, duration });
	return hueAnim.derive((hue) => `hsl(${hue}, 100%, 50%)`);
}

function createTextAnimation(
	settingsAnim: Animation<{ text: string; x: number; y: number }>,
): Animation<Painter> {
	return settingsAnim.derive((settings) => (context) => {
		context.canvasContext.font = "20px sans-serif";
		context.canvasContext.fillStyle = "black";
		context.canvasContext.fillText(settings.text, settings.x, settings.y);
	});
}

const renderRect = createRectPainter(
	createColorHueAnimation(new Duration(120)).derive((fillStyle) => ({
		position: { x: 0, y: 0 },
		size: { x: 300, y: 20 },
		fillStyle,
	})),
);

const renderCircles = paintAll(animationStaggered([
	createCirclePainter(fromAnimationProperties({
		center: tweenPoint({
			from: { x: 20, y: 20 },
			to: { x: 280, y: 20 },
			duration: new Duration(60),
			easing: easings.easeInOut,
		}),
		radius: new ConstantAnimation(20),
		fillStyle: new ConstantAnimation("blue"),
	})),
	createCirclePainter(fromAnimationProperties({
		center: fromAnimationProperties({
			x: tweenNumber({
				from: 20,
				to: 280,
				duration: new Duration(60),
				easing: easings.easeInOut,
			}),
			y: new ConstantAnimation(90),
		}),
		radius: animationSequence([
			tweenNumber({
				from: 20,
				to: 40,
				duration: new Duration(30),
				easing: easings.easeOut,
			}),
			tweenNumber({
				from: 40,
				to: 20,
				duration: new Duration(30),
				easing: easings.easeInBounce,
			}),
		]),
		fillStyle: new ConstantAnimation("red"),
	})),
	createCirclePainter(
		tweenPoint({
			from: { x: 20, y: 160 },
			to: { x: 280, y: 160 },
			duration: new Duration(60),
			easing: easings.easeInOut,
		})
			.derive((center) => ({
				center,
				radius: 20,
				fillStyle: "green",
			})),
	),
]))
	.extend({ before: new Duration(60), after: new Duration(60) });

const renderRectAndCircle = animationSequence([
	renderRect,
	renderCircles,
	new ConstantAnimation(noop, new Duration(30)),
]);

const renderFrameNumber = createTextAnimation(fromAnimationProperties({
	text: tweenNumber({
		from: 0,
		to: renderRectAndCircle.duration.frame,
		duration: renderRectAndCircle.duration,
	}).derive((value) => `Frame: ${Math.floor(value)}`),
	x: new ConstantAnimation(180),
	y: new ConstantAnimation(280),
}));

export const renderScene = paintAll(
	fromAnimationArray([renderRectAndCircle, renderFrameNumber]),
);
