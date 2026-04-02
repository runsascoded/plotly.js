import type { GraphDiv } from '../../../types/core';
import * as d3Force from 'd3-force';
import { interpolateNumber } from 'd3-interpolate';
import { select } from 'd3-selection';
import { zoom as d3Zoom } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import * as d3Sankey from '@plotly/d3-sankey';
import * as d3SankeyCircular from '@plotly/d3-sankey-circular';
import c from './constants.js';
import tinycolor from 'tinycolor2';
import Color from '../../components/color/index.js';
import { font } from '../../components/drawing/index.js';
import Lib from '../../lib/index.js';
import gup from '../../lib/gup.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import Registry from '../../registry.js';
import alignmentConstants from '../../constants/alignment.js';
const strTranslate = Lib.strTranslate;
const strRotate = Lib.strRotate;
const keyFun = gup.keyFun;
const repeat = gup.repeat;
const unwrap = gup.unwrap;
const CAP_SHIFT = alignmentConstants.CAP_SHIFT;
const LINE_SPACING = alignmentConstants.LINE_SPACING;
const TEXTPAD = 3;

// view models

function sankeyModel(layout: any, d: any, traceIndex: any) {
    const calcData = unwrap(d);
    const trace = calcData.trace;
    const domain = trace.domain;
    const horizontal = trace.orientation === 'h';
    const nodePad = trace.node.pad;
    const nodeThickness = trace.node.thickness;
    const nodeAlign = ({
        justify: d3Sankey.sankeyJustify,
        left: d3Sankey.sankeyLeft,
        right: d3Sankey.sankeyRight,
        center: d3Sankey.sankeyCenter
    } as any)[trace.node.align];

    const width = layout.width * (domain.x[1] - domain.x[0]);
    const height = layout.height * (domain.y[1] - domain.y[0]);

    let nodes = calcData._nodes;
    const links = calcData._links;
    const circular = calcData.circular;

    // Select Sankey generator
    let sankey;
    if(circular) {
        sankey = d3SankeyCircular
            .sankeyCircular()
            .circularLinkGap(0);
    } else {
        sankey = d3Sankey.sankey();
    }

    sankey
      .iterations(c.sankeyIterations)
      .size(horizontal ? [width, height] : [height, width])
      .nodeWidth(nodeThickness)
      .nodePadding(nodePad)
      .nodeId(function(d: any) {
          return d.pointNumber;
      })
      .nodeAlign(nodeAlign)
      .nodes(nodes)
      .links(links);

    const graph = sankey();

    if(sankey.nodePadding() < nodePad) {
        Lib.warn('node.pad was reduced to ', sankey.nodePadding(), ' to fit within the figure.');
    }

    // Counters for nested loops
    let i, j, k;

    // Create transient nodes for animations
    for(const nodePointNumber in calcData._groupLookup) {
        const groupIndex = parseInt(calcData._groupLookup[nodePointNumber]);

        // Find node representing groupIndex
        let groupingNode;

        for(i = 0; i < graph.nodes.length; i++) {
            if(graph.nodes[i].pointNumber === groupIndex) {
                groupingNode = graph.nodes[i];
                break;
            }
        }
        // If groupinNode is undefined, no links are targeting this group
        if(!groupingNode) continue;

        const child = {
            pointNumber: parseInt(nodePointNumber),
            x0: groupingNode.x0,
            x1: groupingNode.x1,
            y0: groupingNode.y0,
            y1: groupingNode.y1,
            partOfGroup: true,
            sourceLinks: [],
            targetLinks: []
        };

        graph.nodes.unshift(child);
        groupingNode.childrenNodes.unshift(child);
    }

    function computeLinkConcentrations() {
        for(i = 0; i < graph.nodes.length; i++) {
            const node = graph.nodes[i];
            // Links connecting the same two nodes are part of a flow
            const flows: any = {};
            let flowKey;
            let link;
            for(j = 0; j < node.targetLinks.length; j++) {
                link = node.targetLinks[j];
                flowKey = link.source.pointNumber + ':' + link.target.pointNumber;
                if(!flows.hasOwnProperty(flowKey)) flows[flowKey] = [];
                flows[flowKey].push(link);
            }

            // Compute statistics for each flow
            const keys = Object.keys(flows);
            for(j = 0; j < keys.length; j++) {
                flowKey = keys[j];
                const flowLinks = flows[flowKey];

                // Find the total size of the flow and total size per label
                let total = 0;
                const totalPerLabel: any = {};
                for(k = 0; k < flowLinks.length; k++) {
                    link = flowLinks[k];
                    if(!totalPerLabel[link.label]) totalPerLabel[link.label] = 0;
                    totalPerLabel[link.label] += link.value;
                    total += link.value;
                }

                // Find the ratio of the link's value and the size of the flow
                for(k = 0; k < flowLinks.length; k++) {
                    link = flowLinks[k];
                    link.flow = {
                        value: total,
                        labelConcentration: totalPerLabel[link.label] / total,
                        concentration: link.value / total,
                        links: flowLinks
                    };
                    if(link.concentrationscale) {
                        link.color = tinycolor(link.concentrationscale(link.flow.labelConcentration));
                    }
                }
            }

            // Gather statistics of all links at current node
            let totalOutflow = 0;
            for(j = 0; j < node.sourceLinks.length; j++) {
                totalOutflow += node.sourceLinks[j].value;
            }
            for(j = 0; j < node.sourceLinks.length; j++) {
                link = node.sourceLinks[j];
                link.concentrationOut = link.value / totalOutflow;
            }

            let totalInflow = 0;
            for(j = 0; j < node.targetLinks.length; j++) {
                totalInflow += node.targetLinks[j].value;
            }

            for(j = 0; j < node.targetLinks.length; j++) {
                link = node.targetLinks[j];
                link.concenrationIn = link.value / totalInflow;
            }
        }
    }
    computeLinkConcentrations();

    // Push any overlapping nodes down.
    function resolveCollisionsTopToBottom(columns: any) {
        columns.forEach((nodes: any) => {
            let node;
            let dy;
            let y = 0;
            const n = nodes.length;
            let i;
            nodes.sort((a: any, b: any) => a.y0 - b.y0);
            for(i = 0; i < n; ++i) {
                node = nodes[i];
                if(node.y0 >= y) {
                    // No overlap
                } else {
                    dy = (y - node.y0);
                    if(dy > 1e-6) node.y0 += dy, node.y1 += dy;
                }
                y = node.y1 + nodePad;
            }
        });
    }

    // Group nodes into columns based on their x position
    function snapToColumns(nodes: any) {
        // Sort nodes by x position
        const orderedNodes = nodes.map((n: any, i: any) => {
            return {
                x0: n.x0,
                index: i
            };
        })
        .sort((a: any, b: any) => a.x0 - b.x0);

        const columns: any[] = [];
        let colNumber = -1;
        let colX; // Position of column
        let lastX = -Infinity; // Position of last node
        let dx;
        for(i = 0; i < orderedNodes.length; i++) {
            const node = nodes[orderedNodes[i].index];
            // If the node does not overlap with the last one
            if(node.x0 > lastX + nodeThickness) {
                // Start a new column
                colNumber += 1;
                colX = node.x0;
            }
            lastX = node.x0;

            // Add node to its associated column
            if(!columns[colNumber]) columns[colNumber] = [];
            (columns[colNumber] as any).push(node);

            // Change node's x position to align it with its column
            dx = colX - node.x0;
            node.x0 += dx, node.x1 += dx;
        }
        return columns;
    }

    // Force node position
    if(trace.node.x.length && trace.node.y.length) {
        for(i = 0; i < Math.min(trace.node.x.length, trace.node.y.length, graph.nodes.length); i++) {
            if(trace.node.x[i] && trace.node.y[i]) {
                const pos = [trace.node.x[i] * width, trace.node.y[i] * height];
                graph.nodes[i].x0 = pos[0] - nodeThickness / 2;
                graph.nodes[i].x1 = pos[0] + nodeThickness / 2;

                const nodeHeight = graph.nodes[i].y1 - graph.nodes[i].y0;
                graph.nodes[i].y0 = pos[1] - nodeHeight / 2;
                graph.nodes[i].y1 = pos[1] + nodeHeight / 2;
            }
        }
        if(trace.arrangement === 'snap') {
            nodes = graph.nodes;
            const columns = snapToColumns(nodes);
            resolveCollisionsTopToBottom(columns);
        }
        // Update links
        sankey.update(graph);
    }

    return {
        circular: circular,
        key: traceIndex,
        trace: trace,
        guid: Lib.randstr(),
        horizontal: horizontal,
        width: width,
        height: height,
        nodePad: trace.node.pad,
        nodeLineColor: trace.node.line.color,
        nodeLineWidth: trace.node.line.width,
        linkLineColor: trace.link.line.color,
        linkLineWidth: trace.link.line.width,
        linkArrowLength: trace.link.arrowlen,
        valueFormat: trace.valueformat,
        valueSuffix: trace.valuesuffix,
        textFont: trace.textfont,
        translateX: domain.x[0] * layout.width + layout.margin.l,
        translateY: layout.height - domain.y[1] * layout.height + layout.margin.t,
        dragParallel: horizontal ? height : width,
        dragPerpendicular: horizontal ? width : height,
        arrangement: trace.arrangement,
        sankey: sankey,
        graph: graph,
        forceLayouts: {},
        interactionState: {
            dragInProgress: false,
            hovered: false
        }
    };
}

function linkModel(d: any, l: any, i: any) {
    const tc = tinycolor(l.color);
    const htc = tinycolor(l.hovercolor);
    const basicKey = l.source.label + '|' + l.target.label;
    const key = basicKey + '__' + i;

    // for event data
    l.trace = d.trace;
    l.curveNumber = d.trace.index;

    return {
        circular: d.circular,
        key: key,
        traceId: d.key,
        pointNumber: l.pointNumber,
        link: l,
        tinyColorHue: Color.tinyRGB(tc),
        tinyColorAlpha: tc.getAlpha(),
        tinyColorHoverHue: Color.tinyRGB(htc),
        tinyColorHoverAlpha: htc.getAlpha(),
        linkPath: linkPath,
        linkLineColor: d.linkLineColor,
        linkLineWidth: d.linkLineWidth,
        linkArrowLength: d.linkArrowLength,
        valueFormat: d.valueFormat,
        valueSuffix: d.valueSuffix,
        sankey: d.sankey,
        parent: d,
        interactionState: d.interactionState,
        flow: l.flow
    };
}

function createCircularClosedPathString(link: any, arrowLen: any) {
    // Using coordinates computed by d3-sankey-circular
    let pathString = '';
    const offset = link.width / 2;
    const coords = link.circularPathData;
    const isSourceBeforeTarget = coords.sourceX + coords.verticalBuffer < coords.targetX;
    const isPathOverlapped = (coords.rightFullExtent - coords.rightLargeArcRadius - arrowLen) <= (coords.leftFullExtent - offset)
     const diff = Math.abs(coords.rightFullExtent- coords.leftFullExtent - offset) < offset ;
    if (link.circularLinkType === 'top') {
        pathString =
            // start at the left of the target node
            'M ' +
            (coords.targetX - arrowLen) + ' ' + (coords.targetY + offset) + ' ' +
            'L ' +
            (coords.rightInnerExtent - arrowLen) + ' ' + (coords.targetY + offset) +
            'A ' +
            (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightSmallArcRadius + offset) + ' 0 0 1 ' +
            (coords.rightFullExtent - offset - arrowLen) + ' ' + (coords.targetY - coords.rightSmallArcRadius) +
            'L ' + (coords.rightFullExtent - offset - arrowLen) + ' ' + coords.verticalRightInnerExtent;

        if (isSourceBeforeTarget && isPathOverlapped) {
            pathString += ' A ' +
                (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightLargeArcRadius + offset) + ' 0 0 1 ' +
                (coords.rightFullExtent + offset - arrowLen - (coords.rightLargeArcRadius - offset)) + ' ' +
                (coords.verticalRightInnerExtent - (coords.rightLargeArcRadius + offset)) +
                ' L ' +
                (coords.rightFullExtent + offset - (coords.rightLargeArcRadius - offset) - arrowLen) + ' ' +
                (coords.verticalRightInnerExtent - (coords.rightLargeArcRadius + offset)) +
                ' A ' +
                (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftLargeArcRadius + offset) + ' 0 0 1 ' +
                (coords.leftFullExtent + offset) + ' ' + coords.verticalRightInnerExtent;  
        } else if (isSourceBeforeTarget) {
            pathString += ' A ' +
                (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightLargeArcRadius - offset) + ' 0 0 0 ' +
                (coords.rightFullExtent - offset - arrowLen - (coords.rightLargeArcRadius - offset)) + ' ' +
                (coords.verticalRightInnerExtent - (coords.rightLargeArcRadius - offset)) +
                ' L ' +
                (coords.leftFullExtent + offset + (coords.rightLargeArcRadius - offset)) + ' ' +
                (coords.verticalRightInnerExtent - (coords.rightLargeArcRadius - offset)) +
                ' A ' +
                (coords.leftLargeArcRadius - offset) + ' ' + (coords.leftLargeArcRadius - offset) + ' 0 0 0 ' +
                (coords.leftFullExtent + offset) + ' ' + coords.verticalLeftInnerExtent;
        } else {
            pathString += ' A ' +
                (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightLargeArcRadius + offset) + ' 0 0 1 ' +
                (coords.rightInnerExtent - arrowLen) + ' ' + (coords.verticalFullExtent - offset) +
                ' L ' +
                coords.leftInnerExtent + ' ' + (coords.verticalFullExtent - offset) +
                ' A ' +
                (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftLargeArcRadius + offset) + ' 0 0 1 ' +
                (coords.leftFullExtent + offset) + ' ' + coords.verticalLeftInnerExtent;
        }

        pathString += ' L ' +
            (coords.leftFullExtent + offset) + ' ' + (coords.sourceY - coords.leftSmallArcRadius) +
            ' A ' +
            (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftSmallArcRadius + offset) + ' 0 0 1 ' +
            coords.leftInnerExtent + ' ' + (coords.sourceY + offset) +
            ' L ' +
            coords.sourceX + ' ' + (coords.sourceY + offset) +

            // Walking back
            ' L ' +
            coords.sourceX + ' ' + (coords.sourceY - offset) +
            ' L ' +
            coords.leftInnerExtent + ' ' + (coords.sourceY - offset) +
            ' A ' +
            (coords.leftLargeArcRadius - offset) + ' ' + (coords.leftSmallArcRadius - offset) + ' 0 0 0 ' +
            (coords.leftFullExtent - offset) + ' ' + (coords.sourceY - coords.leftSmallArcRadius) +
            ' L ' +
            (coords.leftFullExtent - offset) + ' ' + coords.verticalLeftInnerExtent;

        if (isSourceBeforeTarget && isPathOverlapped) {
            pathString += ' A ' +
                (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftSmallArcRadius + offset) + ' 0 0 0 ' +
                (coords.leftFullExtent - offset) + ' ' + (coords.verticalFullExtent + offset) +
                'L' + (coords.rightFullExtent + offset - arrowLen) + ' ' + (coords.verticalFullExtent + offset) +
                ' A ' +
                (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftSmallArcRadius + offset) + ' 0 0 0 ' +
                (coords.rightFullExtent + offset - arrowLen) + ' ' + coords.verticalRightInnerExtent;
        } else if (isSourceBeforeTarget) {
            pathString += ' A ' +
                (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftSmallArcRadius + offset) + ' 0 0 1 ' +
                (coords.leftFullExtent + offset) + ' ' + (coords.verticalFullExtent - offset) +
                ' L ' +
                (coords.rightFullExtent - offset - arrowLen) + ' ' + (coords.verticalFullExtent - offset) +
                ' A ' +
                (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftSmallArcRadius + offset) + ' 0 0 1 ' +
                (coords.rightFullExtent + offset - arrowLen) + ' ' + coords.verticalRightInnerExtent;
        } else {
            pathString += ' A ' +
                (coords.leftLargeArcRadius - offset) + ' ' + (coords.leftLargeArcRadius - offset) + ' 0 0 0 ' +
                coords.leftInnerExtent + ' ' + (coords.verticalFullExtent + offset) +
                ' L ' +
                (coords.rightInnerExtent - arrowLen) + ' ' + (coords.verticalFullExtent + offset) +
                ' A ' +
                (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightLargeArcRadius - offset) + ' 0 0 0 ' +
                (coords.rightFullExtent + offset - arrowLen) + ' ' + coords.verticalRightInnerExtent;
        }

        pathString += ' L ' +
            (coords.rightFullExtent + offset - arrowLen) + ' ' + (coords.targetY - coords.rightSmallArcRadius) +
            ' A ' +
            (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightSmallArcRadius - offset) + ' 0 0 0 ' +
            (coords.rightInnerExtent - arrowLen) + ' ' + (coords.targetY - offset) +
            ' L ' +
            (coords.targetX - arrowLen) + ' ' + (coords.targetY - offset) +
            (arrowLen > 0 ? ' L ' + coords.targetX + ' ' + coords.targetY : '') +
            'Z';
    } else {
        pathString =
            'M ' + (coords.targetX - arrowLen) + ' ' + (coords.targetY - offset) + ' ' +
            ' L ' + (coords.rightInnerExtent - arrowLen) + ' ' + (coords.targetY - offset) +
            ' A ' + (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightSmallArcRadius + offset) + ' 0 0 0 ' + (coords.rightFullExtent - offset - arrowLen) + ' ' + (coords.targetY + coords.rightSmallArcRadius) +
            ' L ' + (coords.rightFullExtent - offset - arrowLen) + ' ' + coords.verticalRightInnerExtent;

        if (isSourceBeforeTarget && isPathOverlapped) {
            pathString += ' A ' + (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightLargeArcRadius + offset) + ' 0 0 0 ' +
                (coords.rightInnerExtent - offset - arrowLen) + ' ' + (coords.verticalFullExtent + offset) +
                ' L ' + (coords.rightFullExtent + offset - arrowLen - (coords.rightLargeArcRadius - offset)) + ' ' + (coords.verticalFullExtent + offset) +
                ' A ' + (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightLargeArcRadius + offset) + ' 0 0 0 ' +
                (coords.leftFullExtent + offset) + ' ' + coords.verticalLeftInnerExtent;  
        } else if (isSourceBeforeTarget) {
            pathString += ' A ' + (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightSmallArcRadius - offset) + ' 0 0 1 ' +
                (coords.rightFullExtent - arrowLen - offset - (coords.rightLargeArcRadius - offset)) + ' ' + (coords.verticalFullExtent - offset) +
                ' L ' + (coords.leftFullExtent + offset + (coords.rightLargeArcRadius - offset)) + ' ' + (coords.verticalFullExtent - offset) +
                ' A ' + (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightSmallArcRadius - offset) + ' 0 0 1 ' +
                (coords.leftFullExtent + offset) + ' ' + coords.verticalLeftInnerExtent;
        } else {
            pathString += ' A ' + (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightLargeArcRadius + offset) + ' 0 0 0 ' + (coords.rightInnerExtent - arrowLen) + ' ' + (coords.verticalFullExtent + offset) +
                ' L ' + coords.leftInnerExtent + ' ' + (coords.verticalFullExtent + offset) +
                ' A ' + (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftLargeArcRadius + offset) + ' 0 0 0 ' + (coords.leftFullExtent + offset) + ' ' + coords.verticalLeftInnerExtent;
        }

        pathString += ' L ' + (coords.leftFullExtent + offset) + ' ' + (coords.sourceY + coords.leftSmallArcRadius) +
            ' A ' + (coords.leftLargeArcRadius + offset) + ' ' + (coords.leftSmallArcRadius + offset) + ' 0 0 0 ' + coords.leftInnerExtent + ' ' + (coords.sourceY - offset) +
            ' L ' + coords.sourceX + ' ' + (coords.sourceY - offset) +

            // Walking back
            ' L ' + coords.sourceX + ' ' + (coords.sourceY + offset) +
            ' L ' + coords.leftInnerExtent + ' ' + (coords.sourceY + offset) +
            ' A ' + (coords.leftLargeArcRadius - offset) + ' ' + (coords.leftSmallArcRadius - offset) + ' 0 0 1 ' + (coords.leftFullExtent - offset) + ' ' + (coords.sourceY + coords.leftSmallArcRadius) +
            ' L ' + (coords.leftFullExtent - offset) + ' ' + coords.verticalLeftInnerExtent;

        if (isSourceBeforeTarget && isPathOverlapped) {
            pathString +=
                ' A ' + (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightSmallArcRadius - offset) + ' 0 0 1 ' +
                (coords.leftFullExtent - offset - (coords.rightLargeArcRadius - offset)) + ' ' + (coords.verticalFullExtent - offset) +
                ' L ' + (coords.rightFullExtent + offset - arrowLen + (coords.rightLargeArcRadius - offset)) + ' ' + (coords.verticalFullExtent - offset) +
                ' A ' + (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightSmallArcRadius - offset) + ' 0 0 1 ' +
                (coords.rightFullExtent + offset - arrowLen) + ' ' + coords.verticalRightInnerExtent; 
        } else if (isSourceBeforeTarget) {
            pathString += ' A ' + (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightLargeArcRadius + offset) + ' 0 0 0 ' + (coords.leftFullExtent + offset) + ' ' + (coords.verticalFullExtent + offset) +
                ' L ' + (coords.rightFullExtent - arrowLen - offset) + ' ' + (coords.verticalFullExtent + offset) +
                ' A ' + (coords.rightLargeArcRadius + offset) + ' ' + (coords.rightLargeArcRadius + offset) + ' 0 0 0 ' + (coords.rightFullExtent + offset - arrowLen) + ' ' + coords.verticalRightInnerExtent;
        } else {
            pathString += ' A ' + (coords.leftLargeArcRadius - offset) + ' ' + (coords.leftLargeArcRadius - offset) + ' 0 0 1 ' + coords.leftInnerExtent + ' ' + (coords.verticalFullExtent - offset) +
                ' L ' + (coords.rightInnerExtent - arrowLen) + ' ' + (coords.verticalFullExtent - offset) +
                ' A ' + (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightLargeArcRadius - offset) + ' 0 0 1 ' + (coords.rightFullExtent + offset - arrowLen) + ' ' + coords.verticalRightInnerExtent;
        }

        pathString += ' L ' + (coords.rightFullExtent + offset - arrowLen) + ' ' + (coords.targetY + coords.rightSmallArcRadius) +
            ' A ' + (coords.rightLargeArcRadius - offset) + ' ' + (coords.rightSmallArcRadius - offset) + ' 0 0 1 ' + (coords.rightInnerExtent - arrowLen) + ' ' + (coords.targetY + offset) +
            ' L ' + (coords.targetX - arrowLen) + ' ' + (coords.targetY + offset) + (arrowLen > 0 ? ' L ' + coords.targetX + ' ' + coords.targetY : '') + 'Z';
    }
    return pathString;
}

function linkPath() {
    const curvature = 0.5;
    function path(d: any) {
        let arrowLen = d.linkArrowLength;
        if(d.link.circular) {
            return createCircularClosedPathString(d.link, arrowLen);
        } else {
            const maxArrowLength = Math.abs((d.link.target.x0 - d.link.source.x1) / 2);
            if(arrowLen > maxArrowLength) {
                arrowLen = maxArrowLength;
            }
            const x0 = d.link.source.x1;
            const x1 = d.link.target.x0 - arrowLen;
            const xi = interpolateNumber(x0, x1);
            const x2 = xi(curvature);
            const x3 = xi(1 - curvature);
            const y0a = d.link.y0 - d.link.width / 2;
            const y0b = d.link.y0 + d.link.width / 2;
            const y1a = d.link.y1 - d.link.width / 2;
            const y1b = d.link.y1 + d.link.width / 2;
            const start = 'M' + x0 + ',' + y0a;
            const upperCurve = 'C' + x2 + ',' + y0a +
                ' ' + x3 + ',' + y1a +
                ' ' + x1 + ',' + y1a;
            const lowerCurve = 'C' + x3 + ',' + y1b +
                ' ' + x2 + ',' + y0b +
                ' ' + x0 + ',' + y0b;

            let rightEnd = arrowLen > 0 ? 'L' + (x1 + arrowLen) + ',' + (y1a + d.link.width / 2) : '';
            rightEnd += 'L' + x1 + ',' + y1b;
            return start + upperCurve + rightEnd + lowerCurve + 'Z';
        }
    }
    return path;
}

function nodeModel(d: any, n: any) {
    const tc = tinycolor(n.color);
    const zoneThicknessPad = c.nodePadAcross;
    const zoneLengthPad = d.nodePad / 2;
    n.dx = n.x1 - n.x0;
    n.dy = n.y1 - n.y0;
    const visibleThickness = n.dx;
    const visibleLength = Math.max(0.5, n.dy);

    let key = 'node_' + n.pointNumber;
    // If it's a group, it's mutable and should be unique
    if(n.group) {
        key = Lib.randstr();
    }

    // for event data
    n.trace = d.trace;
    n.curveNumber = d.trace.index;

    return {
        index: n.pointNumber,
        key: key,
        partOfGroup: n.partOfGroup || false,
        group: n.group,
        traceId: d.key,
        trace: d.trace,
        node: n,
        nodePad: d.nodePad,
        nodeLineColor: d.nodeLineColor,
        nodeLineWidth: d.nodeLineWidth,
        textFont: d.textFont,
        size: d.horizontal ? d.height : d.width,
        visibleWidth: Math.ceil(visibleThickness),
        visibleHeight: visibleLength,
        zoneX: -zoneThicknessPad,
        zoneY: -zoneLengthPad,
        zoneWidth: visibleThickness + 2 * zoneThicknessPad,
        zoneHeight: visibleLength + 2 * zoneLengthPad,
        labelY: d.horizontal ? n.dy / 2 + 1 : n.dx / 2 + 1,
        left: n.originalLayer === 1,
        sizeAcross: d.width,
        forceLayouts: d.forceLayouts,
        horizontal: d.horizontal,
        darkBackground: tc.getBrightness() <= 128,
        tinyColorHue: Color.tinyRGB(tc),
        tinyColorAlpha: tc.getAlpha(),
        valueFormat: d.valueFormat,
        valueSuffix: d.valueSuffix,
        sankey: d.sankey,
        graph: d.graph,
        arrangement: d.arrangement,
        uniqueNodeLabelPathId: [d.guid, d.key, key].join('_'),
        interactionState: d.interactionState,
        figure: d
    };
}

// rendering snippets

function updateNodePositions(sankeyNode: any) {
    sankeyNode
        .attr('transform', function(d: any) {
            return strTranslate(d.node.x0.toFixed(3), (d.node.y0).toFixed(3));
        });
}

function updateNodeShapes(sankeyNode: any) {
    sankeyNode.call(updateNodePositions);
}

function updateShapes(sankeyNode: any, sankeyLink: any) {
    sankeyNode.call(updateNodeShapes);
    sankeyLink.attr('d', linkPath());
}

function sizeNode(rect: any) {
    rect
      .attr('width', function(d: any) {return d.node.x1 - d.node.x0;})
      .attr('height', function(d: any) {return d.visibleHeight;});
}

function salientEnough(d: any) {return (d.link.width > 1 || d.linkLineWidth > 0);}

function sankeyTransform(d: any) {
    const offset = strTranslate(d.translateX, d.translateY);
    return offset + (d.horizontal ? 'matrix(1 0 0 1 0 0)' : 'matrix(0 1 1 0 0 0)');
}

// event handling

function attachPointerEvents(selection: any, sankey: any, eventSet: any) {
    selection
        .on('.basic', null) // remove any preexisting handlers
        .on('mouseover.basic', function(this: any, event: any, d: any) {
            if(!d.interactionState.dragInProgress && !d.partOfGroup) {
                eventSet.hover(this, d, sankey);
                d.interactionState.hovered = [this, d];
            }
        })
        .on('mousemove.basic', function(this: any, event: any, d: any) {
            if(!d.interactionState.dragInProgress && !d.partOfGroup) {
                eventSet.follow(this, d);
                d.interactionState.hovered = [this, d];
            }
        })
        .on('mouseout.basic', function(this: any, event: any, d: any) {
            if(!d.interactionState.dragInProgress && !d.partOfGroup) {
                eventSet.unhover(this, d, sankey);
                d.interactionState.hovered = false;
            }
        })
        .on('click.basic', function(this: any, event: any, d: any) {
            if(d.interactionState.hovered) {
                eventSet.unhover(this, d, sankey);
                d.interactionState.hovered = false;
            }
            if(!d.interactionState.dragInProgress && !d.partOfGroup) {
                eventSet.select(this, d, sankey);
            }
        });
}

function attachDragHandler(sankeyNode: any, sankeyLink: any, callbacks: any, gd: any) {
    const dragBehavior = d3Drag()
        .origin(function(d: any) {
            return {
                x: d.node.x0 + d.visibleWidth / 2,
                y: d.node.y0 + d.visibleHeight / 2
            };
        })

        .on('start', function(this: any, event: any, d: any) {
            if(d.arrangement === 'fixed') return;
            Lib.ensureSingle(gd._fullLayout._infolayer, 'g', 'dragcover', function(s: any) {
                gd._fullLayout._dragCover = s;
            });
            Lib.raiseToTop(this);
            d.interactionState.dragInProgress = d.node;

            saveCurrentDragPosition(d.node);
            if(d.interactionState.hovered) {
                callbacks.nodeEvents.unhover.apply(0, d.interactionState.hovered);
                d.interactionState.hovered = false;
            }
            if(d.arrangement === 'snap') {
                const forceKey = d.traceId + '|' + d.key;
                if(d.forceLayouts[forceKey]) {
                    d.forceLayouts[forceKey].alpha(1);
                } else { // make a forceLayout if needed
                    attachForce(sankeyNode, forceKey, d, gd);
                }
                startForce(sankeyNode, sankeyLink, d, forceKey, gd);
            }
        })

        .on('drag', function(this: any, event: any, d: any) {
            if(d.arrangement === 'fixed') return;
            const x = event.x;
            let y = event.y;
            if(d.arrangement === 'snap') {
                d.node.x0 = x - d.visibleWidth / 2;
                d.node.x1 = x + d.visibleWidth / 2;
                d.node.y0 = y - d.visibleHeight / 2;
                d.node.y1 = y + d.visibleHeight / 2;
            } else {
                if(d.arrangement === 'freeform') {
                    d.node.x0 = x - d.visibleWidth / 2;
                    d.node.x1 = x + d.visibleWidth / 2;
                }
                y = Math.max(0, Math.min(d.size - d.visibleHeight / 2, y));
                d.node.y0 = y - d.visibleHeight / 2;
                d.node.y1 = y + d.visibleHeight / 2;
            }

            saveCurrentDragPosition(d.node);
            if(d.arrangement !== 'snap') {
                d.sankey.update(d.graph);
                updateShapes(sankeyNode.filter(sameLayer(d)), sankeyLink);
            }
        })

        .on('end', function(this: any, event: any, d: any) {
            if(d.arrangement === 'fixed') return;
            d.interactionState.dragInProgress = false;
            for(let i = 0; i < d.node.childrenNodes.length; i++) {
                d.node.childrenNodes[i].x = d.node.x;
                d.node.childrenNodes[i].y = d.node.y;
            }
            if(d.arrangement !== 'snap') persistFinalNodePositions(d, gd);
        });

    sankeyNode
        .on('.drag', null) // remove possible previous handlers
        .call(dragBehavior);
}

function attachForce(sankeyNode: any, forceKey: any, d: any, gd: any) {
    // Attach force to nodes in the same column (same x coordinate)
    switchToForceFormat(d.graph.nodes);
    const nodes = d.graph.nodes
        .filter((n: any) => n.originalX === d.node.originalX)
        // Filter out children
        .filter((n: any) => !n.partOfGroup);
    d.forceLayouts[forceKey] = d3Force.forceSimulation(nodes)
        .alphaDecay(0)
        .force('collide', d3Force.forceCollide()
            .radius(function(n: any) {return n.dy / 2 + d.nodePad / 2;})
            .strength(1)
            .iterations(c.forceIterations))
        // @ts-expect-error snappingForce accepts variable args
        .force('constrain', snappingForce(sankeyNode, forceKey, nodes, d, gd))
        .stop();
}

function startForce(sankeyNode: any, sankeyLink: any, d: any, forceKey: any, gd: any) {
    window.requestAnimationFrame(function faster() {
        let i;
        for(i = 0; i < c.forceTicksPerFrame; i++) {
            d.forceLayouts[forceKey].tick();
        }

        const nodes = d.graph.nodes;
        switchToSankeyFormat(nodes);

        d.sankey.update(d.graph);
        updateShapes(sankeyNode.filter(sameLayer(d)), sankeyLink);

        if(d.forceLayouts[forceKey].alpha() > 0) {
            window.requestAnimationFrame(faster);
        } else {
            // Make sure the final x position is equal to its original value
            // because the force simulation will have numerical error
            const x = d.node.originalX;
            d.node.x0 = x - d.visibleWidth / 2;
            d.node.x1 = x + d.visibleWidth / 2;

            persistFinalNodePositions(d, gd);
        }
    });
}

function snappingForce(sankeyNode: any, forceKey: any, nodes: any, d: any) {
    return function _snappingForce() {
        let maxVelocity = 0;
        for(let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if(n === d.interactionState.dragInProgress) { // constrain node position to the dragging pointer
                n.x = n.lastDraggedX;
                n.y = n.lastDraggedY;
            } else {
                n.vx = (n.originalX - n.x) / c.forceTicksPerFrame; // snap to layer
                n.y = Math.min(d.size - n.dy / 2, Math.max(n.dy / 2, n.y)); // constrain to extent
            }
            maxVelocity = Math.max(maxVelocity, Math.abs(n.vx), Math.abs(n.vy));
        }
        if(!d.interactionState.dragInProgress && maxVelocity < 0.1 && d.forceLayouts[forceKey].alpha() > 0) {
            d.forceLayouts[forceKey].alpha(0); // This will stop the animation loop
        }
    };
}

// basic data utilities

function persistFinalNodePositions(d: any, gd: any) {
    const x: any[] = [];
    const y: any[] = [];
    for(let i = 0; i < d.graph.nodes.length; i++) {
        const nodeX = (d.graph.nodes[i].x0 + d.graph.nodes[i].x1) / 2;
        const nodeY = (d.graph.nodes[i].y0 + d.graph.nodes[i].y1) / 2;
        x.push(nodeX / d.figure.width);
        y.push(nodeY / d.figure.height);
    }
    Registry.call('_guiRestyle', gd, {
        'node.x': [x],
        'node.y': [y]
    }, d.trace.index)
    .then(function() {
        if(gd._fullLayout._dragCover) gd._fullLayout._dragCover.remove();
    });
}

function persistOriginalPlace(nodes: any) {
    const distinctLayerPositions: any[] = [];
    let i;
    for(i = 0; i < nodes.length; i++) {
        nodes[i].originalX = (nodes[i].x0 + nodes[i].x1) / 2;
        nodes[i].originalY = (nodes[i].y0 + nodes[i].y1) / 2;
        if(distinctLayerPositions.indexOf(nodes[i].originalX) === -1) {
            distinctLayerPositions.push(nodes[i].originalX);
        }
    }
    distinctLayerPositions.sort((a, b) => a - b);
    for(i = 0; i < nodes.length; i++) {
        nodes[i].originalLayerIndex = distinctLayerPositions.indexOf(nodes[i].originalX);
        nodes[i].originalLayer = nodes[i].originalLayerIndex / (distinctLayerPositions.length - 1);
    }
}

function saveCurrentDragPosition(d: any) {
    d.lastDraggedX = d.x0 + d.dx / 2;
    d.lastDraggedY = d.y0 + d.dy / 2;
}

function sameLayer(d: any) {
    return function(n: any) {return n.node.originalX === d.node.originalX;};
}

function switchToForceFormat(nodes: any) {
    // force uses x, y as centers
    for(let i = 0; i < nodes.length; i++) {
        nodes[i].y = (nodes[i].y0 + nodes[i].y1) / 2;
        nodes[i].x = (nodes[i].x0 + nodes[i].x1) / 2;
    }
}

function switchToSankeyFormat(nodes: any) {
    // sankey uses x0, x1, y0, y1
    for(let i = 0; i < nodes.length; i++) {
        nodes[i].y0 = nodes[i].y - nodes[i].dy / 2;
        nodes[i].y1 = nodes[i].y0 + nodes[i].dy;

        nodes[i].x0 = nodes[i].x - nodes[i].dx / 2;
        nodes[i].x1 = nodes[i].x0 + nodes[i].dx;
    }
}

export default function(gd: any, svg: any, calcData: any, layout: any, callbacks: any) {
    const isStatic = gd._context.staticPlot;

    // To prevent animation on first render
    let firstRender = false;
    Lib.ensureSingle(gd._fullLayout._infolayer, 'g', 'first-render', function() {
        firstRender = true;
    });

    // To prevent animation on dragging
    const dragcover = gd._fullLayout._dragCover;

    const styledData = calcData
            .filter((d: any) => unwrap(d).trace.visible)
            .map(sankeyModel.bind(null, layout));

    const sankey = svg.selectAll('.' + c.cn.sankey)
        .data(styledData, keyFun);

    sankey.exit()
        .remove();

    const sankeyEnter = sankey.enter()
        .append('g')
        .classed(c.cn.sankey, true)
        .style('box-sizing', 'content-box')
        .style('position', 'absolute')
        .style('left', 0)
        .style('shape-rendering', 'geometricPrecision')
        .style('pointer-events', isStatic ? 'none' : 'auto')
        .attr('transform', sankeyTransform);

    const sankeyMerged = sankey.merge(sankeyEnter);
    sankeyMerged.each(function(d: any, i: any) {
        gd._fullData[i]._sankey = d;
        // Create dragbox if missing
        const dragboxClassName = 'bgsankey-' + d.trace.uid + '-' + i;
        Lib.ensureSingle(gd._fullLayout._draggers, 'rect', dragboxClassName);

        gd._fullData[i]._bgRect = select('.' + dragboxClassName);

        // Style dragbox
        gd._fullData[i]._bgRect
          .style('pointer-events', isStatic ? 'none' : 'all')
          .attr('width', d.width)
          .attr('height', d.height)
          .attr('x', d.translateX)
          .attr('y', d.translateY)
          .classed('bgsankey', true)
          .style('fill', 'transparent')
          .style('stroke-width', 0);
    });

    sankeyMerged.transition()
        .ease(c.ease).duration(c.duration)
        .attr('transform', sankeyTransform);

    const sankeyLinks = sankeyMerged.selectAll('.' + c.cn.sankeyLinks)
        .data(repeat, keyFun);

    const sankeyLinksEnter = sankeyLinks.enter()
        .append('g')
        .classed(c.cn.sankeyLinks, true)
        .style('fill', 'none');

    const sankeyLink = sankeyLinks.merge(sankeyLinksEnter).selectAll('.' + c.cn.sankeyLink)
          .data(function(d: any) {
              const links = d.graph.links;
              return links
                .filter((l: any) => l.value)
                .map(linkModel.bind(null, d));
          }, keyFun);

    const sankeyLinkEnter = sankeyLink
          .enter().append('path')
          .classed(c.cn.sankeyLink, true)
          .call(attachPointerEvents, sankeyMerged, callbacks.linkEvents);

    const sankeyLinkMerged = sankeyLink.merge(sankeyLinkEnter);
    sankeyLinkMerged
        .style('stroke', function(d: any) {
            return salientEnough(d) ? Color.tinyRGB(tinycolor(d.linkLineColor)) : d.tinyColorHue;
        })
        .style('stroke-opacity', function(d: any) {
            return salientEnough(d) ? Color.opacity(d.linkLineColor) : d.tinyColorAlpha;
        })
        .style('fill', function(d: any) {
            return d.tinyColorHue;
        })
        .style('fill-opacity', function(d: any) {
            return d.tinyColorAlpha;
        })
        .style('stroke-width', function(d: any) {
            return salientEnough(d) ? d.linkLineWidth : 1;
        })
        .attr('d', linkPath());

    sankeyLinkMerged
        .style('opacity', function() { return (gd._context.staticPlot || firstRender || dragcover) ? 1 : 0;})
        .transition()
        .ease(c.ease).duration(c.duration)
        .style('opacity', 1);

    sankeyLink.exit()
        .transition()
        .ease(c.ease).duration(c.duration)
        .style('opacity', 0)
        .remove();

    const sankeyNodeSet = sankeyMerged.selectAll('.' + c.cn.sankeyNodeSet)
        .data(repeat, keyFun);

    const sankeyNodeSetEnter = sankeyNodeSet.enter()
        .append('g')
        .classed(c.cn.sankeyNodeSet, true);

    const sankeyNodeSetMerged = sankeyNodeSet.merge(sankeyNodeSetEnter);
    sankeyNodeSetMerged
        .style('cursor', function(d: any) {
            switch(d.arrangement) {
                case 'fixed': return 'default';
                case 'perpendicular': return 'ns-resize';
                default: return 'move';
            }
        });

    const sankeyNode = sankeyNodeSetMerged.selectAll('.' + c.cn.sankeyNode)
        .data(function(d: any) {
            const nodes = d.graph.nodes;
            persistOriginalPlace(nodes);
            return nodes
              .map(nodeModel.bind(null, d));
        }, keyFun);

    const sankeyNodeEnter = sankeyNode.enter()
        .append('g')
        .classed(c.cn.sankeyNode, true)
        .call(updateNodePositions)
        .style('opacity', function(n: any) { return ((gd._context.staticPlot || firstRender) && !n.partOfGroup) ? 1 : 0;});

    const sankeyNodeMerged = sankeyNode.merge(sankeyNodeEnter);
    sankeyNodeMerged
        .call(attachPointerEvents, sankeyMerged, callbacks.nodeEvents)
        .call(attachDragHandler, sankeyLinkMerged, callbacks, gd); // has to be here as it binds sankeyLink

    sankeyNodeMerged
        .transition()
        .ease(c.ease).duration(c.duration)
        .call(updateNodePositions)
        .style('opacity', function(n: any) { return n.partOfGroup ? 0 : 1;});

    sankeyNode.exit()
        .transition()
        .ease(c.ease).duration(c.duration)
        .style('opacity', 0)
        .remove();

    const nodeRect = sankeyNodeMerged.selectAll('.' + c.cn.nodeRect)
        .data(repeat);

    const nodeRectEnter = nodeRect.enter()
        .append('rect')
        .classed(c.cn.nodeRect, true)
        .call(sizeNode);

    const nodeRectMerged = nodeRect.merge(nodeRectEnter);
    nodeRectMerged
        .style('stroke-width', function(d: any) {return d.nodeLineWidth;})
        .style('stroke', function(d: any) {return Color.tinyRGB(tinycolor(d.nodeLineColor));})
        .style('stroke-opacity', function(d: any) {return Color.opacity(d.nodeLineColor);})
        .style('fill', function(d: any) {return d.tinyColorHue;})
        .style('fill-opacity', function(d: any) {return d.tinyColorAlpha;});

    nodeRectMerged.transition()
        .ease(c.ease).duration(c.duration)
        .call(sizeNode);

    const nodeLabel = sankeyNodeMerged.selectAll('.' + c.cn.nodeLabel)
        .data(repeat);

    const nodeLabelEnter = nodeLabel.enter()
        .append('text')
        .classed(c.cn.nodeLabel, true)
        .style('cursor', 'default');

    nodeLabel.merge(nodeLabelEnter)
        .attr('data-notex', 1) // prohibit tex interpretation until we can handle tex and regular text together
        .text(function(d: any) { return d.node.label; })
        .each(function(this: any, d: any) {
            const e = select(this);
            font(e, d.textFont);
            svgTextUtils.convertToTspans(e, gd);
        })
        .attr('text-anchor', function(d: any) {
            return (d.horizontal && d.left) ? 'end' : 'start';
        })
        .attr('transform', function(this: any, d: any) {
            const e = select(this);
            // how much to shift a multi-line label to center it vertically.
            const nLines = svgTextUtils.lineCount(e);
            const blockHeight = d.textFont.size * (
                (nLines - 1) * LINE_SPACING - CAP_SHIFT
            );

            let posX = d.nodeLineWidth / 2 + TEXTPAD;
            const posY = ((d.horizontal ? d.visibleHeight : d.visibleWidth) - blockHeight) / 2;
            if(d.horizontal) {
                if(d.left) {
                    posX = -posX;
                } else {
                    posX += d.visibleWidth;
                }
            }

            const flipText = d.horizontal ? '' : (
                'scale(-1,1)' + strRotate(90)
            );

            return strTranslate(
                d.horizontal ? posX : posY,
                d.horizontal ? posY : posX
            ) + flipText;
        });

    nodeLabel
        .transition()
        .ease(c.ease).duration(c.duration);
}
