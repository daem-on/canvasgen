import {
	Animation,
	AnimationSettings,
	CallbackAnimation,
	ConstantAnimation,
	defineTween,
	Duration,
	Lerp,
	Painter,
	resetToZeroInclusiveTime,
	TweenCreator,
} from "./core.ts";

export const lerpNumber: Lerp<number> = (a, b, t) => a + (b - a) * t;

export const tweenNumber: TweenCreator<number> = defineTween(lerpNumber);

export type Point = { x: number; y: number };

export const lerpPoint: Lerp<Point> = (a, b, t) => ({
	x: lerpNumber(a.x, b.x, t),
	y: lerpNumber(a.y, b.y, t),
});

export const tweenPoint: TweenCreator<Point> = defineTween(lerpPoint);

export function animateTextSlice(
	text: string,
	settings: AnimationSettings,
): Animation<string> {
	const textAnimation = tweenNumber({
		from: 0,
		to: text.length,
		...settings,
	});
	return textAnimation.derive((length) => text.slice(0, Math.floor(length)));
}

export type CommonShapeSettings = {
	fillStyle?: string;
	strokeStyle?: string;
	strokeWidth?: number;
};

export type CircleSettings = CommonShapeSettings & {
	center: Point;
	radius: number;
};

export function createCirclePainter(
	settings: CircleSettings,
): Painter {
	return (context) => {
		const { center: { x, y }, radius } = settings;
		context.beginPath();
		context.arc(x, y, radius, 0, 2 * Math.PI, false);
		context.closePath();
		if (settings.fillStyle) {
			context.fillStyle = settings.fillStyle;
			context.fill();
		}
		if (settings.strokeStyle) {
			context.strokeStyle = settings.strokeStyle;
			context.stroke();
		}
	};
}

export type RectSettings = CommonShapeSettings & {
	position: Point;
	size: Point;
};

export const lerpRectSettings: Lerp<RectSettings> = (a, b, t) => ({
	position: lerpPoint(a.position, b.position, t),
	size: lerpPoint(a.size, b.size, t),
	fillStyle: a.fillStyle,
	strokeStyle: a.strokeStyle,
	strokeWidth: lerpNumber(a.strokeWidth ?? 0, b.strokeWidth ?? 0, t),
});

export function createRectPainter(
	settings: RectSettings,
): Painter {
	return (context) => {
		const {
			position: { x, y },
			size: { x: width, y: height },
			fillStyle,
			strokeStyle,
		} = settings;
		if (fillStyle) {
			context.fillStyle = fillStyle;
			context.fillRect(x, y, width, height);
		}
		if (strokeStyle) {
			context.strokeStyle = strokeStyle;
			context.strokeRect(x, y, width, height);
		}
	};
}

export function inflateRect<T extends RectSettings>(
	settings: T,
	amount: Point,
): T {
	return {
		...settings,
		position: {
			x: settings.position.x - amount.x,
			y: settings.position.y - amount.y,
		},
		size: {
			x: settings.size.x + amount.x * 2,
			y: settings.size.y + amount.y * 2,
		},
	};
}

export function scaleRectAroundCenter<T extends RectSettings>(
	settings: T,
	scale: number,
): T {
	const centerX = settings.position.x + settings.size.x / 2;
	const centerY = settings.position.y + settings.size.y / 2;
	const newWidth = settings.size.x * scale;
	const newHeight = settings.size.y * scale;

	return {
		...settings,
		position: {
			x: centerX - newWidth / 2,
			y: centerY - newHeight / 2,
		},
		size: {
			x: newWidth,
			y: newHeight,
		},
	};
}

export function splitRectHoriziontal<T extends RectSettings>(
	settings: T,
	ratio: number,
): [T, T] {
	const clampedRatio = Math.max(0, Math.min(1, ratio));
	const leftWidth = settings.size.x * clampedRatio;
	const rightWidth = settings.size.x - leftWidth;
	return [
		{
			...settings,
			size: { x: leftWidth, y: settings.size.y },
		},
		{
			...settings,
			position: { x: settings.position.x + leftWidth, y: settings.position.y },
			size: { x: rightWidth, y: settings.size.y },
		},
	];
}

export function createClippingPainter(
	rect: RectSettings,
	basePainter: Painter,
): Painter {
	return (context) => {
		context.save();
		context.beginPath();
		context.rect(rect.position.x, rect.position.y, rect.size.x, rect.size.y);
		context.clip();
		basePainter(context);
		context.restore();
	};
}

export type RRectSettings = RectSettings & {
	radius: number;
};

export const lerpRRectSettings: Lerp<RRectSettings> = (a, b, t) => ({
	...lerpRectSettings(a, b, t),
	radius: lerpNumber(a.radius, b.radius, t),
});

export function createRRectPainter(
	settings: RRectSettings,
): Painter {
	return (context) => {
		const {
			position: { x, y },
			size: { x: width, y: height },
			radius,
			fillStyle,
			strokeStyle,
		} = settings;
		context.beginPath();
		context.roundRect(x, y, width, height, radius);
		context.closePath();
		if (fillStyle) {
			context.fillStyle = fillStyle;
			context.fill();
		}
		if (strokeStyle) {
			context.strokeStyle = strokeStyle;
			context.stroke();
		}
	};
}

export type TextSettings = CommonShapeSettings & {
	text: string;
	position: Point;
	font?: string;
};

export function createTextPainter(
	settings: TextSettings,
): Painter {
	return (context) => {
		const {
			text,
			position: { x, y },
			font = "20px sans-serif",
			fillStyle,
			strokeStyle,
			strokeWidth,
		} = settings;
		if (!text.length) return;
		context.font = font;
		if (strokeWidth) {
			context.lineWidth = strokeWidth;
		}
		if (strokeStyle) {
			context.strokeStyle = strokeStyle;
			context.strokeText(text, x, y);
		}
		if (fillStyle) {
			context.fillStyle = fillStyle;
			context.fillText(text, x, y);
		}
	};
}

export type ScaleSettings = {
	origin?: Point;
	scale: Point;
};

export function createScalingPainter(
	settings: ScaleSettings,
	painter: Painter,
): Painter {
	return (context) => {
		context.save();

		if (settings.origin) {
			context.translate(settings.origin.x, settings.origin.y);
		}
		context.scale(settings.scale.x, settings.scale.y);
		if (settings.origin) {
			context.translate(-settings.origin.x, -settings.origin.y);
		}
		painter(context);

		context.restore();
	};
}

export type ContextTransformSettings = {
	translate?: Point;
	origin?: Point;
	scale?: Point;
	rotateDegrees?: number;
};

export function createTransformingPainter(
	settings: ContextTransformSettings,
	painter: Painter,
): Painter {
	return (context) => {
		context.save();

		if (settings.translate) {
			context.translate(settings.translate.x, settings.translate.y);
		}
		if (settings.origin) {
			context.translate(settings.origin.x, settings.origin.y);
		}
		if (settings.scale) {
			context.scale(settings.scale.x, settings.scale.y);
		}
		if (settings.rotateDegrees) {
			context.rotate(settings.rotateDegrees * Math.PI / 180);
		}
		if (settings.origin) {
			context.translate(-settings.origin.x, -settings.origin.y);
		}
		painter(context);

		context.restore();
	};
}

export const noopPainter: Painter = () => {};

export function startWithEmpty(
	source: Animation<Painter>,
): Animation<Painter> {
	return new CallbackAnimation(
		source.duration,
		source.strategy,
		(t) => t.isGreaterThan(Duration.zero) ? source.at(t) : noopPainter,
		(a, b) => {
			if (a.isEqualTo(b)) return true;
			const isAZero = !a.isGreaterThan(Duration.zero);
			const isBZero = !b.isGreaterThan(Duration.zero);
			if (isAZero && isBZero) return true;
			else if (isAZero || isBZero) return false;
			return source.isSameAt(a, b);
		},
	);
}

export function surroundWithEmpty(
	source: Animation<Painter>,
	duration: Duration,
): Animation<Painter> {
	return startWithEmpty(
		source.extend({
			before: Duration.zero,
			after: duration.subtract(source.duration),
		}, resetToZeroInclusiveTime),
	);
}

export const noopPainterAnim: Animation<Painter> = new ConstantAnimation(
	noopPainter,
);

export function normalizeNumber(
	rangeStart: number,
	rangeEnd: number,
	value: number,
): number {
	return (value - rangeStart) / (rangeEnd - rangeStart);
}

export function clampNumber(
	min: number,
	max: number,
	value: number,
): number {
	return Math.min(Math.max(value, min), max);
}
