import tarjan from 'strongly-connected-components';
import Lib from '../../lib/index.js';
import _gup from '../../lib/gup.js';
const { wrap } = _gup;
import Colorscale from '../../components/colorscale/index.js';
const isArrayOrTypedArray = Lib.isArrayOrTypedArray;
const isIndex = Lib.isIndex;
function convertToD3Sankey(trace) {
    const nodeSpec = trace.node;
    const linkSpec = trace.link;
    const links = [];
    const hasLinkColorArray = isArrayOrTypedArray(linkSpec.color);
    const hasLinkHoverColorArray = isArrayOrTypedArray(linkSpec.hovercolor);
    const hasLinkCustomdataArray = isArrayOrTypedArray(linkSpec.customdata);
    const linkedNodes = {};
    const components = {};
    const componentCount = linkSpec.colorscales.length;
    let i;
    for (i = 0; i < componentCount; i++) {
        const cscale = linkSpec.colorscales[i];
        // @ts-expect-error extractScale accepts optional 2nd arg
        const specs = Colorscale.extractScale(cscale, { cLetter: 'c' });
        const scale = Colorscale.makeColorScaleFunc(specs);
        components[cscale.label] = scale;
    }
    let maxNodeId = 0;
    for (i = 0; i < linkSpec.value.length; i++) {
        if (linkSpec.source[i] > maxNodeId)
            maxNodeId = linkSpec.source[i];
        if (linkSpec.target[i] > maxNodeId)
            maxNodeId = linkSpec.target[i];
    }
    const nodeCount = maxNodeId + 1;
    trace.node._count = nodeCount;
    // Group nodes
    let j;
    const groups = trace.node.groups;
    const groupLookup = {};
    for (i = 0; i < groups.length; i++) {
        const group = groups[i];
        // Build a lookup table to quickly find in which group a node is
        for (j = 0; j < group.length; j++) {
            const nodeIndex = group[j];
            const groupIndex = nodeCount + i;
            if (groupLookup.hasOwnProperty(nodeIndex)) {
                Lib.warn('Node ' + nodeIndex + ' is already part of a group.');
            }
            else {
                groupLookup[nodeIndex] = groupIndex;
            }
        }
    }
    // Process links
    const groupedLinks = {
        source: [],
        target: []
    };
    for (i = 0; i < linkSpec.value.length; i++) {
        const val = linkSpec.value[i];
        // remove negative values, but keep zeros with special treatment
        let source = linkSpec.source[i];
        let target = linkSpec.target[i];
        if (!(val > 0 && isIndex(source, nodeCount) && isIndex(target, nodeCount))) {
            continue;
        }
        // Remove links that are within the same group
        if (groupLookup.hasOwnProperty(source) && groupLookup.hasOwnProperty(target) && groupLookup[source] === groupLookup[target]) {
            continue;
        }
        // if link targets a node in the group, relink target to that group
        if (groupLookup.hasOwnProperty(target)) {
            target = groupLookup[target];
        }
        // if link originates from a node in a group, relink source to that group
        if (groupLookup.hasOwnProperty(source)) {
            source = groupLookup[source];
        }
        source = +source;
        target = +target;
        linkedNodes[source] = linkedNodes[target] = true;
        let label = '';
        if (linkSpec.label && linkSpec.label[i])
            label = linkSpec.label[i];
        let concentrationscale = null;
        if (label && components.hasOwnProperty(label))
            concentrationscale = components[label];
        links.push({
            pointNumber: i,
            label: label,
            color: hasLinkColorArray ? linkSpec.color[i] : linkSpec.color,
            hovercolor: hasLinkHoverColorArray ? linkSpec.hovercolor[i] : linkSpec.hovercolor,
            customdata: hasLinkCustomdataArray ? linkSpec.customdata[i] : linkSpec.customdata,
            concentrationscale: concentrationscale,
            source: source,
            target: target,
            value: +val
        });
        groupedLinks.source.push(source);
        groupedLinks.target.push(target);
    }
    // Process nodes
    const totalCount = nodeCount + groups.length;
    const hasNodeColorArray = isArrayOrTypedArray(nodeSpec.color);
    const hasNodeCustomdataArray = isArrayOrTypedArray(nodeSpec.customdata);
    const nodes = [];
    for (i = 0; i < totalCount; i++) {
        if (!linkedNodes[i])
            continue;
        const l = nodeSpec.label[i];
        nodes.push({
            group: (i > nodeCount - 1),
            childrenNodes: [],
            pointNumber: i,
            label: l,
            color: hasNodeColorArray ? nodeSpec.color[i] : nodeSpec.color,
            customdata: hasNodeCustomdataArray ? nodeSpec.customdata[i] : nodeSpec.customdata
        });
    }
    // Check if we have circularity on the resulting graph
    let circular = false;
    if (circularityPresent(totalCount, groupedLinks.source, groupedLinks.target)) {
        circular = true;
    }
    return {
        circular: circular,
        links: links,
        nodes: nodes,
        // Data structure for groups
        groups: groups,
        groupLookup: groupLookup
    };
}
function circularityPresent(nodeLen, sources, targets) {
    const nodes = Lib.init2dArray(nodeLen, 0);
    for (let i = 0; i < Math.min(sources.length, targets.length); i++) {
        if (Lib.isIndex(sources[i], nodeLen) && Lib.isIndex(targets[i], nodeLen)) {
            if (sources[i] === targets[i]) {
                return true; // self-link which is also a scc of one
            }
            nodes[sources[i]].push(targets[i]);
        }
    }
    const scc = tarjan(nodes);
    // Tarján's strongly connected components algorithm coded by Mikola Lysenko
    // returns at least one non-singular component if there's circularity in the graph
    return scc.components.some(function (c) {
        return c.length > 1;
    });
}
export default function calc(gd, trace) {
    const result = convertToD3Sankey(trace);
    return wrap({
        circular: result.circular,
        _nodes: result.nodes,
        _links: result.links,
        // Data structure for grouping
        _groups: result.groups,
        _groupLookup: result.groupLookup,
    });
}
