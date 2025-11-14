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

function lerpWrappingNumber(
	a: number,
	b: number,
	animation: number,
	wrapAt: number,
): number {
	if (Math.abs(b - a) > wrapAt / 2) {
		if (a < b) a += wrapAt;
		else b += wrapAt;
	}
	return lerpNumber(a, b, animation);
}

export const lerpHslaColor: Lerp<HslaColor> = (a, b, t) => ({
	h: lerpWrappingNumber(a.h, b.h, t, 360),
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

export function rgbaToHsla(rgba: RgbaColor): HslaColor {
	const { a } = rgba;
	const r = rgba.r / 255;
	const g = rgba.g / 255;
	const b = rgba.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h: number;
	let s: number;
	const l = (max + min) / 2;

	if (max === min) {
		h = 0; // achromatic
		s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h = h!;
		h /= 6; // normalize to [0, 1]
	}

	return { h: h * 360, s: s * 100, l: l * 100, a };
}
