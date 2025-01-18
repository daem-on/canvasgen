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

	clamp(min: Duration, max: Duration): Duration {
		return new Duration(Math.min(max.frame, Math.max(min.frame, this.frame)));
	}

	wrap(max: Duration): Duration {
		return new Duration((this.frame % max.frame + max.frame) % max.frame);
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

export abstract class Animation<T> {
	constructor(public readonly duration: Duration) { }

	abstract at(time: Duration): T;

	derive<U>(callback: (value: T) => U): Animation<U> {
		return new DelegatingCallbackAnimation(this.duration, (time) => callback(this.at(time)));
	}

	delayClamping(by: Duration): Animation<T> {
		return new ClampingCallbackAnimation(this.duration.add(by), (time) => this.at(time.subtract(by)));
	}

	extendClamping(by: Duration): Animation<T> {
		return new ClampingCallbackAnimation(this.duration.add(by), (time) => this.at(time));
	}
}

export class DelegatingCallbackAnimation<T> extends Animation<T> {
	constructor(duration: Duration, private readonly callback: Animatable<T>) {
		super(duration);
	}

	at(time: Duration): T {
		return this.callback(time);
	}
}

export class ThrowingCallbackAnimation<T> extends DelegatingCallbackAnimation<T> {
	at(time: Duration): T {
		if (time.isLessThan(Duration.zero) || time.isGreaterThan(this.duration)) {
			throw new Error(`Time ${time} is out of bounds for animation with duration ${this.duration.frame}`);
		}
		return super.at(time);
	}
}

export class ClampingCallbackAnimation<T> extends DelegatingCallbackAnimation<T> {
	at(time: Duration): T {
		return super.at(time.clamp(Duration.zero, this.duration));
	}
}

export class RepeatingCallbackAnimation<T> extends DelegatingCallbackAnimation<T> {
	at(time: Duration): T {
		return super.at(time.wrap(this.duration));
	}
}

export class ConstantAnimation<T> extends Animation<T> {
	constructor(private readonly value: T, duration = Duration.zero) {
		super(duration);
	}

	at(): T { return this.value; }
}

export function lerp(from: number, to: number, animation: number): number {
	return from + (to - from) * animation;
}

export function constant<T>(value: T): Animatable<T> {
	return () => value;
}

export function numberTween(from: number, to: number, duration: Duration, easing?: (input: number) => number): Animation<number> {
	easing = easing || ((input: number) => input);
	return new ClampingCallbackAnimation(duration, (time) => lerp(from, to, easing(time.dividedBy(duration))));
}

export function fromAnimatableProperties<T extends object>(source: { [k in keyof T]: Animatable<T[k]> }): Animatable<T> {
	const keys = Object.keys(source) as (keyof T)[];
	return (time) => {
		const result = {} as T;
		for (const key of keys) {
			result[key] = source[key](time);
		}
		return result;
	};
}

export function fromAnimationProperties<T extends object>(source: { [k in keyof T]: Animation<T[k]> }): Animation<T> {
	const keys = Object.keys(source) as (keyof T)[];
	const duration = keys.reduce((max, key) => Duration.max(max, source[key].duration), Duration.zero);
	const transformed = Object.fromEntries(keys.map(key => [key, source[key].at.bind(source[key])])) as { [k in keyof T]: Animatable<T[k]> };
	return new ClampingCallbackAnimation(duration, fromAnimatableProperties(transformed));
}

export function fromAnimationArray<T>(source: Animation<T>[]): Animation<T[]> {
	const duration = source.reduce((max, anim) => Duration.max(max, anim.duration), Duration.zero);
	return new ClampingCallbackAnimation(duration, (time) => source.map(anim => anim.at(time)));
}

export function animationSequence<T>(animations: Animation<T>[]): Animation<T> {
	const totalDuration = animations.reduce((sum, anim) => sum.add(anim.duration), Duration.zero);
	return new ClampingCallbackAnimation(totalDuration, (time) => {
		let nextStart = Duration.zero;
		for (const anim of animations) {
			nextStart = nextStart.add(anim.duration);
			if (time.isLessThan(nextStart)) {
				return anim.at(time.subtract(nextStart.subtract(anim.duration)));
			}
		}
		const lastAnim = animations[animations.length - 1];
		return lastAnim.at(time.subtract(nextStart.subtract(lastAnim.duration)));
	});
}

export function paintAll(painters: Animation<Painter[]>): Animation<Painter> {
	return painters.derive(value => context => {
		for (const painter of value) painter(context);
	});
}

type TimeTransform = (time: Duration) => Duration;

function windowBetween(from: Duration, to: Duration): TimeTransform {
	return (time: Duration) => time.subtract(from).clamp(Duration.zero, to.subtract(from));
}

export function animationStaggered<T>(animations: Animation<T>[]): Animation<T[]> {
	const durations = [...animations.map(anim => anim.duration)];
	const totalDuration = durations.reduce((sum, duration) => sum.add(duration), Duration.zero);
	let nextStart = Duration.zero;
	const windows = durations.map(duration => {
		const result = windowBetween(nextStart, nextStart.add(duration));
		nextStart = nextStart.add(duration);
		return result;
	});
	return new ClampingCallbackAnimation(totalDuration, (time) => {
		return animations.map((anim, index) => anim.at(windows[index](time)));
	});
}
