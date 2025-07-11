export const easings = {
	linear: (input: number) => input,
	easeIn: (input: number) => Math.pow(input, 2),
	easeOut: (input: number) => 1 - Math.pow(1 - input, 2),
	easeInOut: (input: number) => input < 0.5 ? 2 * Math.pow(input, 2) : 1 - Math.pow(-2 * input + 2, 2) / 2,
	easeInBounce: (input: number) => {
		const n1 = 7.5625;
		const d1 = 2.75;

		if (input < 1 / d1) {
			return n1 * input * input;
		} else if (input < 2 / d1) {
			return n1 * (input -= 1.5 / d1) * input + 0.75;
		} else if (input < 2.5 / d1) {
			return n1 * (input -= 2.25 / d1) * input + 0.9375;
		} else {
			return n1 * (input -= 2.625 / d1) * input + 0.984375;
		}
	},
	easeOutBounce: (input: number) => 1 - easings.easeInBounce(1 - input),
	easeInBack: (input: number) => {
		const c1 = 1.70158;
		const c3 = c1 + 1;

		return c3 * input * input * input - c1 * input * input;
	},
	easeOutBack: (input: number) => 1 - easings.easeInBack(1 - input),
	easeInOutBack: (input: number) => {
		const c1 = 1.70158;
		const c2 = c1 * 1.525;

		return input < 0.5
			? (Math.pow(2 * input, 2) * ((c2 + 1) * 2 * input - c2)) / 2
			: (Math.pow(2 * input - 2, 2) * ((c2 + 1) * (input * 2 - 2) + c2) + 2) / 2;
	},
	easeInCubic: (input: number) => input * input * input,
	easeOutCubic: (input: number) => 1 - Math.pow(1 - input, 3),
	easeInOutCubic: (input: number) => input < 0.5
		? 4 * input * input * input
		: 1 - Math.pow(-2 * input + 2, 3) / 2,
	easeInQuart: (input: number) => input * input * input * input,
	easeOutQuart: (input: number) => 1 - Math.pow(1 - input, 4),
	easeInOutQuart: (input: number) => input < 0.5
		? 8 * input * input * input * input
		: 1 - Math.pow(-2 * input + 2, 4) / 2,
};