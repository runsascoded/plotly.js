/**
 * Auto-generated from plot-schema.json
 * DO NOT EDIT — regenerate with: node tasks/gen-schema-types.mjs
 */

export interface ScatterTrace {
    type: 'scatter';
    alignmentgroup?: string;
    cliponaxis?: boolean;
    connectgaps?: boolean;
    customdata?: any[];
    dx?: number;
    dy?: number;
    error_x?: {
        array?: any[];
        arrayminus?: any[];
        color?: string;
        copy_ystyle?: boolean;
        symmetric?: boolean;
        thickness?: number;
        traceref?: number;
        tracerefminus?: number;
        type?: 'percent' | 'constant' | 'sqrt' | 'data';
        value?: number;
        valueminus?: number;
        visible?: boolean;
        width?: number;
    };
    error_y?: {
        array?: any[];
        arrayminus?: any[];
        color?: string;
        symmetric?: boolean;
        thickness?: number;
        traceref?: number;
        tracerefminus?: number;
        type?: 'percent' | 'constant' | 'sqrt' | 'data';
        value?: number;
        valueminus?: number;
        visible?: boolean;
        width?: number;
    };
    fill?: 'none' | 'tozeroy' | 'tozerox' | 'tonexty' | 'tonextx' | 'toself' | 'tonext';
    fillcolor?: string;
    fillgradient?: {
        colorscale?: string | [number, string][];
        start?: number;
        stop?: number;
        type?: 'radial' | 'horizontal' | 'vertical' | 'none';
    };
    fillpattern?: {
        bgcolor?: string;
        fgcolor?: string;
        fgopacity?: number;
        fillmode?: 'replace' | 'overlay';
        path?: string;
        shape?: '' | '/' | '\' | 'x' | '-' | '|' | '+' | '.';
        size?: number;
        solidity?: number;
    };
    groupnorm?: '' | 'fraction' | 'percent';
    hoverinfo?: string;
    hoverlabel?: {
        align?: 'left' | 'right' | 'auto';
        bgcolor?: string;
        bordercolor?: string;
        font?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        namelength?: number;
        showarrow?: boolean;
    };
    hoveron?: string;
    hovertemplate?: string;
    hovertemplatefallback?: any;
    hovertext?: string;
    ids?: any[];
    legend?: string;
    legendgroup?: string;
    legendgrouptitle?: {
        font?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        text?: string;
    };
    legendrank?: number;
    legendsymbol?: {
        path?: string;
    };
    legendwidth?: number;
    line?: {
        backoff?: number;
        color?: string;
        dash?: string;
        shape?: 'linear' | 'spline' | 'hv' | 'vh' | 'hvh' | 'vhv';
        simplify?: boolean;
        smoothing?: number;
        width?: number;
    };
    marker?: {
        angle?: number;
        angleref?: 'previous' | 'up';
        autocolorscale?: boolean;
        cauto?: boolean;
        cmax?: number;
        cmid?: number;
        cmin?: number;
        color?: string;
        coloraxis?: string;
        colorbar?: {
            bgcolor?: string;
            bordercolor?: string;
            borderwidth?: number;
            dtick?: any;
            exponentformat?: 'none' | 'e' | 'E' | 'power' | 'SI' | 'B' | 'SI extended';
            labelalias?: any;
            len?: number;
            lenmode?: 'fraction' | 'pixels';
            minexponent?: number;
            nticks?: number;
            orientation?: 'h' | 'v';
            outlinecolor?: string;
            outlinewidth?: number;
            separatethousands?: boolean;
            showexponent?: 'all' | 'first' | 'last' | 'none';
            showticklabels?: boolean;
            showtickprefix?: 'all' | 'first' | 'last' | 'none';
            showticksuffix?: 'all' | 'first' | 'last' | 'none';
            thickness?: number;
            thicknessmode?: 'fraction' | 'pixels';
            tick0?: any;
            tickangle?: number;
            tickcolor?: string;
            tickfont?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            tickformat?: string;
            tickformatstops?: {
                items?: {
                    tickformatstop?: {
                        dtickrange?: any[];
                        enabled?: boolean;
                        name?: string;
                        templateitemname?: string;
                        value?: string;
                    };
                };
            };
            ticklabeloverflow?: 'allow' | 'hide past div' | 'hide past domain';
            ticklabelposition?: 'outside' | 'inside' | 'outside top' | 'inside top' | 'outside left' | 'inside left' | 'outside right' | 'inside right' | 'outside bottom' | 'inside bottom';
            ticklabelstep?: number;
            ticklen?: number;
            tickmode?: 'auto' | 'linear' | 'array';
            tickprefix?: string;
            ticks?: 'outside' | 'inside' | '';
            ticksuffix?: string;
            ticktext?: any[];
            tickvals?: any[];
            tickwidth?: number;
            title?: {
                font?: {
                    color?: string;
                    family?: string;
                    lineposition?: string;
                    shadow?: string;
                    size?: number;
                    style?: 'normal' | 'italic';
                    textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                    variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                    weight?: number;
                };
                side?: 'right' | 'top' | 'bottom';
                text?: string;
            };
            x?: number;
            xanchor?: 'left' | 'center' | 'right';
            xpad?: number;
            xref?: 'container' | 'paper';
            y?: number;
            yanchor?: 'top' | 'middle' | 'bottom';
            ypad?: number;
            yref?: 'container' | 'paper';
        };
        colorscale?: string | [number, string][];
        gradient?: {
            color?: string;
            type?: 'radial' | 'horizontal' | 'vertical' | 'none';
        };
        line?: {
            autocolorscale?: boolean;
            cauto?: boolean;
            cmax?: number;
            cmid?: number;
            cmin?: number;
            color?: string;
            coloraxis?: string;
            colorscale?: string | [number, string][];
            reversescale?: boolean;
            width?: number;
        };
        maxdisplayed?: number;
        opacity?: number;
        reversescale?: boolean;
        showscale?: boolean;
        size?: number;
        sizemin?: number;
        sizemode?: 'diameter' | 'area';
        sizeref?: number;
        standoff?: number;
        symbol?: 0 | '0' | 'circle' | 100 | '100' | 'circle-open' | 200 | '200' | 'circle-dot' | 300 | '300' | 'circle-open-dot' | 1 | '1' | 'square' | 101 | '101' | 'square-open' | 201 | '201' | 'square-dot' | 301 | '301' | 'square-open-dot' | 2 | '2' | 'diamond' | 102 | '102' | 'diamond-open' | 202 | '202' | 'diamond-dot' | 302 | '302' | 'diamond-open-dot' | 3 | '3' | 'cross' | 103 | '103' | 'cross-open' | 203 | '203' | 'cross-dot' | 303 | '303' | 'cross-open-dot' | 4 | '4' | 'x' | 104 | '104' | 'x-open' | 204 | '204' | 'x-dot' | 304 | '304' | 'x-open-dot' | 5 | '5' | 'triangle-up' | 105 | '105' | 'triangle-up-open' | 205 | '205' | 'triangle-up-dot' | 305 | '305' | 'triangle-up-open-dot' | 6 | '6' | 'triangle-down' | 106 | '106' | 'triangle-down-open' | 206 | '206' | 'triangle-down-dot' | 306 | '306' | 'triangle-down-open-dot' | 7 | '7' | 'triangle-left' | 107 | '107' | 'triangle-left-open' | 207 | '207' | 'triangle-left-dot' | 307 | '307' | 'triangle-left-open-dot' | 8 | '8' | 'triangle-right' | 108 | '108' | 'triangle-right-open' | 208 | '208' | 'triangle-right-dot' | 308 | '308' | 'triangle-right-open-dot' | 9 | '9' | 'triangle-ne' | 109 | '109' | 'triangle-ne-open' | 209 | '209' | 'triangle-ne-dot' | 309 | '309' | 'triangle-ne-open-dot' | 10 | '10' | 'triangle-se' | 110 | '110' | 'triangle-se-open' | 210 | '210' | 'triangle-se-dot' | 310 | '310' | 'triangle-se-open-dot' | 11 | '11' | 'triangle-sw' | 111 | '111' | 'triangle-sw-open' | 211 | '211' | 'triangle-sw-dot' | 311 | '311' | 'triangle-sw-open-dot' | 12 | '12' | 'triangle-nw' | 112 | '112' | 'triangle-nw-open' | 212 | '212' | 'triangle-nw-dot' | 312 | '312' | 'triangle-nw-open-dot' | 13 | '13' | 'pentagon' | 113 | '113' | 'pentagon-open' | 213 | '213' | 'pentagon-dot' | 313 | '313' | 'pentagon-open-dot' | 14 | '14' | 'hexagon' | 114 | '114' | 'hexagon-open' | 214 | '214' | 'hexagon-dot' | 314 | '314' | 'hexagon-open-dot' | 15 | '15' | 'hexagon2' | 115 | '115' | 'hexagon2-open' | 215 | '215' | 'hexagon2-dot' | 315 | '315' | 'hexagon2-open-dot' | 16 | '16' | 'octagon' | 116 | '116' | 'octagon-open' | 216 | '216' | 'octagon-dot' | 316 | '316' | 'octagon-open-dot' | 17 | '17' | 'star' | 117 | '117' | 'star-open' | 217 | '217' | 'star-dot' | 317 | '317' | 'star-open-dot' | 18 | '18' | 'hexagram' | 118 | '118' | 'hexagram-open' | 218 | '218' | 'hexagram-dot' | 318 | '318' | 'hexagram-open-dot' | 19 | '19' | 'star-triangle-up' | 119 | '119' | 'star-triangle-up-open' | 219 | '219' | 'star-triangle-up-dot' | 319 | '319' | 'star-triangle-up-open-dot' | 20 | '20' | 'star-triangle-down' | 120 | '120' | 'star-triangle-down-open' | 220 | '220' | 'star-triangle-down-dot' | 320 | '320' | 'star-triangle-down-open-dot' | 21 | '21' | 'star-square' | 121 | '121' | 'star-square-open' | 221 | '221' | 'star-square-dot' | 321 | '321' | 'star-square-open-dot' | 22 | '22' | 'star-diamond' | 122 | '122' | 'star-diamond-open' | 222 | '222' | 'star-diamond-dot' | 322 | '322' | 'star-diamond-open-dot' | 23 | '23' | 'diamond-tall' | 123 | '123' | 'diamond-tall-open' | 223 | '223' | 'diamond-tall-dot' | 323 | '323' | 'diamond-tall-open-dot' | 24 | '24' | 'diamond-wide' | 124 | '124' | 'diamond-wide-open' | 224 | '224' | 'diamond-wide-dot' | 324 | '324' | 'diamond-wide-open-dot' | 25 | '25' | 'hourglass' | 125 | '125' | 'hourglass-open' | 26 | '26' | 'bowtie' | 126 | '126' | 'bowtie-open' | 27 | '27' | 'circle-cross' | 127 | '127' | 'circle-cross-open' | 28 | '28' | 'circle-x' | 128 | '128' | 'circle-x-open' | 29 | '29' | 'square-cross' | 129 | '129' | 'square-cross-open' | 30 | '30' | 'square-x' | 130 | '130' | 'square-x-open' | 31 | '31' | 'diamond-cross' | 131 | '131' | 'diamond-cross-open' | 32 | '32' | 'diamond-x' | 132 | '132' | 'diamond-x-open' | 33 | '33' | 'cross-thin' | 133 | '133' | 'cross-thin-open' | 34 | '34' | 'x-thin' | 134 | '134' | 'x-thin-open' | 35 | '35' | 'asterisk' | 135 | '135' | 'asterisk-open' | 36 | '36' | 'hash' | 136 | '136' | 'hash-open' | 236 | '236' | 'hash-dot' | 336 | '336' | 'hash-open-dot' | 37 | '37' | 'y-up' | 137 | '137' | 'y-up-open' | 38 | '38' | 'y-down' | 138 | '138' | 'y-down-open' | 39 | '39' | 'y-left' | 139 | '139' | 'y-left-open' | 40 | '40' | 'y-right' | 140 | '140' | 'y-right-open' | 41 | '41' | 'line-ew' | 141 | '141' | 'line-ew-open' | 42 | '42' | 'line-ns' | 142 | '142' | 'line-ns-open' | 43 | '43' | 'line-ne' | 143 | '143' | 'line-ne-open' | 44 | '44' | 'line-nw' | 144 | '144' | 'line-nw-open' | 45 | '45' | 'arrow-up' | 145 | '145' | 'arrow-up-open' | 46 | '46' | 'arrow-down' | 146 | '146' | 'arrow-down-open' | 47 | '47' | 'arrow-left' | 147 | '147' | 'arrow-left-open' | 48 | '48' | 'arrow-right' | 148 | '148' | 'arrow-right-open' | 49 | '49' | 'arrow-bar-up' | 149 | '149' | 'arrow-bar-up-open' | 50 | '50' | 'arrow-bar-down' | 150 | '150' | 'arrow-bar-down-open' | 51 | '51' | 'arrow-bar-left' | 151 | '151' | 'arrow-bar-left-open' | 52 | '52' | 'arrow-bar-right' | 152 | '152' | 'arrow-bar-right-open' | 53 | '53' | 'arrow' | 153 | '153' | 'arrow-open' | 54 | '54' | 'arrow-wide' | 154 | '154' | 'arrow-wide-open';
    };
    meta?: any;
    mode?: string;
    name?: string;
    offsetgroup?: string;
    opacity?: number;
    orientation?: 'v' | 'h';
    selected?: {
        marker?: {
            color?: string;
            opacity?: number;
            size?: number;
        };
        textfont?: {
            color?: string;
        };
    };
    selectedpoints?: any;
    showlegend?: boolean;
    stackgaps?: 'infer zero' | 'interpolate';
    stackgroup?: string;
    stream?: {
        maxpoints?: number;
        token?: string;
    };
    text?: string;
    textfont?: {
        color?: string;
        family?: string;
        lineposition?: string;
        shadow?: string;
        size?: number;
        style?: 'normal' | 'italic';
        textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
        variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
        weight?: number;
    };
    textposition?: 'top left' | 'top center' | 'top right' | 'middle left' | 'middle center' | 'middle right' | 'bottom left' | 'bottom center' | 'bottom right';
    texttemplate?: string;
    texttemplatefallback?: any;
    type?: any;
    unselected?: {
        marker?: {
            color?: string;
            opacity?: number;
            size?: number;
        };
        textfont?: {
            color?: string;
        };
    };
    visible?: true | false | 'legendonly';
    x?: any[];
    x0?: any;
    xaxis?: string;
    xhoverformat?: string;
    xperiod?: any;
    xperiod0?: any;
    xperiodalignment?: 'start' | 'middle' | 'end';
    y?: any[];
    y0?: any;
    yaxis?: string;
    yhoverformat?: string;
    yperiod?: any;
    yperiod0?: any;
    yperiodalignment?: 'start' | 'middle' | 'end';
    zorder?: number;
}

export interface SchemaLayout {
    activeselection?: {
        fillcolor?: string;
        opacity?: number;
    };
    activeshape?: {
        fillcolor?: string;
        opacity?: number;
    };
    annotations?: {
        items?: {
            annotation?: {
                align?: 'left' | 'center' | 'right';
                arrowcolor?: string;
                arrowhead?: number;
                arrowside?: string;
                arrowsize?: number;
                arrowwidth?: number;
                ax?: any;
                axref?: 'pixel' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/';
                ay?: any;
                ayref?: 'pixel' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
                bgcolor?: string;
                bordercolor?: string;
                borderpad?: number;
                borderwidth?: number;
                captureevents?: boolean;
                clicktoshow?: false | 'onoff' | 'onout';
                font?: {
                    color?: string;
                    family?: string;
                    lineposition?: string;
                    shadow?: string;
                    size?: number;
                    style?: 'normal' | 'italic';
                    textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                    variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                    weight?: number;
                };
                height?: number;
                hoverlabel?: {
                    bgcolor?: string;
                    bordercolor?: string;
                    font?: {
                        color?: string;
                        family?: string;
                        lineposition?: string;
                        shadow?: string;
                        size?: number;
                        style?: 'normal' | 'italic';
                        textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                        variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                        weight?: number;
                    };
                };
                hovertext?: string;
                name?: string;
                opacity?: number;
                showarrow?: boolean;
                standoff?: number;
                startarrowhead?: number;
                startarrowsize?: number;
                startstandoff?: number;
                templateitemname?: string;
                text?: string;
                textangle?: number;
                valign?: 'top' | 'middle' | 'bottom';
                visible?: boolean;
                width?: number;
                x?: any;
                xanchor?: 'auto' | 'left' | 'center' | 'right';
                xclick?: any;
                xref?: 'paper' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/';
                xshift?: number;
                y?: any;
                yanchor?: 'auto' | 'top' | 'middle' | 'bottom';
                yclick?: any;
                yref?: 'paper' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
                yshift?: number;
            };
        };
    };
    autosize?: boolean;
    autotypenumbers?: 'convert types' | 'strict';
    clickmode?: string;
    coloraxis?: {
        autocolorscale?: boolean;
        cauto?: boolean;
        cmax?: number;
        cmid?: number;
        cmin?: number;
        colorbar?: {
            bgcolor?: string;
            bordercolor?: string;
            borderwidth?: number;
            dtick?: any;
            exponentformat?: 'none' | 'e' | 'E' | 'power' | 'SI' | 'B' | 'SI extended';
            labelalias?: any;
            len?: number;
            lenmode?: 'fraction' | 'pixels';
            minexponent?: number;
            nticks?: number;
            orientation?: 'h' | 'v';
            outlinecolor?: string;
            outlinewidth?: number;
            separatethousands?: boolean;
            showexponent?: 'all' | 'first' | 'last' | 'none';
            showticklabels?: boolean;
            showtickprefix?: 'all' | 'first' | 'last' | 'none';
            showticksuffix?: 'all' | 'first' | 'last' | 'none';
            thickness?: number;
            thicknessmode?: 'fraction' | 'pixels';
            tick0?: any;
            tickangle?: number;
            tickcolor?: string;
            tickfont?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            tickformat?: string;
            tickformatstops?: {
                items?: {
                    tickformatstop?: {
                        dtickrange?: any[];
                        enabled?: boolean;
                        name?: string;
                        templateitemname?: string;
                        value?: string;
                    };
                };
            };
            ticklabeloverflow?: 'allow' | 'hide past div' | 'hide past domain';
            ticklabelposition?: 'outside' | 'inside' | 'outside top' | 'inside top' | 'outside left' | 'inside left' | 'outside right' | 'inside right' | 'outside bottom' | 'inside bottom';
            ticklabelstep?: number;
            ticklen?: number;
            tickmode?: 'auto' | 'linear' | 'array';
            tickprefix?: string;
            ticks?: 'outside' | 'inside' | '';
            ticksuffix?: string;
            ticktext?: any[];
            tickvals?: any[];
            tickwidth?: number;
            title?: {
                font?: {
                    color?: string;
                    family?: string;
                    lineposition?: string;
                    shadow?: string;
                    size?: number;
                    style?: 'normal' | 'italic';
                    textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                    variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                    weight?: number;
                };
                side?: 'right' | 'top' | 'bottom';
                text?: string;
            };
            x?: number;
            xanchor?: 'left' | 'center' | 'right';
            xpad?: number;
            xref?: 'container' | 'paper';
            y?: number;
            yanchor?: 'top' | 'middle' | 'bottom';
            ypad?: number;
            yref?: 'container' | 'paper';
        };
        colorscale?: string | [number, string][];
        reversescale?: boolean;
        showscale?: boolean;
    };
    colorscale?: {
        diverging?: string | [number, string][];
        sequential?: string | [number, string][];
        sequentialminus?: string | [number, string][];
    };
    colorway?: any;
    computed?: any;
    datarevision?: any;
    dragmode?: 'zoom' | 'pan' | 'select' | 'lasso' | 'drawclosedpath' | 'drawopenpath' | 'drawline' | 'drawrect' | 'drawcircle' | 'orbit' | 'turntable' | false;
    editrevision?: any;
    font?: {
        color?: string;
        family?: string;
        lineposition?: string;
        shadow?: string;
        size?: number;
        style?: 'normal' | 'italic';
        textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
        variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
        weight?: number;
    };
    grid?: {
        columns?: number;
        domain?: {
            x?: any[];
            y?: any[];
        };
        pattern?: 'independent' | 'coupled';
        roworder?: 'top to bottom' | 'bottom to top';
        rows?: number;
        subplots?: any[];
        xaxes?: any[];
        xgap?: number;
        xside?: 'bottom' | 'bottom plot' | 'top plot' | 'top';
        yaxes?: any[];
        ygap?: number;
        yside?: 'left' | 'left plot' | 'right plot' | 'right';
    };
    height?: number;
    hidesources?: boolean;
    hoverdistance?: number;
    hoverlabel?: {
        align?: 'left' | 'right' | 'auto';
        bgcolor?: string;
        bordercolor?: string;
        font?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        grouptitlefont?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        namelength?: number;
        showarrow?: boolean;
    };
    hovermode?: 'x' | 'y' | 'closest' | false | 'x unified' | 'y unified';
    hoversubplots?: 'single' | 'overlaying' | 'axis';
    images?: {
        items?: {
            image?: {
                layer?: 'below' | 'above';
                name?: string;
                opacity?: number;
                sizex?: number;
                sizey?: number;
                sizing?: 'fill' | 'contain' | 'stretch';
                source?: string;
                templateitemname?: string;
                visible?: boolean;
                x?: any;
                xanchor?: 'left' | 'center' | 'right';
                xref?: 'paper' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/';
                y?: any;
                yanchor?: 'top' | 'middle' | 'bottom';
                yref?: 'paper' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
            };
        };
    };
    legend?: {
        bgcolor?: string;
        bordercolor?: string;
        borderwidth?: number;
        entrywidth?: number;
        entrywidthmode?: 'fraction' | 'pixels';
        font?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        groupclick?: 'toggleitem' | 'togglegroup';
        grouptitlefont?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        indentation?: number;
        itemclick?: 'toggle' | 'toggleothers' | false;
        itemdoubleclick?: 'toggle' | 'toggleothers' | false;
        itemsizing?: 'trace' | 'constant';
        itemwidth?: number;
        maxheight?: number;
        orientation?: 'v' | 'h';
        title?: {
            font?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            side?: 'top' | 'left' | 'top left' | 'top center' | 'top right';
            text?: string;
        };
        tracegroupgap?: number;
        traceorder?: string;
        valign?: 'top' | 'middle' | 'bottom';
        visible?: boolean;
        x?: number;
        xanchor?: 'auto' | 'left' | 'center' | 'right';
        xref?: 'container' | 'paper';
        y?: number;
        yanchor?: 'auto' | 'top' | 'middle' | 'bottom';
        yref?: 'container' | 'paper';
    };
    margin?: {
        autoexpand?: boolean;
        b?: number;
        l?: number;
        pad?: number;
        r?: number;
        t?: number;
    };
    meta?: any;
    minreducedheight?: number;
    minreducedwidth?: number;
    modebar?: {
        activecolor?: string;
        add?: string;
        bgcolor?: string;
        color?: string;
        orientation?: 'v' | 'h';
        remove?: string;
    };
    newselection?: {
        line?: {
            color?: string;
            dash?: string;
            width?: number;
        };
        mode?: 'immediate' | 'gradual';
    };
    newshape?: {
        drawdirection?: 'ortho' | 'horizontal' | 'vertical' | 'diagonal';
        fillcolor?: string;
        fillrule?: 'evenodd' | 'nonzero';
        label?: {
            font?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            padding?: number;
            text?: string;
            textangle?: number;
            textposition?: 'top left' | 'top center' | 'top right' | 'middle left' | 'middle center' | 'middle right' | 'bottom left' | 'bottom center' | 'bottom right' | 'start' | 'middle' | 'end';
            texttemplate?: string;
            texttemplatefallback?: any;
            xanchor?: 'auto' | 'left' | 'center' | 'right';
            yanchor?: 'top' | 'middle' | 'bottom';
        };
        layer?: 'below' | 'above' | 'between';
        legend?: string;
        legendgroup?: string;
        legendgrouptitle?: {
            font?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            text?: string;
        };
        legendrank?: number;
        legendwidth?: number;
        line?: {
            color?: string;
            dash?: string;
            width?: number;
        };
        name?: string;
        opacity?: number;
        showlegend?: boolean;
        visible?: true | false | 'legendonly';
    };
    paper_bgcolor?: string;
    plot_bgcolor?: string;
    selectdirection?: 'h' | 'v' | 'd' | 'any';
    selectionrevision?: any;
    selections?: {
        items?: {
            selection?: {
                line?: {
                    color?: string;
                    dash?: string;
                    width?: number;
                };
                name?: string;
                opacity?: number;
                path?: string;
                templateitemname?: string;
                type?: 'rect' | 'path';
                x0?: any;
                x1?: any;
                xref?: 'paper' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/';
                y0?: any;
                y1?: any;
                yref?: 'paper' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
            };
        };
    };
    separators?: string;
    shapes?: {
        items?: {
            shape?: {
                editable?: boolean;
                fillcolor?: string;
                fillrule?: 'evenodd' | 'nonzero';
                label?: {
                    font?: {
                        color?: string;
                        family?: string;
                        lineposition?: string;
                        shadow?: string;
                        size?: number;
                        style?: 'normal' | 'italic';
                        textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                        variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                        weight?: number;
                    };
                    padding?: number;
                    text?: string;
                    textangle?: number;
                    textposition?: 'top left' | 'top center' | 'top right' | 'middle left' | 'middle center' | 'middle right' | 'bottom left' | 'bottom center' | 'bottom right' | 'start' | 'middle' | 'end';
                    texttemplate?: string;
                    texttemplatefallback?: any;
                    xanchor?: 'auto' | 'left' | 'center' | 'right';
                    yanchor?: 'top' | 'middle' | 'bottom';
                };
                layer?: 'below' | 'above' | 'between';
                legend?: string;
                legendgroup?: string;
                legendgrouptitle?: {
                    font?: {
                        color?: string;
                        family?: string;
                        lineposition?: string;
                        shadow?: string;
                        size?: number;
                        style?: 'normal' | 'italic';
                        textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                        variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                        weight?: number;
                    };
                    text?: string;
                };
                legendrank?: number;
                legendwidth?: number;
                line?: {
                    color?: string;
                    dash?: string;
                    width?: number;
                };
                name?: string;
                opacity?: number;
                path?: string;
                showlegend?: boolean;
                templateitemname?: string;
                type?: 'circle' | 'rect' | 'path' | 'line';
                visible?: true | false | 'legendonly';
                x0?: any;
                x0shift?: number;
                x1?: any;
                x1shift?: number;
                xanchor?: any;
                xref?: 'paper' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/';
                xsizemode?: 'scaled' | 'pixel';
                y0?: any;
                y0shift?: number;
                y1?: any;
                y1shift?: number;
                yanchor?: any;
                yref?: 'paper' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
                ysizemode?: 'scaled' | 'pixel';
            };
        };
    };
    showlegend?: boolean;
    sliders?: {
        items?: {
            slider?: {
                active?: number;
                activebgcolor?: string;
                bgcolor?: string;
                bordercolor?: string;
                borderwidth?: number;
                currentvalue?: {
                    font?: {
                        color?: string;
                        family?: string;
                        lineposition?: string;
                        shadow?: string;
                        size?: number;
                        style?: 'normal' | 'italic';
                        textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                        variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                        weight?: number;
                    };
                    offset?: number;
                    prefix?: string;
                    suffix?: string;
                    visible?: boolean;
                    xanchor?: 'left' | 'center' | 'right';
                };
                font?: {
                    color?: string;
                    family?: string;
                    lineposition?: string;
                    shadow?: string;
                    size?: number;
                    style?: 'normal' | 'italic';
                    textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                    variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                    weight?: number;
                };
                len?: number;
                lenmode?: 'fraction' | 'pixels';
                minorticklen?: number;
                name?: string;
                pad?: {
                    b?: number;
                    l?: number;
                    r?: number;
                    t?: number;
                };
                steps?: {
                    items?: {
                        step?: {
                            args?: any[];
                            execute?: boolean;
                            label?: string;
                            method?: 'restyle' | 'relayout' | 'animate' | 'update' | 'skip';
                            name?: string;
                            templateitemname?: string;
                            value?: string;
                            visible?: boolean;
                        };
                    };
                };
                templateitemname?: string;
                tickcolor?: string;
                ticklen?: number;
                tickwidth?: number;
                transition?: {
                    duration?: number;
                    easing?: 'linear' | 'quad' | 'cubic' | 'sin' | 'exp' | 'circle' | 'elastic' | 'back' | 'bounce' | 'linear-in' | 'quad-in' | 'cubic-in' | 'sin-in' | 'exp-in' | 'circle-in' | 'elastic-in' | 'back-in' | 'bounce-in' | 'linear-out' | 'quad-out' | 'cubic-out' | 'sin-out' | 'exp-out' | 'circle-out' | 'elastic-out' | 'back-out' | 'bounce-out' | 'linear-in-out' | 'quad-in-out' | 'cubic-in-out' | 'sin-in-out' | 'exp-in-out' | 'circle-in-out' | 'elastic-in-out' | 'back-in-out' | 'bounce-in-out';
                };
                visible?: boolean;
                x?: number;
                xanchor?: 'auto' | 'left' | 'center' | 'right';
                y?: number;
                yanchor?: 'auto' | 'top' | 'middle' | 'bottom';
            };
        };
    };
    spikedistance?: number;
    template?: any;
    title?: {
        automargin?: boolean;
        font?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        pad?: {
            b?: number;
            l?: number;
            r?: number;
            t?: number;
        };
        subtitle?: {
            font?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            text?: string;
        };
        text?: string;
        x?: number;
        xanchor?: 'auto' | 'left' | 'center' | 'right';
        xref?: 'container' | 'paper';
        y?: number;
        yanchor?: 'auto' | 'top' | 'middle' | 'bottom';
        yref?: 'container' | 'paper';
    };
    transition?: {
        duration?: number;
        easing?: 'linear' | 'quad' | 'cubic' | 'sin' | 'exp' | 'circle' | 'elastic' | 'back' | 'bounce' | 'linear-in' | 'quad-in' | 'cubic-in' | 'sin-in' | 'exp-in' | 'circle-in' | 'elastic-in' | 'back-in' | 'bounce-in' | 'linear-out' | 'quad-out' | 'cubic-out' | 'sin-out' | 'exp-out' | 'circle-out' | 'elastic-out' | 'back-out' | 'bounce-out' | 'linear-in-out' | 'quad-in-out' | 'cubic-in-out' | 'sin-in-out' | 'exp-in-out' | 'circle-in-out' | 'elastic-in-out' | 'back-in-out' | 'bounce-in-out';
        ordering?: 'layout first' | 'traces first';
    };
    uniformtext?: {
        minsize?: number;
        mode?: false | 'hide' | 'show';
    };
    updatemenus?: {
        items?: {
            updatemenu?: {
                active?: number;
                bgcolor?: string;
                bordercolor?: string;
                borderwidth?: number;
                buttons?: {
                    items?: {
                        button?: {
                            args?: any[];
                            args2?: any[];
                            execute?: boolean;
                            label?: string;
                            method?: 'restyle' | 'relayout' | 'animate' | 'update' | 'skip';
                            name?: string;
                            templateitemname?: string;
                            visible?: boolean;
                        };
                    };
                };
                direction?: 'left' | 'right' | 'up' | 'down';
                font?: {
                    color?: string;
                    family?: string;
                    lineposition?: string;
                    shadow?: string;
                    size?: number;
                    style?: 'normal' | 'italic';
                    textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                    variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                    weight?: number;
                };
                name?: string;
                pad?: {
                    b?: number;
                    l?: number;
                    r?: number;
                    t?: number;
                };
                showactive?: boolean;
                templateitemname?: string;
                type?: 'dropdown' | 'buttons';
                visible?: boolean;
                x?: number;
                xanchor?: 'auto' | 'left' | 'center' | 'right';
                y?: number;
                yanchor?: 'auto' | 'top' | 'middle' | 'bottom';
            };
        };
    };
    width?: number;
    xaxis?: {
        anchor?: 'free' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
        automargin?: string;
        autorange?: true | false | 'reversed' | 'min reversed' | 'max reversed' | 'min' | 'max';
        autorangeoptions?: {
            clipmax?: any;
            clipmin?: any;
            include?: any;
            maxallowed?: any;
            minallowed?: any;
        };
        autotickangles?: any[];
        autotypenumbers?: 'convert types' | 'strict';
        categoryarray?: any[];
        categoryorder?: 'trace' | 'category ascending' | 'category descending' | 'array' | 'total ascending' | 'total descending' | 'min ascending' | 'min descending' | 'max ascending' | 'max descending' | 'sum ascending' | 'sum descending' | 'mean ascending' | 'mean descending' | 'geometric mean ascending' | 'geometric mean descending' | 'median ascending' | 'median descending';
        color?: string;
        constrain?: 'range' | 'domain';
        constraintoward?: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
        dividercolor?: string;
        dividerwidth?: number;
        domain?: any[];
        dtick?: any;
        exponentformat?: 'none' | 'e' | 'E' | 'power' | 'SI' | 'B' | 'SI extended';
        fixedrange?: boolean;
        gridcolor?: string;
        griddash?: string;
        gridwidth?: number;
        hoverformat?: string;
        insiderange?: any[];
        labelalias?: any;
        layer?: 'above traces' | 'below traces';
        linecolor?: string;
        linewidth?: number;
        matches?: '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
        maxallowed?: any;
        minallowed?: any;
        minexponent?: number;
        minor?: {
            dtick?: any;
            gridcolor?: string;
            griddash?: string;
            gridwidth?: number;
            nticks?: number;
            showgrid?: boolean;
            tick0?: any;
            tickcolor?: string;
            ticklen?: number;
            tickmode?: 'auto' | 'linear' | 'array';
            ticks?: 'outside' | 'inside' | '';
            tickvals?: any[];
            tickwidth?: number;
        };
        minorloglabels?: 'small digits' | 'complete' | 'none';
        mirror?: true | 'ticks' | false | 'all' | 'allticks';
        modebardisable?: string;
        nticks?: number;
        overlaying?: 'free' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
        position?: number;
        range?: any[];
        rangebreaks?: {
            items?: {
                rangebreak?: {
                    bounds?: any[];
                    dvalue?: number;
                    enabled?: boolean;
                    name?: string;
                    pattern?: 'day of week' | 'hour' | '';
                    templateitemname?: string;
                    values?: any[];
                };
            };
        };
        rangemode?: 'normal' | 'tozero' | 'nonnegative';
        rangeselector?: {
            activecolor?: string;
            bgcolor?: string;
            bordercolor?: string;
            borderwidth?: number;
            buttons?: {
                items?: {
                    button?: {
                        count?: number;
                        label?: string;
                        name?: string;
                        step?: 'month' | 'year' | 'day' | 'hour' | 'minute' | 'second' | 'all';
                        stepmode?: 'backward' | 'todate';
                        templateitemname?: string;
                        visible?: boolean;
                    };
                };
            };
            font?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            visible?: boolean;
            x?: number;
            xanchor?: 'auto' | 'left' | 'center' | 'right';
            y?: number;
            yanchor?: 'auto' | 'top' | 'middle' | 'bottom';
        };
        rangeslider?: {
            autorange?: boolean;
            bgcolor?: string;
            bordercolor?: string;
            borderwidth?: number;
            range?: any[];
            thickness?: number;
            visible?: boolean;
            yaxis?: {
                range?: any[];
                rangemode?: 'auto' | 'fixed' | 'match';
            };
        };
        scaleanchor?: '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/' | false;
        scaleratio?: number;
        separatethousands?: boolean;
        showdividers?: boolean;
        showexponent?: 'all' | 'first' | 'last' | 'none';
        showgrid?: boolean;
        showline?: boolean;
        showspikes?: boolean;
        showticklabels?: boolean;
        showtickprefix?: 'all' | 'first' | 'last' | 'none';
        showticksuffix?: 'all' | 'first' | 'last' | 'none';
        side?: 'top' | 'bottom' | 'left' | 'right';
        spikecolor?: string;
        spikedash?: string;
        spikemode?: string;
        spikesnap?: 'data' | 'cursor' | 'hovered data';
        spikethickness?: number;
        tick0?: any;
        tickangle?: number;
        tickcolor?: string;
        tickfont?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        tickformat?: string;
        tickformatstops?: {
            items?: {
                tickformatstop?: {
                    dtickrange?: any[];
                    enabled?: boolean;
                    name?: string;
                    templateitemname?: string;
                    value?: string;
                };
            };
        };
        ticklabelindex?: number;
        ticklabelmode?: 'instant' | 'period';
        ticklabeloverflow?: 'allow' | 'hide past div' | 'hide past domain';
        ticklabelposition?: 'outside' | 'inside' | 'outside top' | 'inside top' | 'outside left' | 'inside left' | 'outside right' | 'inside right' | 'outside bottom' | 'inside bottom';
        ticklabelshift?: number;
        ticklabelstandoff?: number;
        ticklabelstep?: number;
        ticklen?: number;
        tickmode?: 'auto' | 'linear' | 'array' | 'sync';
        tickprefix?: string;
        ticks?: 'outside' | 'inside' | '';
        tickson?: 'labels' | 'boundaries';
        ticksuffix?: string;
        ticktext?: any[];
        tickvals?: any[];
        tickwidth?: number;
        title?: {
            font?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            standoff?: number;
            text?: string;
        };
        type?: '-' | 'linear' | 'log' | 'date' | 'category' | 'multicategory';
        unifiedhovertitle?: {
            text?: string;
        };
        visible?: boolean;
        zeroline?: boolean;
        zerolinecolor?: string;
        zerolinelayer?: 'above traces' | 'below traces';
        zerolinewidth?: number;
    };
    yaxis?: {
        anchor?: 'free' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
        automargin?: string;
        autorange?: true | false | 'reversed' | 'min reversed' | 'max reversed' | 'min' | 'max';
        autorangeoptions?: {
            clipmax?: any;
            clipmin?: any;
            include?: any;
            maxallowed?: any;
            minallowed?: any;
        };
        autoshift?: boolean;
        autotickangles?: any[];
        autotypenumbers?: 'convert types' | 'strict';
        categoryarray?: any[];
        categoryorder?: 'trace' | 'category ascending' | 'category descending' | 'array' | 'total ascending' | 'total descending' | 'min ascending' | 'min descending' | 'max ascending' | 'max descending' | 'sum ascending' | 'sum descending' | 'mean ascending' | 'mean descending' | 'geometric mean ascending' | 'geometric mean descending' | 'median ascending' | 'median descending';
        color?: string;
        constrain?: 'range' | 'domain';
        constraintoward?: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
        dividercolor?: string;
        dividerwidth?: number;
        domain?: any[];
        dtick?: any;
        exponentformat?: 'none' | 'e' | 'E' | 'power' | 'SI' | 'B' | 'SI extended';
        fixedrange?: boolean;
        gridcolor?: string;
        griddash?: string;
        gridwidth?: number;
        hoverformat?: string;
        insiderange?: any[];
        labelalias?: any;
        layer?: 'above traces' | 'below traces';
        linecolor?: string;
        linewidth?: number;
        matches?: '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
        maxallowed?: any;
        minallowed?: any;
        minexponent?: number;
        minor?: {
            dtick?: any;
            gridcolor?: string;
            griddash?: string;
            gridwidth?: number;
            nticks?: number;
            showgrid?: boolean;
            tick0?: any;
            tickcolor?: string;
            ticklen?: number;
            tickmode?: 'auto' | 'linear' | 'array';
            ticks?: 'outside' | 'inside' | '';
            tickvals?: any[];
            tickwidth?: number;
        };
        minorloglabels?: 'small digits' | 'complete' | 'none';
        mirror?: true | 'ticks' | false | 'all' | 'allticks';
        modebardisable?: string;
        nticks?: number;
        overlaying?: 'free' | '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/';
        position?: number;
        range?: any[];
        rangebreaks?: {
            items?: {
                rangebreak?: {
                    bounds?: any[];
                    dvalue?: number;
                    enabled?: boolean;
                    name?: string;
                    pattern?: 'day of week' | 'hour' | '';
                    templateitemname?: string;
                    values?: any[];
                };
            };
        };
        rangemode?: 'normal' | 'tozero' | 'nonnegative';
        scaleanchor?: '/^x([2-9]|[1-9][0-9]+)?( domain)?$/' | '/^y([2-9]|[1-9][0-9]+)?( domain)?$/' | false;
        scaleratio?: number;
        separatethousands?: boolean;
        shift?: number;
        showdividers?: boolean;
        showexponent?: 'all' | 'first' | 'last' | 'none';
        showgrid?: boolean;
        showline?: boolean;
        showspikes?: boolean;
        showticklabels?: boolean;
        showtickprefix?: 'all' | 'first' | 'last' | 'none';
        showticksuffix?: 'all' | 'first' | 'last' | 'none';
        side?: 'top' | 'bottom' | 'left' | 'right';
        spikecolor?: string;
        spikedash?: string;
        spikemode?: string;
        spikesnap?: 'data' | 'cursor' | 'hovered data';
        spikethickness?: number;
        tick0?: any;
        tickangle?: number;
        tickcolor?: string;
        tickfont?: {
            color?: string;
            family?: string;
            lineposition?: string;
            shadow?: string;
            size?: number;
            style?: 'normal' | 'italic';
            textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
            variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
            weight?: number;
        };
        tickformat?: string;
        tickformatstops?: {
            items?: {
                tickformatstop?: {
                    dtickrange?: any[];
                    enabled?: boolean;
                    name?: string;
                    templateitemname?: string;
                    value?: string;
                };
            };
        };
        ticklabelindex?: number;
        ticklabelmode?: 'instant' | 'period';
        ticklabeloverflow?: 'allow' | 'hide past div' | 'hide past domain';
        ticklabelposition?: 'outside' | 'inside' | 'outside top' | 'inside top' | 'outside left' | 'inside left' | 'outside right' | 'inside right' | 'outside bottom' | 'inside bottom';
        ticklabelshift?: number;
        ticklabelstandoff?: number;
        ticklabelstep?: number;
        ticklen?: number;
        tickmode?: 'auto' | 'linear' | 'array' | 'sync';
        tickprefix?: string;
        ticks?: 'outside' | 'inside' | '';
        tickson?: 'labels' | 'boundaries';
        ticksuffix?: string;
        ticktext?: any[];
        tickvals?: any[];
        tickwidth?: number;
        title?: {
            font?: {
                color?: string;
                family?: string;
                lineposition?: string;
                shadow?: string;
                size?: number;
                style?: 'normal' | 'italic';
                textcase?: 'normal' | 'word caps' | 'upper' | 'lower';
                variant?: 'normal' | 'small-caps' | 'all-small-caps' | 'all-petite-caps' | 'petite-caps' | 'unicase';
                weight?: number;
            };
            standoff?: number;
            text?: string;
        };
        type?: '-' | 'linear' | 'log' | 'date' | 'category' | 'multicategory';
        unifiedhovertitle?: {
            text?: string;
        };
        visible?: boolean;
        zeroline?: boolean;
        zerolinecolor?: string;
        zerolinelayer?: 'above traces' | 'below traces';
        zerolinewidth?: number;
    };
}

export type AnyTrace = ScatterTrace;

