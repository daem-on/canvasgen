export type PaintingContext = {
	canvasContext: CanvasRenderingContext2D;
	canvasWidth: number;
	canvasHeight: number;
};

export type Painter = (context: PaintingContext) => undefined;

export class Duration {
	constructor(public readonly frame: number) { }

	dividedBy(divisor: Duration): number {
		return this.frame / divisor.frame;
	}

	add(other: Duration): Duration {
		return new Duration(this.frame + other.frame);
	}

	subtract(other: Duration): Duration {
		return new Duration(this.frame - other.frame);
	}

	isLessThan(other: Duration): boolean {
		return this.frame < other.frame;
	}

	isGreaterThan(other: Duration): boolean {
		return this.frame > other.frame;
	}

	static min(a: Duration, b: Duration): Duration {
		return new Duration(Math.min(a.frame, b.frame));
	}

	static max(a: Duration, b: Duration): Duration {
		return new Duration(Math.max(a.frame, b.frame));
	}

	static zero = new Duration(0);
}

export type Animatable<T> = (time: Duration) => T;

export type TimeTransform = (time: Duration) => Duration;

export function transformTimeWith<T>(target: Animatable<T>, transform: TimeTransform): Animatable<T> {
	return (time) => target(transform(time));
}

export function lerp(from: number, to: number, animation: number) {
	return from + (to - from) * animation;
}

export function constant<T>(value: T): Animatable<T> {
	return () => value;
}

export function numberTween(from: number, to: number, duration: Duration, easing?: (input: number) => number): Animatable<number> {
	easing = easing || ((input: number) => input);
	return (time) => lerp(from, to, easing(time.dividedBy(duration)));
}

export function fromTweenProperties<T extends object>(source: { [k in keyof T]: Animatable<T[k]> }): Animatable<T> {
	const keys = Object.keys(source) as (keyof T)[];
	return (time) => {
		const result = {} as T;
		for (const key of keys) {
			result[key] = source[key](time);
		}
		return result;
	};
}

export function fromTweenArray<T>(source: Animatable<T>[]): Animatable<T[]> {
	return (time) => source.map(tween => tween(time));
}

export function timedSequentialTweens<T>(tweens: [Animatable<T>, Duration][]): Animatable<T> {
	return (time) => {
		let nextStart = Duration.zero;
		for (const [tween, duration] of tweens) {
			nextStart = nextStart.add(duration);
			if (time.isLessThan(nextStart)) {
				return tween(time.subtract(nextStart.subtract(duration)));
			}
		}
		const lastTween = tweens[tweens.length - 1];
		return lastTween[0](time.subtract(nextStart.subtract(lastTween[1])));
	};
}

export function parallel(painters: Animatable<Painter[]>): Animatable<Painter> {
	return (time) => (context) => {
		for (const painter of painters(time)) {
			painter(context);
		}
	};
}

export function windowBetween(from: Duration, to: Duration): TimeTransform {
	return (time: Duration) => Duration.min(to.subtract(from), Duration.max(Duration.zero, time.subtract(from)));
}

export function createSequenceWindows(durations: Duration[]): TimeTransform[] {
	const result: TimeTransform[] = [];
	let current = Duration.zero;
	for (const duration of durations) {
		const next = current.add(duration)
		result.push(windowBetween(current, next));
		current = next;
	}
	return result;
}
