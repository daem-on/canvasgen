import {
	Animation,
	AnimationSettings,
	animationStaggered,
	Duration,
	fromAnimationArray,
	fromAnimationProperties,
	paintAll,
	Painter,
} from "./lib/core.ts";
import {
	animateTextSlice,
	createTextPainter,
	TextSettings,
	tweenNumber,
} from "./lib/std.ts";
import { Context2D } from "./lib/types.ts";

function getWordWidths(
	words: string[],
	context: Context2D,
): number[] {
	return words.map((word) => context.measureText(word).width);
}

function getWordOffsetsFromWidths(
	wordWidths: number[],
): number[] {
	const offsets = [0];
	for (let i = 1; i < wordWidths.length; i++) {
		offsets.push(offsets[i - 1] + wordWidths[i - 1]);
	}
	return offsets;
}

function createTextFloatUpAnimation(
	x: number,
	fromY: number,
	toY: number,
	settingsBase: Omit<TextSettings, "position" | "fillStyle">,
	animSettings: AnimationSettings,
): Animation<TextSettings> {
	return fromAnimationProperties({
		y: tweenNumber({ from: fromY, to: toY, ...animSettings }),
		opacity: tweenNumber({ from: 0, to: 1, ...animSettings }),
	})
		.derive(
			({ y, opacity }) => ({
				...settingsBase,
				position: { x, y },
				fillStyle: `rgba(0, 0, 0, ${opacity})`,
			}),
		);
}

function createPerWordFloatUpAnimations(
	words: string[],
	context: Context2D,
	baseX: number,
	eachAnimSettings: AnimationSettings,
): Animation<TextSettings>[] {
	const font = "20px sans-serif";
	context.font = font;
	const wordWidths = getWordWidths(words, context);
	const wordOffsets = getWordOffsetsFromWidths(wordWidths);
	return words.map((word, i) =>
		createTextFloatUpAnimation(
			baseX + wordOffsets[i],
			120,
			90,
			{ text: word, font },
			eachAnimSettings,
		)
	);
}

export function createTextSceneRenderer(
	context: Context2D,
): Animation<Painter> {
	return paintAll(fromAnimationArray([
		createTextPainter(
			animateTextSlice("Hello, world!", { duration: new Duration(240) })
				.derive(
					(text) => ({
						text,
						position: { x: 20, y: 20 },
						fillStyle: "black",
					}),
				),
		),
		paintAll(
			animationStaggered(
				createPerWordFloatUpAnimations(
					["This ", "is ", "a ", "test."],
					context,
					20,
					{ duration: new Duration(60) },
				).map((anim) => createTextPainter(anim)),
			),
		),
	]));
}
