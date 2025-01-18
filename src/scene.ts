import { easings } from "./lib/easings";
import {
	Animation,
	animationSequence,
	animationStaggered,
	ConstantAnimation,
	defineTween,
	Duration,
	fromAnimationProperties,
	Lerp,
	lerpNumber,
	paintAll,
	Painter,
	tweenNumber,
} from "./lib/render";

type Point = { x: number; y: number };

const noop: Painter = () => {};

function createCirclePainterWithAnim(
	settingsAnim: Animation<
		{ position: Point; radius: number; fillStyle: string }
	>,
): Animation<Painter> {
	return settingsAnim.derive((settings) => (context) => {
		const x = settings.position.x;
		const y = settings.position.y;
		context.canvasContext.beginPath();
		context.canvasContext.fillStyle = settings.fillStyle;
		context.canvasContext.arc(x, y, settings.radius, 0, 2 * Math.PI);
		context.canvasContext.closePath();
		context.canvasContext.fill();
	});
}

function createColoredRectPainter(
	settingsAnim: Animation<{ color: string }>,
): Animation<Painter> {
	return settingsAnim.derive((settings) => (context) => {
		context.canvasContext.fillStyle = settings.color;
		context.canvasContext.fillRect(0, 0, context.canvasWidth, 20);
	});
}

function createColorHueAnimation(duration: Duration): Animation<string> {
	const hueAnim = tweenNumber({ from: 0, to: 360, duration });
	return hueAnim.derive((hue) => `hsl(${hue}, 100%, 50%)`);
}

const lerpPoint: Lerp<Point> = (a, b, t) => ({
	x: lerpNumber(a.x, b.x, t),
	y: lerpNumber(a.y, b.y, t),
});

const tweenPoint = defineTween(lerpPoint);

const renderRect = createColoredRectPainter(fromAnimationProperties({
	color: createColorHueAnimation(new Duration(120)),
}));

const renderCircles = paintAll(animationStaggered([
	createCirclePainterWithAnim(fromAnimationProperties({
		position: tweenPoint({
			from: { x: 20, y: 20 },
			to: { x: 280, y: 20 },
			duration: new Duration(60),
			easing: easings.easeInOut,
		}),
		radius: new ConstantAnimation(20),
		fillStyle: new ConstantAnimation("blue"),
	})),
	createCirclePainterWithAnim(fromAnimationProperties({
		position: fromAnimationProperties({
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
	createCirclePainterWithAnim(
		tweenPoint({
			from: { x: 20, y: 160 },
			to: { x: 280, y: 160 },
			duration: new Duration(60),
			easing: easings.easeInOut,
		})
			.derive((position) => ({
				position,
				radius: 20,
				fillStyle: "green",
			})),
	),
]))
	.extendClamping(new Duration(60))
	.delayClamping(new Duration(60));

export const renderRectAndCircle = animationSequence([
	renderRect,
	renderCircles,
	new ConstantAnimation(noop),
]);
