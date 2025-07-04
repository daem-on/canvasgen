export type Painter = (context: CanvasRenderingContext2D) => void;

export class Duration {
	constructor(public readonly frame: number) {}

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

	get isZero(): boolean {
		return this.frame === 0;
	}

	clamp(min: Duration, max: Duration): Duration {
		return new Duration(
			Math.max(min.frame, Math.min(max.frame, this.frame)),
		);
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

	static fromSeconds(seconds: number, frameRate: number): Duration {
		return new Duration(Math.ceil(seconds * frameRate));
	}
}

export type Animatable<T> = (time: Duration) => T;

type TimeTransform = (time: Duration) => Duration;

export type TimeTransformStrategy = (
	animation: Animation<unknown>,
) => TimeTransform;

export const delegateTime: TimeTransformStrategy = () => (time) => time;

export const clampTime: TimeTransformStrategy = (animation) => (time) =>
	time.clamp(Duration.zero, animation.duration);

export const wrapTime: TimeTransformStrategy = (animation) => (time) =>
	time.wrap(animation.duration);

export const assertTime: TimeTransformStrategy = (animation) => (time) => {
	if (
		time.isLessThan(Duration.zero) || time.isGreaterThan(animation.duration)
	) {
		throw new Error(
			`Time ${time.frame} is out of bounds [0, ${animation.duration.frame}]`,
		);
	}
	return time;
};

export const resetToZeroTime: TimeTransformStrategy = (animation) => (time) =>
	time.isGreaterThan(animation.duration) ? Duration.zero : time;

export const resetToZeroInclusiveTime: TimeTransformStrategy =
	(animation) => (time) =>
		time.isLessThan(animation.duration) ? time : Duration.zero;

export abstract class Animation<T> {
	constructor(
		public readonly duration: Duration,
		public readonly strategy: TimeTransformStrategy,
	) {}

	abstract at(time: Duration): T;

	derive<U>(callback: (value: T) => U): Animation<U> {
		return new CallbackAnimation(
			this.duration,
			this.strategy,
			(time) => callback(this.at(time)),
		);
	}

	extend(padding: { before: Duration; after: Duration }): Animation<T> {
		return new CallbackAnimation(
			this.duration.add(padding.before).add(padding.after),
			this.strategy,
			(time) => this.at(time.subtract(padding.before)),
		);
	}
}

export class CallbackAnimation<T> extends Animation<T> {
	private transform = this.strategy(this);

	constructor(
		duration: Duration,
		strategy: TimeTransformStrategy,
		private readonly callback: Animatable<T>,
	) {
		super(duration, strategy);
	}

	at(time: Duration): T {
		return this.callback(this.transform(time));
	}
}

export class ConstantAnimation<T> extends Animation<T> {
	constructor(private readonly value: T, duration = Duration.zero) {
		super(duration, delegateTime);
	}

	at(): T {
		return this.value;
	}
}

export type Lerp<T> = (from: T, to: T, animation: number) => T;

export type AnimationSettings = {
	duration: Duration;
	easing?: (input: number) => number;
	strategy?: TimeTransformStrategy;
};

export type Timed<T> = {
	value: T;
	time: Duration;
};

export type TweenCreator<T> = (
	settings: AnimationSettings & {
		from: T;
		to: T;
	},
) => Animation<T>;

export function defineTween<T>(lerp: Lerp<T>): TweenCreator<T> {
	return ({ from, to, duration, easing, strategy }) =>
		new CallbackAnimation(duration, strategy ?? clampTime, (time) => {
			const animation = duration.isZero ? 1 : time.dividedBy(duration);
			const easedAnimation = easing ? easing(animation) : animation;
			return lerp(from, to, easedAnimation);
		});
}

export function constant<T>(value: T): Animatable<T> {
	return () => value;
}

export function fromAnimatableProperties<T extends object>(
	source: { [k in keyof T]: Animatable<T[k]> },
): Animatable<T> {
	const keys = Object.keys(source) as (keyof T)[];
	return (time) => {
		const result = {} as T;
		for (const key of keys) {
			result[key] = source[key](time);
		}
		return result;
	};
}

export function fromAnimationProperties<T extends object>(
	source: { [k in keyof T]: Animation<T[k]> },
	strategy = clampTime,
): Animation<T> {
	const keys = Object.keys(source) as (keyof T)[];
	const duration = keys.reduce(
		(max, key) => Duration.max(max, source[key].duration),
		Duration.zero,
	);
	const transformed = Object.fromEntries(
		keys.map((key) => [key, source[key].at.bind(source[key])]),
	) as { [k in keyof T]: Animatable<T[k]> };
	return new CallbackAnimation(
		duration,
		strategy,
		fromAnimatableProperties(transformed),
	);
}

export function fromAnimationArray<T>(
	source: Animation<T>[],
	strategy = clampTime,
): Animation<T[]> {
	const duration = source.reduce(
		(max, anim) => Duration.max(max, anim.duration),
		Duration.zero,
	);
	return new CallbackAnimation(
		duration,
		strategy,
		(time) => source.map((anim) => anim.at(time)),
	);
}

export function animationSequence<T>(
	animations: Animation<T>[],
	strategy = clampTime,
): Animation<T> {
	const totalDuration = animations.reduce(
		(sum, anim) => sum.add(anim.duration),
		Duration.zero,
	);
	return new CallbackAnimation(totalDuration, strategy, (time) => {
		let nextStart = Duration.zero;
		for (const anim of animations) {
			nextStart = nextStart.add(anim.duration);
			if (time.isLessThan(nextStart)) {
				return anim.at(
					time.subtract(nextStart.subtract(anim.duration)),
				);
			}
		}
		const lastAnim = animations[animations.length - 1];
		return lastAnim.at(
			time.subtract(nextStart.subtract(lastAnim.duration)),
		);
	});
}

export function animationSwitch<T>(
	end: Duration,
	timedAnimations: Timed<Animation<T>>[],
	strategy = clampTime,
): Animation<T> {
	return new CallbackAnimation(end, strategy, (time) => {
		const index = timedAnimations.findIndex((anim) =>
			anim.time.isGreaterThan(time)
		);
		const current = index == -1
			? timedAnimations.at(-1)
			: timedAnimations.at(index - 1);
		return current!.value.at(time.subtract(current!.time));
	});
}

export function paintAll(painters: Animation<Painter[]>): Animation<Painter> {
	return painters.derive((value) => (context) => {
		for (const painter of value) painter(context);
	});
}

function windowBetween(from: Duration, to: Duration): TimeTransform {
	return (time: Duration) =>
		time.subtract(from).clamp(Duration.zero, to.subtract(from));
}

export function animationWindowed<T>(
	timedAnimations: Timed<Animation<T>>[],
	strategy = clampTime,
): Animation<T[]> {
	const lastAnim = timedAnimations.at(-1);
	const endTime = lastAnim?.time.add(lastAnim.value.duration) ?? Duration.zero;
	const windows = timedAnimations.map((anim) =>
		windowBetween(anim.time, anim.time.add(anim.value.duration))
	);
	return new CallbackAnimation(endTime, strategy, (time) => {
		return timedAnimations.map((anim, index) =>
			anim.value.at(windows[index](time))
		);
	});
}

export function animationStaggered<T>(
	animations: Animation<T>[],
	strategy = clampTime,
): Animation<T[]> {
	const durations = [...animations.map((anim) => anim.duration)];
	const totalDuration = durations.reduce(
		(sum, duration) => sum.add(duration),
		Duration.zero,
	);
	let nextStart = Duration.zero;
	const windows = durations.map((duration) => {
		const result = windowBetween(nextStart, nextStart.add(duration));
		nextStart = nextStart.add(duration);
		return result;
	});
	return new CallbackAnimation(totalDuration, strategy, (time) => {
		return animations.map((anim, index) => anim.at(windows[index](time)));
	});
}

export function fillToFrames<T>(
	end: Duration,
	timedAnimations: Timed<Animation<T>>[],
): Animation<T>[] {
	return timedAnimations.map((element, i) => {
		const nextStart = timedAnimations.at(i + 1)?.time ?? end;
		const difference = Duration.max(
			nextStart.subtract(element.time.add(element.value.duration)),
			Duration.zero,
		);
		return element.value.extend({
			before: Duration.zero,
			after: difference,
		});
	});
}

export function animationFromKeyframes<T>(
	keyframes: Timed<T>[],
	lerp: Lerp<T>,
	easing: (input: number) => number,
	sequenceStrategy = clampTime,
): Animation<T> {
	const tweenValue = defineTween(lerp);
	return animationSequence<T>(
		keyframes.map((keyframe, i) => {
			const nextKeyframe = keyframes[i + 1];
			if (nextKeyframe === undefined) {
				return new ConstantAnimation(keyframe.value);
			}
			const duration = nextKeyframe.time.subtract(keyframe.time);
			return tweenValue({
				from: keyframe.value,
				to: nextKeyframe.value,
				duration,
				easing,
			});
		}),
		sequenceStrategy,
	);
}
