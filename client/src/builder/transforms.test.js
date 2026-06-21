import { describe, it, expect } from 'vitest';
import {
  parseTranslate, serializeTranslate,
  parseSkew, serializeSkew,
  parseFilter, serializeFilter,
} from './transforms.js';

describe('translate', () => {
  it('parses x/y', () => {
    expect(parseTranslate('10px 20px')).toEqual({ x: 10, y: 20 });
    expect(parseTranslate('5px')).toEqual({ x: 5, y: '' });
    expect(parseTranslate('')).toEqual({ x: '', y: '' });
  });
  it('serializes, dropping the identity', () => {
    expect(serializeTranslate(10, 20)).toBe('10px 20px');
    expect(serializeTranslate(0, 0)).toBe('');
    expect(serializeTranslate('', 12)).toBe('0px 12px');
  });
  it('round-trips', () => {
    expect(parseTranslate(serializeTranslate(-8, 4))).toEqual({ x: -8, y: 4 });
  });
});

describe('skew', () => {
  it('parses skewX/skewY from a transform string', () => {
    expect(parseSkew('skewX(10deg) skewY(5deg)')).toEqual({ x: 10, y: 5 });
    expect(parseSkew('skewY(-3deg)')).toEqual({ x: '', y: -3 });
    expect(parseSkew('')).toEqual({ x: '', y: '' });
  });
  it('serializes, omitting zero/empty parts', () => {
    expect(serializeSkew(10, 5)).toBe('skewX(10deg) skewY(5deg)');
    expect(serializeSkew(0, 0)).toBe('');
    expect(serializeSkew('', 7)).toBe('skewY(7deg)');
  });
});

describe('filter', () => {
  it('parses supported functions', () => {
    expect(parseFilter('blur(4px) brightness(120%) hue-rotate(90deg)')).toEqual({ blur: 4, brightness: 120, hue: 90 });
  });
  it('serializes, dropping defaults', () => {
    expect(serializeFilter({ blur: 4, brightness: 100, contrast: 110 })).toBe('blur(4px) contrast(110%)');
    expect(serializeFilter({})).toBe('');
  });
  it('round-trips a non-default set', () => {
    const obj = { blur: 2, saturate: 150, grayscale: 30 };
    expect(parseFilter(serializeFilter(obj))).toEqual(obj);
  });
});
