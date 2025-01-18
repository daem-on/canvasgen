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

export abstract class Animatable<T> {
	constructor(public readonly duration: Duration) { }

	abstract at(time: Duration): T;
}

export class CallbackAnimatable<T> extends Animatable<T> {
	constructor(duration: Duration, private readonly callback: (time: Duration) => T) {
		super(duration);
	}

	at(time: Duration): T {
		return this.callback(time);
	}
}

export function lerp(from: number, to: number, animation: number): number {
	return from + (to - from) * animation;
}

export function constant<T>(value: T): Animatable<T> {
	return new CallbackAnimatable(Duration.zero, () => value);
}

export function numberTween(from: number, to: number, duration: Duration, easing?: (input: number) => number): Animatable<number> {
	easing = easing || ((input: number) => input);
	return new CallbackAnimatable(duration, (time) => lerp(from, to, easing(time.dividedBy(duration))));
}

export function fromTweenProperties<T extends object>(source: { [k in keyof T]: Animatable<T[k]> }): Animatable<T> {
	const keys = Object.keys(source) as (keyof T)[];
	const duration = keys.reduce((max, key) => Duration.max(max, source[key].duration), Duration.zero);
	return new CallbackAnimatable(duration, (time) => {
		const result = {} as T;
		for (const key of keys) {
			result[key] = source[key].at(time);
		}
		return result;
	});
}

export function fromTweenArray<T>(source: Animatable<T>[]): Animatable<T[]> {
	const duration = source.reduce((max, tween) => Duration.max(max, tween.duration), Duration.zero);
	return new CallbackAnimatable(duration, (time) => source.map(tween => tween.at(time)));
}

export function timedSequentialTweens<T>(tweens: Animatable<T>[]): Animatable<T> {
	const totalDuration = tweens.reduce((sum, tween) => sum.add(tween.duration), Duration.zero);
	return new CallbackAnimatable(totalDuration, (time) => {
		let nextStart = Duration.zero;
		for (const tween of tweens) {
			nextStart = nextStart.add(tween.duration);
			if (time.isLessThan(nextStart)) {
				return tween.at(time.subtract(nextStart.subtract(tween.duration)));
			}
		}
		const lastTween = tweens[tweens.length - 1];
		return lastTween.at(time.subtract(nextStart.subtract(lastTween.duration)));
	});
}

export function parallel(painters: Animatable<Painter[]>): Animatable<Painter> {
	return new CallbackAnimatable(painters.duration, (time) => (context) => {
		for (const painter of painters.at(time)) {
			painter(context);
		}
	});
}

type TimeTransform = (time: Duration) => Duration;

function windowBetween(from: Duration, to: Duration): TimeTransform {
	return (time: Duration) => Duration.min(to.subtract(from), Duration.max(Duration.zero, time.subtract(from)));
}

export function createSequenceWindows<T>(tweens: Animatable<T>[]): Animatable<T[]> {
	const durations = [...tweens.map(tween => tween.duration)];
	const totalDuration = durations.reduce((sum, duration) => sum.add(duration), Duration.zero);
	let nextStart = Duration.zero;
	const windows = durations.map(duration => {
		const result = windowBetween(nextStart, nextStart.add(duration));
		nextStart = nextStart.add(duration);
		return result;
	});
	return new CallbackAnimatable(totalDuration, (time) => {
		return tweens.map((tween, index) => tween.at(windows[index](time)));
	});
}

export function delay<T>(tween: Animatable<T>, by: Duration): Animatable<T> {
	return new CallbackAnimatable(tween.duration.add(by), (time) => {
		return tween.at(Duration.max(Duration.zero, time.subtract(by)));
	})
};

export function extend<T>(tween: Animatable<T>, by: Duration): Animatable<T> {
	return new CallbackAnimatable(tween.duration.add(by), (time) => {
		return tween.at(Duration.min(tween.duration, time));
	})
}
