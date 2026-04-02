export default function selectPoints(searchInfo: any, selectionTester: any) {
    const cd = searchInfo.cd;
    const selection = [];
    const fullData = cd[0].trace;

    const nodes = fullData._sankey.graph.nodes;

    for(let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if(node.partOfGroup) continue; // Those are invisible

        // Position of node's centroid
        const pos = [(node.x0 + node.x1) / 2, (node.y0 + node.y1) / 2];

        // Swap x and y if trace is vertical
        if(fullData.orientation === 'v') pos.reverse();

        if(selectionTester && selectionTester.contains(pos, false, i, searchInfo)) {
            selection.push({
                pointNumber: node.pointNumber
                // TODO: add eventData
            });
        }
    }
    return selection;
}
