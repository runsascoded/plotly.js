export var xmlns: string = 'http://www.w3.org/2000/xmlns/';
export var svg: string = 'http://www.w3.org/2000/svg';
export var xlink: string = 'http://www.w3.org/1999/xlink';

export var svgAttrs: Record<string, string> = {
    xmlns: svg,
    'xmlns:xlink': xlink
};

export default { xmlns, svg, xlink, svgAttrs };
