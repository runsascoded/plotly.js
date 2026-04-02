import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import render from './render.js';
import Fx from '../../components/fx/index.js';
import Color from '../../components/color/index.js';
import _constants from './constants.js';
const { cn } = _constants;
const numberFormat = Lib.numberFormat;

const _ = Lib._;

function renderableValuePresent(d: any) {return d !== '';}

function ownTrace(selection: any, d: any) {
    return selection.filter((s: any) => s.key === d.traceId);
}

function makeTranslucent(element: any, alpha: any) {
    select(element)
        .select('path')
        .style('fill-opacity', alpha);
    select(element)
        .select('rect')
        .style('fill-opacity', alpha);
}

function makeTextContrasty(element: any) {
    select(element)
        .select('text.name')
        .style('fill', 'black');
}

function relatedLinks(d: any) {
    return function(l: any) {
        return d.node.sourceLinks.indexOf(l.link) !== -1 || d.node.targetLinks.indexOf(l.link) !== -1;
    };
}

function relatedNodes(l: any) {
    return function(d: any) {
        return d.node.sourceLinks.indexOf(l.link) !== -1 || d.node.targetLinks.indexOf(l.link) !== -1;
    };
}

function nodeHoveredStyle(sankeyNode: any, d: any, sankey: any) {
    if(d && sankey) {
        ownTrace(sankey, d)
            .selectAll('.' + cn.sankeyLink)
            .filter(relatedLinks(d))
            .call(linkHoveredStyle.bind(0, d, sankey, false));
    }
}

function nodeNonHoveredStyle(sankeyNode: any, d: any, sankey: any) {
    if(d && sankey) {
        ownTrace(sankey, d)
            .selectAll('.' + cn.sankeyLink)
            .filter(relatedLinks(d))
            .call(linkNonHoveredStyle.bind(0, d, sankey, false));
    }
}

function linkHoveredStyle(d: any, sankey: any, visitNodes: any, sankeyLink: any) {
    sankeyLink.style('fill', function(l: any) {
        if(!l.link.concentrationscale) {
            return l.tinyColorHoverHue;
        }
    }).style('fill-opacity', function(l: any) {
        if(!l.link.concentrationscale) {
            return l.tinyColorHoverAlpha;
        }
    });

    sankeyLink.each(function(curLink: any) {
        const label = curLink.link.label;
        if(label !== '') {
            ownTrace(sankey, d)
                .selectAll('.' + cn.sankeyLink)
                .filter((l: any) => l.link.label === label)
                .style('fill', function(l: any) {
                    if(!l.link.concentrationscale) {
                        return l.tinyColorHoverHue;
                    }
                }).style('fill-opacity', function(l: any) {
                    if(!l.link.concentrationscale) {
                        return l.tinyColorHoverAlpha;
                    }
                });
        }
    });

    if(visitNodes) {
        ownTrace(sankey, d)
            .selectAll('.' + cn.sankeyNode)
            .filter(relatedNodes(d))
            .call(nodeHoveredStyle);
    }
}

function linkNonHoveredStyle(d: any, sankey: any, visitNodes: any, sankeyLink: any) {
    sankeyLink.style('fill', function(l: any) {
        return l.tinyColorHue;
    }).style('fill-opacity', function(l: any) {
        return l.tinyColorAlpha;
    });

    sankeyLink.each(function(curLink: any) {
        const label = curLink.link.label;
        if(label !== '') {
            ownTrace(sankey, d)
                .selectAll('.' + cn.sankeyLink)
                .filter((l: any) => l.link.label === label)
                .style('fill', function(l: any) {return l.tinyColorHue;})
                .style('fill-opacity', function(l: any) {return l.tinyColorAlpha;});
        }
    });

    if(visitNodes) {
        ownTrace(sankey, d)
            .selectAll(cn.sankeyNode)
            .filter(relatedNodes(d))
            .call(nodeNonHoveredStyle);
    }
}

// does not support array values for now
function castHoverOption(trace: any, attr: any) {
    const labelOpts = trace.hoverlabel || {};
    const val = Lib.nestedProperty(labelOpts, attr).get();
    return Array.isArray(val) ? false : val;
}

export default function plot(gd: GraphDiv, calcData: any[]) {
    const fullLayout = gd._fullLayout;
    const svg = fullLayout._paper;
    const size = fullLayout._size;

    // stash initial view
    for(let i = 0; i < gd._fullData.length; i++) {
        if(!gd._fullData[i].visible) continue;
        if(gd._fullData[i].type !== cn.sankey) continue;
        if(!gd._fullData[i]._viewInitial) {
            const node = gd._fullData[i].node;
            gd._fullData[i]._viewInitial = {
                node: {
                    groups: node.groups.slice(),
                    x: node.x.slice(),
                    y: node.y.slice()
                }
            };
        }
    }

    const linkSelect = (element: any, d: any) => {
        const evt = d.link;
        evt.originalEvent = event;
        gd._hoverdata = [evt];
        Fx.click(gd, { target: true } as any);
    };

    const linkHover = (element: any, d: any, sankey: any) => {
        if(gd._fullLayout.hovermode === false) return;
        select(element).call(linkHoveredStyle.bind(0, d, sankey, true));
        if(d.link.trace.link.hoverinfo !== 'skip') {
            d.link.fullData = d.link.trace;
            gd.emit('plotly_hover', {
                event: event,
                points: [d.link]
            });
        }
    };

    const sourceLabel = _(gd, 'source:') + ' ';
    const targetLabel = _(gd, 'target:') + ' ';
    const concentrationLabel = _(gd, 'concentration:') + ' ';
    const incomingLabel = _(gd, 'incoming flow count:') + ' ';
    const outgoingLabel = _(gd, 'outgoing flow count:') + ' ';

    const linkHoverFollow = function(element: any, d: any) {
        if(gd._fullLayout.hovermode === false) return;
        let obj = d.link.trace.link;
        if(obj.hoverinfo === 'none' || obj.hoverinfo === 'skip') return;

        const hoverItems: any[] = [];

        function hoverCenterPosition(link: any) {
            let hoverCenterX, hoverCenterY;
            if(link.circular) {
                hoverCenterX = (link.circularPathData.leftInnerExtent + link.circularPathData.rightInnerExtent) / 2;
                hoverCenterY = link.circularPathData.verticalFullExtent;
            } else {
                hoverCenterX = (link.source.x1 + link.target.x0) / 2;
                hoverCenterY = (link.y0 + link.y1) / 2;
            }
            const center = [hoverCenterX, hoverCenterY];
            if(link.trace.orientation === 'v') center.reverse();
            center[0] += d.parent.translateX;
            center[1] += d.parent.translateY;
            return center;
        }

        // For each related links, create a hoverItem
        let anchorIndex = 0;
        for(let i = 0; i < d.flow.links.length; i++) {
            const link = d.flow.links[i];
            if(gd._fullLayout.hovermode === 'closest' && d.link.pointNumber !== link.pointNumber) continue;
            if(d.link.pointNumber === link.pointNumber) anchorIndex = i;
            link.fullData = link.trace;
            obj = d.link.trace.link;
            const hoverCenter = hoverCenterPosition(link);
            const hovertemplateLabels = {valueLabel: numberFormat(d.valueFormat)(link.value) + d.valueSuffix};

            hoverItems.push({
                x: hoverCenter[0],
                y: hoverCenter[1],
                name: hovertemplateLabels.valueLabel,
                text: [
                    link.label || '',
                    sourceLabel + link.source.label,
                    targetLabel + link.target.label,
                    link.concentrationscale ? concentrationLabel + numberFormat('%0.2f')(link.flow.labelConcentration) : ''
                ].filter(renderableValuePresent).join('<br>'),
                color: castHoverOption(obj, 'bgcolor') || Color.addOpacity(link.color, 1),
                borderColor: castHoverOption(obj, 'bordercolor'),
                fontFamily: castHoverOption(obj, 'font.family'),
                fontSize: castHoverOption(obj, 'font.size'),
                fontColor: castHoverOption(obj, 'font.color'),
                fontWeight: castHoverOption(obj, 'font.weight'),
                fontStyle: castHoverOption(obj, 'font.style'),
                fontVariant: castHoverOption(obj, 'font.variant'),
                fontTextcase: castHoverOption(obj, 'font.textcase'),
                fontLineposition: castHoverOption(obj, 'font.lineposition'),
                fontShadow: castHoverOption(obj, 'font.shadow'),
                nameLength: castHoverOption(obj, 'namelength'),
                textAlign: castHoverOption(obj, 'align'),
                idealAlign: (event as any).x < hoverCenter[0] ? 'right' : 'left',

                hovertemplate: obj.hovertemplate,
                hovertemplateLabels: hovertemplateLabels,
                eventData: [link]
            });
        }

        const tooltips = Fx.loneHover(hoverItems, {
            container: fullLayout._hoverlayer.node(),
            outerContainer: fullLayout._paper.node(),
            gd: gd,
            anchorIndex: anchorIndex
        });

        tooltips.each(function(this: any) {
            const tooltip = this;
            if(!d.link.concentrationscale) {
                makeTranslucent(tooltip, 0.65);
            }
            makeTextContrasty(tooltip);
        });
    };

    const linkUnhover = (element: any, d: any, sankey: any) => {
        if(gd._fullLayout.hovermode === false) return;
        select(element).call(linkNonHoveredStyle.bind(0, d, sankey, true));
        if(d.link.trace.link.hoverinfo !== 'skip') {
            d.link.fullData = d.link.trace;
            gd.emit('plotly_unhover', {
                event: event,
                points: [d.link]
            });
        }

        Fx.loneUnhover(fullLayout._hoverlayer.node());
    };

    const nodeSelect = (element: any, d: any, sankey: any) => {
        const evt = d.node;
        evt.originalEvent = event;
        gd._hoverdata = [evt];
        select(element).call(nodeNonHoveredStyle, d, sankey);
        Fx.click(gd, { target: true } as any);
    };

    const nodeHover = (element: any, d: any, sankey: any) => {
        if(gd._fullLayout.hovermode === false) return;
        select(element).call(nodeHoveredStyle, d, sankey);
        if(d.node.trace.node.hoverinfo !== 'skip') {
            d.node.fullData = d.node.trace;
            gd.emit('plotly_hover', {
                event: event,
                points: [d.node]
            });
        }
    };

    const nodeHoverFollow = (element: any, d: any) => {
        if(gd._fullLayout.hovermode === false) return;

        const obj = d.node.trace.node;
        if(obj.hoverinfo === 'none' || obj.hoverinfo === 'skip') return;
        const nodeRect = select(element).select('.' + cn.nodeRect);
        const rootBBox = gd._fullLayout._paperdiv.node().getBoundingClientRect();
        const boundingBox = nodeRect.node().getBoundingClientRect();
        const hoverCenterX0 = boundingBox.left - 2 - rootBBox.left;
        const hoverCenterX1 = boundingBox.right + 2 - rootBBox.left;
        const hoverCenterY = boundingBox.top + boundingBox.height / 4 - rootBBox.top;

        const hovertemplateLabels = {valueLabel: numberFormat(d.valueFormat)(d.node.value) + d.valueSuffix};
        d.node.fullData = d.node.trace;

        gd._fullLayout._calcInverseTransform(gd);
        const scaleX = gd._fullLayout._invScaleX;
        const scaleY = gd._fullLayout._invScaleY;

        const tooltip = Fx.loneHover({
            x0: scaleX * hoverCenterX0,
            x1: scaleX * hoverCenterX1,
            y: scaleY * hoverCenterY,
            name: numberFormat(d.valueFormat)(d.node.value) + d.valueSuffix,
            text: [
                d.node.label,
                incomingLabel + d.node.targetLinks.length,
                outgoingLabel + d.node.sourceLinks.length
            ].filter(renderableValuePresent).join('<br>'),
            color: castHoverOption(obj, 'bgcolor') || d.tinyColorHue,
            borderColor: castHoverOption(obj, 'bordercolor'),
            fontFamily: castHoverOption(obj, 'font.family'),
            fontSize: castHoverOption(obj, 'font.size'),
            fontColor: castHoverOption(obj, 'font.color'),
            fontWeight: castHoverOption(obj, 'font.weight'),
            fontStyle: castHoverOption(obj, 'font.style'),
            fontVariant: castHoverOption(obj, 'font.variant'),
            fontTextcase: castHoverOption(obj, 'font.textcase'),
            fontLineposition: castHoverOption(obj, 'font.lineposition'),
            fontShadow: castHoverOption(obj, 'font.shadow'),
            nameLength: castHoverOption(obj, 'namelength'),
            textAlign: castHoverOption(obj, 'align'),
            idealAlign: 'left',

            hovertemplate: obj.hovertemplate,
            hovertemplateLabels: hovertemplateLabels,
            eventData: [d.node]
        }, {
            container: fullLayout._hoverlayer.node(),
            outerContainer: fullLayout._paper.node(),
            gd: gd
        });

        makeTranslucent(tooltip, 0.85);
        makeTextContrasty(tooltip);
    };

    const nodeUnhover = (element: any, d: any, sankey: any) => {
        if(gd._fullLayout.hovermode === false) return;
        select(element).call(nodeNonHoveredStyle, d, sankey);
        if(d.node.trace.node.hoverinfo !== 'skip') {
            d.node.fullData = d.node.trace;
            gd.emit('plotly_unhover', {
                event: event,
                points: [d.node]
            });
        }

        Fx.loneUnhover(fullLayout._hoverlayer.node());
    };

    render(
        gd,
        svg,
        calcData,
        {
            width: size.w,
            height: size.h,
            margin: {
                t: size.t,
                r: size.r,
                b: size.b,
                l: size.l
            }
        },
        {
            linkEvents: {
                hover: linkHover,
                follow: linkHoverFollow,
                unhover: linkUnhover,
                select: linkSelect
            },
            nodeEvents: {
                hover: nodeHover,
                follow: nodeHoverFollow,
                unhover: nodeUnhover,
                select: nodeSelect
            }
        }
    );
}
