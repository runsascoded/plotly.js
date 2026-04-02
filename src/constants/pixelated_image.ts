export const CSS_DECLARATIONS: readonly [string, string][] = [
    ['image-rendering', 'optimizeSpeed'],
    ['image-rendering', '-moz-crisp-edges'],
    ['image-rendering', '-o-crisp-edges'],
    ['image-rendering', '-webkit-optimize-contrast'],
    ['image-rendering', 'optimize-contrast'],
    ['image-rendering', 'crisp-edges'],
    ['image-rendering', 'pixelated']
];

export const STYLE: string = CSS_DECLARATIONS.map((d) => d.join(': ') + '; ').join('');

export default { CSS_DECLARATIONS, STYLE };
