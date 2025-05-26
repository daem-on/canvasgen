import { Lerp } from "./core.ts";
import { lerpNumber } from "./std.ts";

export type RgbaColor = {
	r: number;
	g: number;
	b: number;
	a: number;
};

export function rgbaToString(color: RgbaColor): string {
	return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

export const lerpRgbaColor: Lerp<RgbaColor> = (a, b, t) => ({
	r: lerpNumber(a.r, b.r, t),
	g: lerpNumber(a.g, b.g, t),
	b: lerpNumber(a.b, b.b, t),
	a: lerpNumber(a.a, b.a, t),
});

export type HslaColor = {
	h: number;
	s: number;
	l: number;
	a: number;
};

export function hslaToString(color: HslaColor): string {
	return `hsla(${color.h}, ${color.s}%, ${color.l}%, ${color.a})`;
}

export const lerpHslaColor: Lerp<HslaColor> = (a, b, t) => ({
	h: lerpNumber(a.h, b.h, t),
	s: lerpNumber(a.s, b.s, t),
	l: lerpNumber(a.l, b.l, t),
	a: lerpNumber(a.a, b.a, t),
});

// from https://github.com/mary-ext/pkg-color-fns/blob/trunk/lib/mod.ts
export function hexToRgbaColor(color: string): RgbaColor {
	const hex = (str: string, pos: number): number => {
		const c = str.charCodeAt(pos);
		return (c & 0xf) + 9 * (c >> 6);
	};

	let r = 0x00;
	let g = 0x00;
	let b = 0x00;
	let a = 0xff;

	switch (color.length) {
		// rgb
		case 3: {
			r = (hex(color, 0) << 4) + hex(color, 0);
			g = (hex(color, 1) << 4) + hex(color, 1);
			b = (hex(color, 2) << 4) + hex(color, 2);
			break;
		}
		// rgba
		case 4: {
			r = (hex(color, 0) << 4) + hex(color, 0);
			g = (hex(color, 1) << 4) + hex(color, 1);
			b = (hex(color, 2) << 4) + hex(color, 2);
			a = (hex(color, 3) << 4) + hex(color, 3);
			break;
		}

		// rrggbb
		case 6: {
			r = (hex(color, 0) << 4) + hex(color, 1);
			g = (hex(color, 2) << 4) + hex(color, 3);
			b = (hex(color, 4) << 4) + hex(color, 5);
			break;
		}
		// rrggbbaa
		case 8: {
			r = (hex(color, 0) << 4) + hex(color, 1);
			g = (hex(color, 2) << 4) + hex(color, 3);
			b = (hex(color, 4) << 4) + hex(color, 5);
			a = (hex(color, 6) << 4) + hex(color, 7);
			break;
		}

		default: {
			throw new RangeError(`invalid string length: ${color.length}`);
		}
	}

	a = a / 255;

	return { r, g, b, a };
}
