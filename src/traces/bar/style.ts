import type { CalcDatum, FullTrace, GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Color from '../../components/color/index.js';
import { font as drawingFont, pointStyle, selectedPointStyle, selectedTextStyle } from '../../components/drawing/index.js';
import { ensureUniformFontSize } from '../../lib/index.js';
import { getComponentMethod } from '../../registry.js';
import _uniform_text from './uniform_text.js';
const { resizeText } = _uniform_text;
import attributes from './attributes.js';
import helpers from './helpers.js';
const attributeTextFont = attributes.textfont;
const attributeInsideTextFont = attributes.insidetextfont;
const attributeOutsideTextFont = attributes.outsidetextfont;

function style(gd: GraphDiv): any {
    const s = select(gd).selectAll('g[class^="barlayer"]').selectAll('g.trace');
    resizeText(gd, s, 'bar');

    const barcount = s.size();
    const fullLayout = gd._fullLayout;

    // trace styling
    s.style('opacity', function(d: any) { return d[0].trace.opacity; })

    // for gapless (either stacked or neighboring grouped) bars use
    // crispEdges to turn off antialiasing so an artificial gap
    // isn't introduced.
    .each(function(this: any, d: any) {
        if((fullLayout.barmode === 'stack' && barcount > 1) ||
                (fullLayout.bargap === 0 &&
                 fullLayout.bargroupgap === 0 &&
                 !d[0].trace.marker.line.width)) {
            select(this).attr('shape-rendering', 'crispEdges');
        }
    });

    s.selectAll('g.points').each(function(this: any, d: any) {
        const sel = select(this);
        const trace = d[0].trace;
        stylePoints(sel, trace, gd);
    });

    getComponentMethod('errorbars', 'style')(s);
}

function stylePoints(sel: any, trace: FullTrace, gd: GraphDiv): void {
    pointStyle(sel.selectAll('path'), trace, gd);
    styleTextPoints(sel, trace, gd);
}

function styleTextPoints(sel: any, trace: FullTrace, gd: GraphDiv): void {
    sel.selectAll('text').each(function(this: any, d: any) {
        const tx = select(this);
        const textFont = ensureUniformFontSize(gd, determineFont(tx, d, trace, gd));

        drawingFont(tx, textFont);
    });
}

function styleOnSelect(gd: GraphDiv, cd: CalcDatum[], sel: any): void {
    const trace = cd[0].trace;

    if(trace.selectedpoints) {
        stylePointsInSelectionMode(sel, trace, gd);
    } else {
        stylePoints(sel, trace, gd);
        getComponentMethod('errorbars', 'style')(sel);
    }
}

function stylePointsInSelectionMode(s: any, trace: FullTrace, gd: GraphDiv): void {
    selectedPointStyle(s.selectAll('path'), trace);
    styleTextInSelectionMode(s.selectAll('text'), trace, gd);
}

function styleTextInSelectionMode(txs: any, trace: FullTrace, gd: GraphDiv): void {
    txs.each(function(this: any, d: any) {
        const tx = select(this);
        let textFont;

        if(d.selected) {
            textFont = ensureUniformFontSize(gd, determineFont(tx, d, trace, gd));

            const selectedFontColor = trace.selected.textfont && trace.selected.textfont.color;
            if(selectedFontColor) {
                textFont.color = selectedFontColor;
            }

            drawingFont(tx, textFont);
        } else {
            selectedTextStyle(tx, trace);
        }
    });
}

function determineFont(tx: any, d: any, trace: FullTrace, gd: GraphDiv): any {
    const layoutFont = gd._fullLayout.font;
    let textFont = trace.textfont;

    if(tx.classed('bartext-inside')) {
        const barColor = getBarColor(d, trace);
        textFont = getInsideTextFont(trace, d.i, layoutFont, barColor);
    } else if(tx.classed('bartext-outside')) {
        textFont = getOutsideTextFont(trace, d.i, layoutFont);
    }

    return textFont;
}

function getTextFont(trace: FullTrace, index: number, defaultValue: any): any {
    return getFontValue(
      attributeTextFont, trace.textfont, index, defaultValue);
}

function getInsideTextFont(trace: FullTrace, index: number, layoutFont: any, barColor: any): any {
    let defaultFont = getTextFont(trace, index, layoutFont);

    const wouldFallBackToLayoutFont =
      (trace._input.textfont === undefined || trace._input.textfont.color === undefined) ||
      (Array.isArray(trace.textfont.color) && trace.textfont.color[index] === undefined);
    if(wouldFallBackToLayoutFont) {
        defaultFont = {
            color: Color.contrast(barColor),
            family: defaultFont.family,
            size: defaultFont.size,
            weight: defaultFont.weight,
            style: defaultFont.style,
            variant: defaultFont.variant,
            textcase: defaultFont.textcase,
            lineposition: defaultFont.lineposition,
            shadow: defaultFont.shadow,
        };
    }

    return getFontValue(
      attributeInsideTextFont, trace.insidetextfont, index, defaultFont);
}

function getOutsideTextFont(trace: FullTrace, index: number, layoutFont: any): any {
    const defaultFont = getTextFont(trace, index, layoutFont);
    return getFontValue(
      attributeOutsideTextFont, trace.outsidetextfont, index, defaultFont);
}

function getFontValue(attributeDefinition: any, attributeValue: any, index: number, defaultValue: any): any {
    attributeValue = attributeValue || {};

    const familyValue = helpers.getValue(attributeValue.family, index);
    const sizeValue = helpers.getValue(attributeValue.size, index);
    const colorValue = helpers.getValue(attributeValue.color, index);
    const weightValue = helpers.getValue(attributeValue.weight, index);
    const styleValue = helpers.getValue(attributeValue.style, index);
    const variantValue = helpers.getValue(attributeValue.variant, index);
    const textcaseValue = helpers.getValue(attributeValue.textcase, index);
    const linepositionValue = helpers.getValue(attributeValue.lineposition, index);
    const shadowValue = helpers.getValue(attributeValue.shadow, index);

    return {
        family: helpers.coerceString(
          attributeDefinition.family, familyValue, defaultValue.family),
        size: helpers.coerceNumber(
          attributeDefinition.size, sizeValue, defaultValue.size),
        color: helpers.coerceColor(
          attributeDefinition.color, colorValue, defaultValue.color),
        weight: helpers.coerceString(
            attributeDefinition.weight, weightValue, defaultValue.weight),
        style: helpers.coerceString(
            attributeDefinition.style, styleValue, defaultValue.style),
        variant: helpers.coerceString(
            attributeDefinition.variant, variantValue, defaultValue.variant),
        textcase: helpers.coerceString(
            attributeDefinition.variant, textcaseValue, defaultValue.textcase),
        lineposition: helpers.coerceString(
            attributeDefinition.variant, linepositionValue, defaultValue.lineposition),
        shadow: helpers.coerceString(
            attributeDefinition.variant, shadowValue, defaultValue.shadow),
    };
}

function getBarColor(cd: any, trace: FullTrace): string {
    if(trace.type === 'waterfall') {
        return trace[cd.dir].marker.color;
    }
    return cd.mcc || cd.mc || trace.marker.color;
}

export default {
    style: style,
    styleTextPoints: styleTextPoints,
    styleOnSelect: styleOnSelect,
    getInsideTextFont: getInsideTextFont,
    getOutsideTextFont: getOutsideTextFont,
    getBarColor: getBarColor,
    resizeText: resizeText
};
