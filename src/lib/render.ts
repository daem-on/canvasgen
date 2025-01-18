export type PaintingContext = {
	canvasContext: CanvasRenderingContext2D;
	canvasWidth: number;
	canvasHeight: number;
};

export type Painter = (context: PaintingContext, frame: number) => undefined;

export type Animatable = (frame: number) => number;

export function createPainter(f: Painter): Painter {
	return f;
};

export function ease(painter: Painter, easing: (input: number) => number, endFrame: number): Painter {
	return createPainter((context, frame) => painter(context, easing(frame / endFrame)));
}

export function transformWith(painter: Painter, frameTransform: Animatable): Painter {
	return createPainter((context, frame) => painter(context, frameTransform(frame)));
}

export function lerp(from: number, to: number, animation: number) {
	return from + (to - from) * animation;
}

export function constant(value: number): Animatable {
	return () => value;
}

export function numberTween(from: number, to: number, endFrame: number, easing?: (input: number) => number): Animatable {
	easing = easing || ((input: number) => input);
	return (frame: number) => lerp(from, to, easing(frame / endFrame));
}

export function parallel(painters: Painter[]): Painter {
	return createPainter((context, frame) => {
		for (const p of painters) p(context, frame);
	});
}

export function sequential(painters: Painter[], endFrame: number): Painter {
	return createPainter((context, frame) => {
		const count = painters.length;
		const current = Math.floor(frame * count);
		painters[current](context, (frame % (endFrame / count)) * count);
	});
}

export function timedSequential(painters: [Painter, number][]): Painter {
	return createPainter((context, frame) => {
		let nextStart = 0;
		for (const [painter, frames] of painters) {
			nextStart += frames;
			if (frame < nextStart) {
				painter(context, (frame - (nextStart - frames)));
				break;
			}
		}
	});
}

export function framesBetween(from: number, to: number): Animatable {
	return (frame: number) => Math.min(to - from, Math.max(0, frame - from));
}

export function createAnimatableSequence(frameCounts: number[]): Animatable[] {
	const result: Animatable[] = [];
	let current = 0;
	for (const frames of frameCounts) {
		result.push(framesBetween(current, current + frames));
		current += frames;
	}
	return result;
}
