import _req0 from '../scatterpolar/attributes.js';
import _req1 from '../scattergl/attributes.js';
// No cliponaxis or hoveron
const { cliponaxis, hoveron, ...scatterPolarAttrs } = _req0;
const { connectgaps, line: { color, dash, width }, fill, fillcolor, marker, textfont, textposition } = _req1;
export default {
    ...scatterPolarAttrs,
    connectgaps,
    fill,
    fillcolor,
    line: { color, dash, editType: 'calc', width },
    marker,
    textfont,
    textposition
};
