import {
	Animation,
	AnimationSettings,
	defineTween,
	Lerp,
	Painter,
} from "./core.ts";

export const lerpNumber: Lerp<number> = (a, b, t) => a + (b - a) * t;

export const tweenNumber = defineTween(lerpNumber);

export type Point = { x: number; y: number };

export const lerpPoint: Lerp<Point> = (a, b, t) => ({
	x: lerpNumber(a.x, b.x, t),
	y: lerpNumber(a.y, b.y, t),
});

export const tweenPoint = defineTween(lerpPoint);

export class Color {
	constructor(public r: number, public g: number, public b: number) {}

	toString() {
		return `rgb(${this.r}, ${this.g}, ${this.b})`;
	}
}

export class HslColor {
	constructor(
		public h: number,
		public s: number,
		public l: number,
		public a: number,
	) {}

	toString() {
		return `hsla(${this.h}, ${this.s}%, ${this.l}%, ${this.a})`;
	}
}

export const lerpHslColor: Lerp<HslColor> = (a, b, t) =>
	new HslColor(
		lerpNumber(a.h, b.h, t),
		lerpNumber(a.s, b.s, t),
		lerpNumber(a.l, b.l, t),
		lerpNumber(a.a, b.a, t),
	);

export const tweenHsvColor = defineTween(lerpHslColor);

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
};

export type CircleSettings = CommonShapeSettings & {
	center: Point;
	radius: number;
};

export function createCirclePainter(
	settings: Animation<CircleSettings>,
): Animation<Painter> {
	return settings.derive(
		(settings) => (context) => {
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
		},
	);
}

export type RectSettings = CommonShapeSettings & {
	position: Point;
	size: Point;
};

export function createRectPainter(
	settings: Animation<RectSettings>,
): Animation<Painter> {
	return settings.derive(
		(settings) => (context) => {
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
		},
	);
}

export type TextSettings = CommonShapeSettings & {
	text: string;
	position: Point;
	font?: string;
};

export function createTextPainter(
	settings: Animation<TextSettings>,
): Animation<Painter> {
	return settings.derive(
		(settings) => (context) => {
			const {
				text,
				position: { x, y },
				font = "20px sans-serif",
				fillStyle,
				strokeStyle,
			} = settings;
			if (!text.length) return;
			context.font = font;
			if (fillStyle) {
				context.fillStyle = fillStyle;
				context.fillText(text, x, y);
			}
			if (strokeStyle) {
				context.strokeStyle = strokeStyle;
				context.strokeText(text, x, y);
			}
		},
	);
}

export type PathCallbackSettings = CommonShapeSettings & {
	callback: (path: Path2D) => void;
};

export function createPathCallbackPainter(
	settings: Animation<PathCallbackSettings>,
): Animation<Painter> {
	return settings.derive(
		(settings) => (context) => {
			const path = new Path2D();
			settings.callback(path);
			if (settings.fillStyle) {
				context.fillStyle = settings.fillStyle;
				context.fill();
			}
			if (settings.strokeStyle) {
				context.strokeStyle = settings.strokeStyle;
				context.stroke();
			}
		},
	);
}
