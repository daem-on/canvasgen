export type PaintingContext = {
	canvasContext: CanvasRenderingContext2D;
	canvasWidth: number;
	canvasHeight: number;
};

export type Painter = (context: PaintingContext, frame: Frame) => undefined;

export class Frame {
	constructor(public readonly frame: number) { }

	dividedBy(divisor: Frame): number {
		return this.frame / divisor.frame;
	}

	add(frame: Frame): Frame {
		return new Frame(this.frame + frame.frame);
	}

	subtract(frame: Frame): Frame {
		return new Frame(this.frame - frame.frame);
	}

	isLessThan(frame: Frame): boolean {
		return this.frame < frame.frame;
	}

	isGreaterThan(frame: Frame): boolean {
		return this.frame > frame.frame;
	}

	static min(a: Frame, b: Frame): Frame {
		return new Frame(Math.min(a.frame, b.frame));
	}

	static max(a: Frame, b: Frame): Frame {
		return new Frame(Math.max(a.frame, b.frame));
	}

	static zero = new Frame(0);
}

export type Animatable<T> = (frame: Frame) => T;

export type FrameTransform = (frame: Frame) => Frame;

export function createPainter(f: Painter): Painter {
	return f;
};

export function transformWith(painter: Painter, frameTransform: FrameTransform): Painter {
	return createPainter((context, frame) => painter(context, frameTransform(frame)));
}

export function lerp(from: number, to: number, animation: number) {
	return from + (to - from) * animation;
}

export function constant(value: number): Animatable<number> {
	return () => value;
}

export function numberTween(from: number, to: number, endFrame: Frame, easing?: (input: number) => number): Animatable<number> {
	easing = easing || ((input: number) => input);
	return (frame) => lerp(from, to, easing(frame.dividedBy(endFrame)));
}

export function parallel(painters: Painter[]): Painter {
	return createPainter((context, frame) => {
		for (const p of painters) p(context, frame);
	});
}

export function timedSequential(painters: [Painter, Frame][]): Painter {
	return createPainter((context, frame) => {
		let nextStart = Frame.zero;
		for (const [painter, duration] of painters) {
			nextStart = nextStart.add(duration);
			if (frame.isLessThan(nextStart)) {
				painter(context, frame.subtract(nextStart.subtract(duration)));
				break;
			}
		}
	});
}

export function framesBetween(from: Frame, to: Frame): FrameTransform {
	return (frame: Frame) => Frame.min(to.subtract(from), Frame.max(Frame.zero, frame.subtract(from)));
}

export function createAnimatableSequence(durations: Frame[]): FrameTransform[] {
	const result: FrameTransform[] = [];
	let current = Frame.zero;
	for (const duration of durations) {
		const next = current.add(duration)
		result.push(framesBetween(current, next));
		current = next;
	}
	return result;
}
