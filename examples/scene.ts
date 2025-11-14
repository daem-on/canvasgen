import {
	Animation,
	ArrayAnimation,
	ConstantAnimation,
	Duration,
	paintAll,
	Painter,
	SequenceAnimation,
	StaggeredAnimation
} from "../lib/core.ts";
import { easings } from "../lib/easings.ts";
import {
	CircleSettings,
	createCirclePainter,
	createRectPainter,
	createTextPainter,
	tweenNumber,
	tweenPoint
} from "../lib/std.ts";

const noop: Painter = () => {};

function createColorHueAnimation(duration: Duration): Animation<string> {
	const hueAnim = tweenNumber({ from: 0, to: 360, duration });
	return hueAnim.derive((hue) => `hsl(${hue}, 100%, 50%)`);
}

const renderRect = createColorHueAnimation(new Duration(120))
	.derive((fillStyle) =>
		createRectPainter({
			position: { x: 0, y: 0 },
			size: { x: 300, y: 20 },
			fillStyle,
		})
	);

const renderCircles = paintAll(
	new StaggeredAnimation([
		tweenPoint({
			from: { x: 20, y: 20 },
			to: { x: 280, y: 20 },
			duration: new Duration(60),
			easing: easings.easeInOut,
		}).derive((center) => ({
			center,
			radius: 20,
			fillStyle: "blue",
		})).derive(createCirclePainter),
		new ArrayAnimation([
			tweenNumber({
				from: 20,
				to: 280,
				duration: new Duration(80),
				easing: easings.easeInOut,
			}),
			new SequenceAnimation([
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
					easing: easings.easeOutBounce,
				}),
			]),
		]).derive<CircleSettings>(([xPosition, radius]) => ({
			center: { x: xPosition, y: 90 },
			radius,
			fillStyle: "red",
		})).derive(createCirclePainter),
		tweenPoint({
			from: { x: 20, y: 160 },
			to: { x: 280, y: 160 },
			duration: new Duration(60),
			easing: easings.easeInOut,
		}).derive((center) =>
			createCirclePainter({
				center,
				radius: 20,
				fillStyle: "green",
			})
		),
	]),
)
	.extend({ before: new Duration(60), after: new Duration(60) });

const renderRectAndCircle = new SequenceAnimation([
	renderRect,
	renderCircles,
	new ConstantAnimation(noop, new Duration(30)),
]);

const renderFrameNumber = tweenNumber({
	from: 0,
	to: renderRectAndCircle.duration.frame,
	duration: renderRectAndCircle.duration,
}).derive(
	(value) =>
		createTextPainter({
			position: { x: 180, y: 280 },
			text: `Frame: ${Math.floor(value)}`,
			fillStyle: "black",
			font: "20px sans-serif",
		}),
);

export const renderScene = paintAll(
	new ArrayAnimation([renderRectAndCircle, renderFrameNumber]),
);
