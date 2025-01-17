export type PaintingContext = {
	canvasContext: CanvasRenderingContext2D;
	canvasWidth: number;
	canvasHeight: number;
};

export type Painter = (context: PaintingContext, animation: number) => undefined;

export type Animatable = (animation: number) => number;

export function createPainter(f: Painter): Painter {
	return f;
};

export function compose(first: Animatable, second: Animatable): Animatable {
	return (input: number) => second(first(input));
}

export function ease(painter: Painter, easing: Animatable): Painter {
	return createPainter((context, animation) => painter(context, easing(animation)));
}

export function lerp(from: number, to: number, animation: number) {
	return from + (to - from) * animation;
}

export function constant(value: number): Animatable {
	return () => value;
}

export function numberTween(from: number, to: number): Animatable {
	return (animation: number) => lerp(from, to, animation);
}

export function parallel(painters: Painter[]): Painter {
	return createPainter((context, animation) => {
		for (const p of painters) p(context, animation);
	});
}

export function sequential(painters: Painter[]): Painter {
	return createPainter((context, animation) => {
		const count = painters.length;
		const current = Math.floor(animation * count);
		painters[current](context, (animation % (1 / count)) * count);
	});
}

export function weightedSequential(painters: [Painter, number][]): Painter {
	return createPainter((context, animation) => {
		let currentWeight = 0;
		for (const [painter, weight] of painters) {
			currentWeight += weight;
			if (animation < currentWeight) {
				painter(context, (animation - (currentWeight - weight)) / weight);
				break;
			}
		}
	});
}

export function createLinearBetween(from: number, to: number): Animatable {
	return (input: number) => Math.min(1, Math.max(0, (input - from) / (to - from)));
}

export function createWeightedChain(weights: number[]): Animatable[] {
	const result: Animatable[] = [];
	let current = 0;
	for (const weight of weights) {
		result.push(createLinearBetween(current, current + weight));
		current += weight;
	}
	return result;
}
