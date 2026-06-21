import { describe, it, expect } from 'vitest';
import { parentContext, axisSizeToCss, axisSizeMode, defaultForMode, stackAlignToCss, stackAlign, alignDecls } from './layout.js';

const flexRow = { display: 'flex', direction: 'row' };
const flexCol = { display: 'flex', direction: 'column' };
const grid = { display: 'grid', direction: 'row' };
const block = { display: 'block', direction: 'row' };

describe('axisSizeToCss — flex parent, main axis', () => {
  it('width Fill in a row → flex grow, no width', () => {
    expect(axisSizeToCss('width', 'Fill', '', flexRow)).toEqual({ width: '', flex: '1 1 0%' });
  });
  it('width Fit in a row → flex none', () => {
    expect(axisSizeToCss('width', 'Fit', '', flexRow)).toEqual({ width: '', flex: '0 0 auto' });
  });
  it('width Fixed in a row → flex none + px', () => {
    expect(axisSizeToCss('width', 'Fixed', 240, flexRow)).toEqual({ width: '240px', flex: '0 0 auto' });
  });
  it('width Relative in a row → flex none + %', () => {
    expect(axisSizeToCss('width', 'Relative', 50, flexRow)).toEqual({ width: '50%', flex: '0 0 auto' });
  });
  it('height is the main axis in a column', () => {
    expect(axisSizeToCss('height', 'Fill', '', flexCol)).toEqual({ height: '', flex: '1 1 0%' });
  });
});

describe('axisSizeToCss — flex parent, cross axis', () => {
  it('cross Fill → align-self stretch', () => {
    expect(axisSizeToCss('height', 'Fill', '', flexRow)).toEqual({ height: '', 'align-self': 'stretch' });
  });
  it('cross Fit → align-self flex-start (true hug under default stretch)', () => {
    expect(axisSizeToCss('height', 'Fit', '', flexRow)).toEqual({ height: '', 'align-self': 'flex-start' });
  });
  it('cross Fixed → px, align-self cleared', () => {
    expect(axisSizeToCss('height', 'Fixed', 80, flexRow)).toEqual({ height: '80px', 'align-self': '' });
  });
  it('width is the cross axis in a column', () => {
    expect(axisSizeToCss('width', 'Fill', '', flexCol)).toEqual({ width: '', 'align-self': 'stretch' });
  });
});

describe('axisSizeToCss — grid parent', () => {
  it('width Fill → justify-self stretch', () => {
    expect(axisSizeToCss('width', 'Fill', '', grid)).toEqual({ width: '', 'justify-self': 'stretch' });
  });
  it('height Fit → align-self start', () => {
    expect(axisSizeToCss('height', 'Fit', '', grid)).toEqual({ height: '', 'align-self': 'start' });
  });
  it('width Fixed → px', () => {
    expect(axisSizeToCss('width', 'Fixed', 120, grid)).toEqual({ width: '120px', 'justify-self': '' });
  });
});

describe('axisSizeToCss — block parent', () => {
  it('width Fill → 100%', () => {
    expect(axisSizeToCss('width', 'Fill', '', block)).toEqual({ width: '100%' });
  });
  it('width Fit → fit-content', () => {
    expect(axisSizeToCss('width', 'Fit', '', block)).toEqual({ width: 'fit-content' });
  });
  it('height Fit → auto', () => {
    expect(axisSizeToCss('height', 'Fit', '', block)).toEqual({ height: 'auto' });
  });
  it('width Fixed → px', () => {
    expect(axisSizeToCss('width', 'Fixed', 300, block)).toEqual({ width: '300px' });
  });
  it('accepts values that already carry a unit', () => {
    expect(axisSizeToCss('width', 'Fixed', '300px', block)).toEqual({ width: '300px' });
    expect(axisSizeToCss('width', 'Relative', '40%', block)).toEqual({ width: '40%' });
  });
});

describe('axisSizeMode — inverse of axisSizeToCss', () => {
  it('round-trips main-axis modes in a flex row', () => {
    for (const [mode, value] of [['Fill', ''], ['Fit', ''], ['Fixed', 240], ['Relative', 50]]) {
      const css = axisSizeToCss('width', mode, value, flexRow);
      expect(axisSizeMode('width', css, flexRow)).toEqual({ mode, value });
    }
  });
  it('round-trips cross-axis modes in a flex row', () => {
    for (const [mode, value] of [['Fill', ''], ['Fit', ''], ['Fixed', 80]]) {
      const css = axisSizeToCss('height', mode, value, flexRow);
      expect(axisSizeMode('height', css, flexRow)).toEqual({ mode, value });
    }
  });
  it('round-trips block modes', () => {
    for (const [mode, value] of [['Fill', ''], ['Fit', ''], ['Fixed', 300], ['Relative', 40]]) {
      const css = axisSizeToCss('width', mode, value, block);
      expect(axisSizeMode('width', css, block)).toEqual({ mode, value });
    }
  });
  it('unset width in a block parent reads as Fit', () => {
    expect(axisSizeMode('width', {}, block)).toEqual({ mode: 'Fit', value: '' });
  });
  it('unset main axis in a flex row reads as Fit', () => {
    expect(axisSizeMode('width', {}, flexRow)).toEqual({ mode: 'Fit', value: '' });
  });
});

describe('parentContext', () => {
  const project = {
    instances: {
      root: { id: 'root', children: ['a'] },
      a: { id: 'a', children: [] },
    },
    styles: {
      root: { base: { display: 'flex', 'flex-direction': 'column' } },
    },
  };
  it('reads the flow parent display + direction', () => {
    expect(parentContext(project, 'a', 'base')).toEqual({ parentId: 'root', display: 'flex', direction: 'column' });
  });
  it('falls back to block/row when there is no parent', () => {
    expect(parentContext(project, 'root', 'base')).toEqual({ parentId: null, display: 'block', direction: 'row' });
  });
});

describe('defaultForMode', () => {
  it('seeds Fixed/Relative with a usable number', () => {
    expect(defaultForMode('Fixed', '')).toBe(100);
    expect(defaultForMode('Relative', 30)).toBe(30);
    expect(defaultForMode('Fill', 99)).toBe('');
  });
});

describe('stack child alignment', () => {
  it('row: h→justify, v→align', () => {
    expect(stackAlignToCss('end', 'center', 'row')).toEqual({ 'justify-content': 'flex-end', 'align-items': 'center' });
  });
  it('column: v→justify, h→align (axes swap)', () => {
    expect(stackAlignToCss('start', 'end', 'column')).toEqual({ 'justify-content': 'flex-end', 'align-items': 'flex-start' });
  });
  it('round-trips for row and column', () => {
    for (const dir of ['row', 'column']) {
      for (const h of ['start', 'center', 'end']) {
        for (const v of ['start', 'center', 'end']) {
          expect(stackAlign(stackAlignToCss(h, v, dir), dir)).toEqual({ h, v });
        }
      }
    }
  });
  it('defaults to top-left when unset', () => {
    expect(stackAlign({}, 'row')).toEqual({ h: 'start', v: 'start' });
  });
});

describe('alignDecls — align selected element within parent', () => {
  it('flex row: vertical is the cross axis → align-self', () => {
    expect(alignDecls(flexRow, 'vertical', 'center')).toEqual({ 'align-self': 'center' });
    expect(alignDecls(flexRow, 'vertical', 'end')).toEqual({ 'align-self': 'flex-end' });
  });
  it('flex row: horizontal is the main axis → auto margins', () => {
    expect(alignDecls(flexRow, 'horizontal', 'center')).toEqual({ 'margin-left': 'auto', 'margin-right': 'auto' });
    expect(alignDecls(flexRow, 'horizontal', 'end')).toEqual({ 'margin-left': 'auto', 'margin-right': '' });
    expect(alignDecls(flexRow, 'horizontal', 'start')).toEqual({ 'margin-left': '', 'margin-right': '' });
  });
  it('flex column: axes swap', () => {
    expect(alignDecls(flexCol, 'horizontal', 'center')).toEqual({ 'align-self': 'center' });
    expect(alignDecls(flexCol, 'vertical', 'center')).toEqual({ 'margin-top': 'auto', 'margin-bottom': 'auto' });
  });
  it('grid uses justify-self / align-self', () => {
    expect(alignDecls(grid, 'horizontal', 'start')).toEqual({ 'justify-self': 'start' });
    expect(alignDecls(grid, 'vertical', 'end')).toEqual({ 'align-self': 'end' });
  });
  it('block: horizontal via auto margins, vertical is a no-op', () => {
    expect(alignDecls(block, 'horizontal', 'center')).toEqual({ 'margin-left': 'auto', 'margin-right': 'auto' });
    expect(alignDecls(block, 'vertical', 'center')).toEqual({});
  });
});
