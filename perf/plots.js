// Plot definitions for performance testing.
// Each export is a { data, layout } object representing a representative plot.

function range(n) {
    var arr = [];
    for(var i = 0; i < n; i++) arr.push(i);
    return arr;
}

function randomData(n, scale) {
    scale = scale || 1;
    return range(n).map(function() { return Math.random() * scale; });
}

// 5 bar traces, 200 points each
exports['bar-1k'] = {
    data: range(5).map(function(i) {
        return {
            type: 'bar',
            name: 'Series ' + (i + 1),
            x: range(200),
            y: randomData(200, 100),
        };
    }),
    layout: {
        title: 'Bar chart (5×200)',
        barmode: 'group',
    },
};

// 3 scatter traces, 3000+ points each
exports['scatter-10k'] = {
    data: range(3).map(function(i) {
        var n = 3500;
        return {
            type: 'scatter',
            mode: 'lines',
            name: 'Line ' + (i + 1),
            x: range(n),
            y: randomData(n, 50),
        };
    }),
    layout: {
        title: 'Scatter (3×3500)',
    },
};

// Dual-axis: scatter on y1, bar on y2
exports['dual-axis'] = {
    data: [
        {
            type: 'scatter',
            mode: 'lines',
            name: 'Ratio',
            x: range(500),
            y: randomData(500, 1),
            yaxis: 'y',
        },
        {
            type: 'bar',
            name: 'Count',
            x: range(500),
            y: randomData(500, 1000),
            yaxis: 'y2',
        },
    ],
    layout: {
        title: 'Dual axis (scatter + bar)',
        yaxis: { title: 'Ratio' },
        yaxis2: { title: 'Count', overlaying: 'y', side: 'right' },
    },
};

// 20 traces with legend
exports['many-traces'] = {
    data: range(20).map(function(i) {
        return {
            type: 'scatter',
            mode: 'lines',
            name: 'Trace ' + (i + 1),
            x: range(100),
            y: randomData(100, 10 + i),
        };
    }),
    layout: {
        title: '20 traces with legend',
        showlegend: true,
    },
};
