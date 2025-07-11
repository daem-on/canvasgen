/**
 * `Painter` is a function which receives a rendering context and
 * performs the actual imperative operations to paint on the canvas.
 */
export type Painter = (context: CanvasRenderingContext2D) => void;

/**
 * `Duration` is a representation of time, it can be a point in time, or the
 * elapsed time between two points. In canvasgen, everything to do with time
 * is stored in `Duration`s, which makes it easy to distinguish from any other
 * `number` value. The actual stored value is in frames, but reading the
 * `frame` property is discouraged, and any operations on a `Duration` should
 * be done through its methods.
 */
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

	scale(factor: number): Duration {
		return new Duration(Math.round(this.frame * factor));
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

/** Any function which can be evaluated at a certain `time`. */
export type Animatable<T> = (time: Duration) => T;

type TimeTransform = (time: Duration) => Duration;

/** Represents a transformation applied to an `Animation`'s input time */
export type TimeTransformStrategy = (
	animation: Animation<unknown>,
) => TimeTransform;

/**
 * A strategy which doesn't transform time, passing it on to the underlying
 * animation as is.
 */
export const delegateTime: TimeTransformStrategy = () => (time) => time;

/**
 * A strategy which clamps input time to the animation's bounds, meaning
 * between zero and the animation's duration.
 */
export const clampTime: TimeTransformStrategy = (animation) => (time) =>
	time.clamp(Duration.zero, animation.duration);

/**
 * A strategy which wraps input time to always be in the animation's bounds
 * using `Duration.wrap()`.
 */
export const wrapTime: TimeTransformStrategy = (animation) => (time) =>
	time.wrap(animation.duration);

/**
 * A strategy which throws an error if the input time is outside the bounds
 * of the animation, meaning below zero or above the animation's duration.
 */
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

/**
 * A strategy which works normally when input time is in the animation's bounds,
 * and outside the bounds evaluates the animation at zero.
 */
export const resetToZeroTime: TimeTransformStrategy = (animation) => (time) =>
	time.isGreaterThan(animation.duration) ? Duration.zero : time;

/**
 * A strategy which works normally when input time is in the animation's bounds
 * (including when input is equal to the duration), and outside the bounds
 * evaluates the animation at zero.
 */
export const resetToZeroInclusiveTime: TimeTransformStrategy =
	(animation) => (time) =>
		time.isLessThan(animation.duration) ? time : Duration.zero;

/**
 * An `Animation` can be evaluated at a certain time to produce a value of
 * type `T`. It is left up to the implementations of `Animation` how they
 * determine the value.
 */
export abstract class Animation<T> {
	constructor(
		public readonly duration: Duration,
		public readonly strategy: TimeTransformStrategy,
	) {}

	/** Evaluates this animation at a certain time. */
	abstract at(time: Duration): T;

	/**
	 * Creates a new animation based on this one. When the new animation is
	 * evaluated at `t`, it will return the value of the old animation at `t`
	 * transformed by the given `callback`.
	 */
	derive<U>(callback: (value: T) => U): Animation<U> {
		return new CallbackAnimation(
			this.duration,
			this.strategy,
			(time) => callback(this.at(time)),
		);
	}

	/**
	 * Creates a new animation by extending this one in time. It will behave
	 * the same as this one in the range of *before* to *before + duration*.
	 */
	extend(
		padding: { before: Duration; after: Duration },
		strategy = this.strategy,
	): Animation<T> {
		return new CallbackAnimation(
			this.duration.add(padding.before).add(padding.after),
			strategy,
			(time) => this.at(time.subtract(padding.before)),
		);
	}
}

/**
 * An `Animation` which delegates the evaluation of its value
 * to a callback function.
 */
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

/** An `Animation` which always evaluates to its `value`, no matter the time. */
export class ConstantAnimation<T> extends Animation<T> {
	constructor(private readonly value: T, duration = Duration.zero) {
		super(duration, delegateTime);
	}

	at(): T {
		return this.value;
	}
}

/** A linear interpolation function. */
export type Lerp<T> = (from: T, to: T, animation: number) => T;

export type AnimationSettings = {
	duration: Duration;
	easing?: (input: number) => number;
	strategy?: TimeTransformStrategy;
};

/** Represents any value associated with a certain time. */
export type Timed<T> = {
	value: T;
	time: Duration;
};

/** Represents a function which creates new tween animations of type `T`. */
export type TweenCreator<T> = (
	settings: AnimationSettings & {
		from: T;
		to: T;
	},
) => Animation<T>;

/**
 * Creates a `TweenCreator` based on a `lerp` function that defines how to
 * to linearly interpolate values of type `T`. The creator can then be used
 * to make new tween animations of type `T`.
 */
export function defineTween<T>(lerp: Lerp<T>): TweenCreator<T> {
	return ({ from, to, duration, easing, strategy }) =>
		new CallbackAnimation(duration, strategy ?? clampTime, (time) => {
			const animation = duration.isZero ? 1 : time.dividedBy(duration);
			const easedAnimation = easing ? easing(animation) : animation;
			return lerp(from, to, easedAnimation);
		});
}

/** Creates a constant function. */
export function constant<T>(value: T): Animatable<T> {
	return () => value;
}

/**
 * Creates a function which evaluates to an object, where each property is
 * produced by evaluating the animatable properties of `source`.
 */
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

/**
 * Creates an `Animation` which evaluates to an object, where each property
 * is produced by evaluating the `Animation`s given in `source`.
 */
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

/**
 * Creates an `Animation` which evaluates to an array of values produced by
 * evaluating the `Animation`s given in `source`.
 */
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

/**
 * Creates an `Animation` which evaluates the given `animations` in sequence,
 * each animation being evaluated for its own duration, and their input time
 * being inside their bounds (all animations starting from zero).
 */
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

/**
 * Creates an `Animation` based on a list of `Animation`s with start times.
 * It always evaluates the "current" animation, which at any given time is the
 * first in the list with a lower start time.
 *
 * @param timedAnimations A list of animations with start times, should be
 * sorted by start time.
 */
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

/**
 * Creates a painter `Animation` by painting with all the painters produced by
 * the source animation.
 */
export function paintAll(painters: Animation<Painter[]>): Animation<Painter> {
	return painters.derive((value) => (context) => {
		for (const painter of value) painter(context);
	});
}

function windowBetween(from: Duration, to: Duration): TimeTransform {
	return (time: Duration) =>
		time.subtract(from).clamp(Duration.zero, to.subtract(from));
}

/**
 * Creates an `Animation` which evaluates to a list of values produced
 * by evaluating `animation`s given in `timedAnimations`, but offset from
 * each other in time.
 *
 * The time given for each animation determines when its window will start,
 * and the window is the same duration as the animation.
 *
 * Outside an animation's window, its value will still be included in the list,
 * but evaluated with the time clamped to be inside its bounds.
 *
 * @param timedAnimations A list of animations with start times, should be
 * sorted by start time.
 */
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

/**
 * Creates an `Animation` which evaluates to a list of values produced
 * by evaluating the list of `animations`, in a sequence where each animation
 * lasts for its duration.
 *
 * All animations are evaluated for any input time, and outside the range
 * of an animation its input time will be clamped to the bounds of that
 * animation.
 */
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

/**
 * Creates a list of `Animation`s by filling the gaps between the
 * `timedAnimations`, so animations are the same as in the original list, but
 * their durations are extended to the next animation's start time.
 *
 * This basically converts the list from the format used by `animationSwitch`
 * to the format used by `animationSequence`.
 *
 * @param end The end time to extend the last animation's duration to.
 * @param timedAnimations A list of animations with start times, should be
 * sorted by start time.
 */
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

/**
 * Creates an `Animation` from a list of keyframes, where each keyframe
 * defines a value at a certain time. The resulting animation will interpolate
 * between the keyframes using the given `lerp` function and `easing` function.
 *
 * @param keyframes A list of keyframes, should be sorted by time.
 */
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
