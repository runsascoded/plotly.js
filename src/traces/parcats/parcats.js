import { transition } from 'd3-transition';
import { select } from 'd3-selection';
import 'd3-transition';
import { pointer } from 'd3-selection';
import { drag as d3Drag } from 'd3-drag';
import { interpolateNumber } from 'd3-interpolate';
import Plotly from '../../plot_api/plot_api.js';
import Fx from '../../components/fx/index.js';
import Lib from '../../lib/index.js';
import { font } from '../../components/drawing/index.js';
import tinycolor from 'tinycolor2';
import svgTextUtils from '../../lib/svg_text_utils.js';
const strTranslate = Lib.strTranslate;
function performPlot(parcatsModels, graphDiv, layout, svg) {
    const isStatic = graphDiv._context.staticPlot;
    const viewModels = parcatsModels.map(createParcatsViewModel.bind(0, graphDiv, layout));
    // Get (potentially empty) parcatslayer selection with bound data to single element array
    const layerSelection = svg.selectAll('g.parcatslayer').data([null]);
    // Initialize single parcatslayer group if it doesn't exist
    const layerEnter = layerSelection.enter()
        .append('g')
        .attr('class', 'parcatslayer')
        .style('pointer-events', isStatic ? 'none' : 'all');
    const layerMerged = layerSelection.merge(layerEnter);
    // Bind data to children of layerSelection and get reference to traceSelection
    const traceSelection = layerMerged
        .selectAll('g.trace.parcats')
        .data(viewModels, key);
    // Initialize group for each trace/dimensions
    const traceEnter = traceSelection.enter()
        .append('g')
        .attr('class', 'trace parcats');
    // Initialize paths group
    traceEnter
        .append('g')
        .attr('class', 'paths');
    const traceMerged = traceSelection.merge(traceEnter);
    // Update properties for each trace
    traceMerged
        .attr('transform', function (d) {
        return strTranslate(d.x, d.y);
    });
    // Update paths transform
    const pathsSelection = traceMerged
        .select('g.paths');
    // Get paths selection
    const pathSelection = pathsSelection
        .selectAll('path.path')
        .data(function (d) {
        return d.paths;
    }, key);
    // Update existing path colors
    pathSelection
        .attr('fill', function (d) {
        return d.model.color;
    });
    // Create paths
    const pathSelectionEnter = pathSelection
        .enter()
        .append('path')
        .attr('class', 'path')
        .attr('stroke-opacity', 0)
        .attr('fill', function (d) {
        return d.model.color;
    })
        .attr('fill-opacity', 0);
    stylePathsNoHover(pathSelectionEnter);
    const pathMerged = pathSelection.merge(pathSelectionEnter);
    // Set path geometry
    pathMerged
        .attr('d', function (d) {
        return d.svgD;
    });
    // sort paths
    if (!pathSelectionEnter.empty()) {
        // Only sort paths if there has been a change.
        // Otherwise paths are already sorted or a hover operation may be in progress
        pathMerged.sort(compareRawColor);
    }
    // Remove any old paths
    pathSelection.exit().remove();
    // Path hover
    pathMerged
        .on('mouseover', mouseoverPath)
        .on('mouseout', mouseoutPath)
        .on('click', clickPath);
    // Initialize dimensions group
    traceEnter.append('g').attr('class', 'dimensions');
    // Update dimensions transform
    const dimensionsSelection = traceMerged
        .select('g.dimensions');
    // Get dimension selection
    const dimensionSelection = dimensionsSelection
        .selectAll('g.dimension')
        .data(function (d) {
        return d.dimensions;
    }, key);
    // Create dimension groups
    const dimensionEnter = dimensionSelection.enter()
        .append('g')
        .attr('class', 'dimension');
    const dimensionMerged = dimensionSelection.merge(dimensionEnter);
    // Update dimension group transforms
    dimensionMerged.attr('transform', function (d) {
        return strTranslate(d.x, 0);
    });
    // Remove any old dimensions
    dimensionSelection.exit().remove();
    // Get category selection
    const categorySelection = dimensionMerged
        .selectAll('g.category')
        .data(function (d) {
        return d.categories;
    }, key);
    // Initialize category groups
    const categoryGroupEnterSelection = categorySelection
        .enter()
        .append('g')
        .attr('class', 'category');
    const categoryMerged = categorySelection.merge(categoryGroupEnterSelection);
    // Update category transforms
    categoryMerged
        .attr('transform', function (d) {
        return strTranslate(0, d.y);
    });
    // Initialize rectangle
    categoryGroupEnterSelection
        .append('rect')
        .attr('class', 'catrect')
        .attr('pointer-events', 'none');
    // Update rectangle
    categoryMerged.select('rect.catrect')
        .attr('fill', 'none')
        .attr('width', function (d) {
        return d.width;
    })
        .attr('height', function (d) {
        return d.height;
    });
    styleCategoriesNoHover(categoryGroupEnterSelection);
    // Initialize color band rects
    const bandSelection = categoryMerged
        .selectAll('rect.bandrect')
        .data(
    /** @param {CategoryViewModel} catViewModel*/
    function (catViewModel) {
        return catViewModel.bands;
    }, key);
    // Raise all update bands to the top so that fading enter/exit bands will be behind
    bandSelection.each(function () { Lib.raiseToTop(this); });
    // Update band color
    bandSelection
        .attr('fill', function (d) {
        return d.color;
    });
    const bandsSelectionEnter = bandSelection.enter()
        .append('rect')
        .attr('class', 'bandrect')
        .attr('stroke-opacity', 0)
        .attr('fill', function (d) {
        return d.color;
    })
        .attr('fill-opacity', 0);
    bandSelection.merge(bandsSelectionEnter)
        .attr('fill', function (d) {
        return d.color;
    })
        .attr('width', function (d) {
        return d.width;
    })
        .attr('height', function (d) {
        return d.height;
    })
        .attr('y', function (d) {
        return d.y;
    })
        .attr('cursor', 
    /** @param {CategoryBandViewModel} bandModel*/
    function (bandModel) {
        if (bandModel.parcatsViewModel.arrangement === 'fixed') {
            return 'default';
        }
        else if (bandModel.parcatsViewModel.arrangement === 'perpendicular') {
            return 'ns-resize';
        }
        else {
            return 'move';
        }
    });
    styleBandsNoHover(bandsSelectionEnter);
    bandSelection.exit().remove();
    // Initialize category label
    categoryGroupEnterSelection
        .append('text')
        .attr('class', 'catlabel')
        .attr('pointer-events', 'none');
    // Update category label
    categorySelection.select('text.catlabel')
        .attr('text-anchor', function (d) {
        if (catInRightDim(d)) {
            // Place label to the right of category
            return 'start';
        }
        else {
            // Place label to the left of category
            return 'end';
        }
    })
        .attr('alignment-baseline', 'middle')
        .style('fill', 'rgb(0, 0, 0)')
        .attr('x', function (d) {
        if (catInRightDim(d)) {
            // Place label to the right of category
            return d.width + 5;
        }
        else {
            // Place label to the left of category
            return -5;
        }
    })
        .attr('y', function (d) {
        return d.height / 2;
    })
        .text(function (d) {
        return d.model.categoryLabel;
    })
        .each(
    /** @param {CategoryViewModel} catModel*/
    function (catModel) {
        font(select(this), catModel.parcatsViewModel.categorylabelfont);
        svgTextUtils.convertToTspans(select(this), graphDiv);
    });
    // Initialize dimension label
    categoryGroupEnterSelection
        .append('text')
        .attr('class', 'dimlabel');
    // Update dimension label
    categorySelection.select('text.dimlabel')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'baseline')
        .attr('cursor', 
    /** @param {CategoryViewModel} catModel*/
    function (catModel) {
        if (catModel.parcatsViewModel.arrangement === 'fixed') {
            return 'default';
        }
        else {
            return 'ew-resize';
        }
    })
        .attr('x', function (d) {
        return d.width / 2;
    })
        .attr('y', -5)
        .text(function (d, i) {
        if (i === 0) {
            // Add dimension label above topmost category
            return d.parcatsViewModel.model.dimensions[d.model.dimensionInd].dimensionLabel;
        }
        else {
            return null;
        }
    })
        .each(
    /** @param {CategoryViewModel} catModel*/
    function (catModel) {
        font(select(this), catModel.parcatsViewModel.labelfont);
    });
    // Category hover
    // categorySelection.select('rect.catrect')
    categorySelection.selectAll('rect.bandrect')
        .on('mouseover', mouseoverCategoryBand)
        .on('mouseout', mouseoutCategory);
    // Remove unused categories
    categorySelection.exit().remove();
    // Setup drag
    dimensionSelection.call(d3Drag()
        .origin(function (d) {
        return { x: d.x, y: 0 };
    })
        .on('start', dragDimensionStart)
        .on('drag', dragDimension)
        .on('end', dragDimensionEnd));
    // Save off selections to view models
    traceSelection.each(function (d) {
        d.traceSelection = select(this);
        d.pathSelection = select(this).selectAll('g.paths').selectAll('path.path');
        d.dimensionSelection = select(this).selectAll('g.dimensions').selectAll('g.dimension');
    });
    // Remove any orphan traces
    traceSelection.exit().remove();
}
export default function (graphDiv, svg, parcatsModels, layout, _transitionOpts, _makeOnCompleteCallback) {
    performPlot(parcatsModels, graphDiv, layout, svg);
}
/**
 * Function the returns the key property of an object for use with as D3 join function
 * @param d
 */
function key(d) {
    return d.key;
}
/** True if a category view model is in the right-most display dimension
 * @param {CategoryViewModel} d */
function catInRightDim(d) {
    const numDims = d.parcatsViewModel.dimensions.length;
    const leftDimInd = d.parcatsViewModel.dimensions[numDims - 1].model.dimensionInd;
    return d.model.dimensionInd === leftDimInd;
}
/**
 * @param {PathViewModel} a
 * @param {PathViewModel} b
 */
function compareRawColor(a, b) {
    if (a.model.rawColor > b.model.rawColor) {
        return 1;
    }
    else if (a.model.rawColor < b.model.rawColor) {
        return -1;
    }
    else {
        return 0;
    }
}
/**
 * Handle path mouseover
 * @param {PathViewModel} d
 */
function mouseoverPath(event, d) {
    if (!d.parcatsViewModel.dragDimension) {
        // We're not currently dragging
        if (d.parcatsViewModel.hoverinfoItems.indexOf('skip') === -1) {
            // hoverinfo is not skip, so we at least style the paths and emit interaction events
            // Raise path to top
            Lib.raiseToTop(this);
            stylePathsHover(select(this));
            // Emit hover event
            const points = buildPointsArrayForPath(d);
            const constraints = buildConstraintsForPath(d);
            d.parcatsViewModel.graphDiv.emit('plotly_hover', {
                points: points, event: event, constraints: constraints
            });
            // Handle hover label
            if (d.parcatsViewModel.hoverinfoItems.indexOf('none') === -1) {
                // hoverinfo is a combination of 'count' and 'probability'
                // Mouse
                const hoverX = pointer(event, this)[0];
                // Label
                const gd = d.parcatsViewModel.graphDiv;
                const trace = d.parcatsViewModel.trace;
                const fullLayout = gd._fullLayout;
                const rootBBox = fullLayout._paperdiv.node().getBoundingClientRect();
                const graphDivBBox = d.parcatsViewModel.graphDiv.getBoundingClientRect();
                // Find path center in path coordinates
                let pathCenterX, pathCenterY, dimInd;
                for (dimInd = 0; dimInd < (d.leftXs.length - 1); dimInd++) {
                    if (d.leftXs[dimInd] + d.dimWidths[dimInd] - 2 <= hoverX && hoverX <= d.leftXs[dimInd + 1] + 2) {
                        const leftDim = d.parcatsViewModel.dimensions[dimInd];
                        const rightDim = d.parcatsViewModel.dimensions[dimInd + 1];
                        pathCenterX = (leftDim.x + leftDim.width + rightDim.x) / 2;
                        pathCenterY = (d.topYs[dimInd] + d.topYs[dimInd + 1] + d.height) / 2;
                        break;
                    }
                }
                // Find path center in root coordinates
                const hoverCenterX = d.parcatsViewModel.x + pathCenterX;
                const hoverCenterY = d.parcatsViewModel.y + pathCenterY;
                const textColor = tinycolor.mostReadable(d.model.color, ['black', 'white']);
                const count = d.model.count;
                const prob = count / d.parcatsViewModel.model.count;
                const labels = {
                    countLabel: count,
                    probabilityLabel: prob.toFixed(3)
                };
                // Build hover text
                const hovertextParts = [];
                if (d.parcatsViewModel.hoverinfoItems.indexOf('count') !== -1) {
                    hovertextParts.push(['Count:', labels.countLabel].join(' '));
                }
                if (d.parcatsViewModel.hoverinfoItems.indexOf('probability') !== -1) {
                    hovertextParts.push(['P:', labels.probabilityLabel].join(' '));
                }
                const hovertext = hovertextParts.join('<br>');
                const mouseX = pointer(event, gd)[0];
                Fx.loneHover({
                    trace: trace,
                    x: hoverCenterX - rootBBox.left + graphDivBBox.left,
                    y: hoverCenterY - rootBBox.top + graphDivBBox.top,
                    text: hovertext,
                    color: d.model.color,
                    borderColor: 'black',
                    fontFamily: 'Monaco, "Courier New", monospace',
                    fontSize: 10,
                    fontColor: textColor,
                    idealAlign: mouseX < hoverCenterX ? 'right' : 'left',
                    hovertemplate: (trace.line || {}).hovertemplate,
                    hovertemplateLabels: labels,
                    eventData: [{
                            data: trace._input,
                            fullData: trace,
                            count: count,
                            probability: prob
                        }]
                }, {
                    container: fullLayout._hoverlayer.node(),
                    outerContainer: fullLayout._paper.node(),
                    gd: gd
                });
            }
        }
    }
}
/**
 * Handle path mouseout
 * @param {PathViewModel} d
 */
function mouseoutPath(event, d) {
    if (!d.parcatsViewModel.dragDimension) {
        // We're not currently dragging
        stylePathsNoHover(select(this));
        // Remove and hover label
        Fx.loneUnhover(d.parcatsViewModel.graphDiv._fullLayout._hoverlayer.node());
        // Restore path order
        d.parcatsViewModel.pathSelection.sort(compareRawColor);
        // Emit unhover event
        if (d.parcatsViewModel.hoverinfoItems.indexOf('skip') === -1) {
            const points = buildPointsArrayForPath(d);
            const constraints = buildConstraintsForPath(d);
            d.parcatsViewModel.graphDiv.emit('plotly_unhover', {
                points: points, event: event, constraints: constraints
            });
        }
    }
}
/**
 * Build array of point objects for a path
 *
 * For use in click/hover events
 * @param {PathViewModel} d
 */
function buildPointsArrayForPath(d) {
    const points = [];
    const curveNumber = getTraceIndex(d.parcatsViewModel);
    for (let i = 0; i < d.model.valueInds.length; i++) {
        const pointNumber = d.model.valueInds[i];
        points.push({
            curveNumber: curveNumber,
            pointNumber: pointNumber
        });
    }
    return points;
}
/**
 * Build constraints object for a path
 *
 * For use in click/hover events
 * @param {PathViewModel} d
 */
function buildConstraintsForPath(d) {
    const constraints = {};
    const dimensions = d.parcatsViewModel.model.dimensions;
    // dimensions
    for (let i = 0; i < dimensions.length; i++) {
        const dimension = dimensions[i];
        const category = dimension.categories[d.model.categoryInds[i]];
        constraints[dimension.containerInd] = category.categoryValue;
    }
    // color
    if (d.model.rawColor !== undefined) {
        constraints.color = d.model.rawColor;
    }
    return constraints;
}
/**
 * Handle path click
 * @param {PathViewModel} d
 */
function clickPath(event, d) {
    if (d.parcatsViewModel.hoverinfoItems.indexOf('skip') === -1) {
        // hoverinfo it's skip, so interaction events aren't disabled
        const points = buildPointsArrayForPath(d);
        const constraints = buildConstraintsForPath(d);
        d.parcatsViewModel.graphDiv.emit('plotly_click', {
            points: points, event: event, constraints: constraints
        });
    }
}
function stylePathsNoHover(pathSelection) {
    pathSelection
        .attr('fill', function (d) {
        return d.model.color;
    })
        .attr('fill-opacity', 0.6)
        .attr('stroke', 'lightgray')
        .attr('stroke-width', 0.2)
        .attr('stroke-opacity', 1.0);
}
function stylePathsHover(pathSelection) {
    pathSelection
        .attr('fill-opacity', 0.8)
        .attr('stroke', function (d) {
        return tinycolor.mostReadable(d.model.color, ['black', 'white']);
    })
        .attr('stroke-width', 0.3);
}
function styleCategoryHover(categorySelection) {
    categorySelection
        .select('rect.catrect')
        .attr('stroke', 'black')
        .attr('stroke-width', 2.5);
}
function styleCategoriesNoHover(categorySelection) {
    categorySelection
        .select('rect.catrect')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 1);
}
function styleBandsHover(bandsSelection) {
    bandsSelection
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5);
}
function styleBandsNoHover(bandsSelection) {
    bandsSelection
        .attr('stroke', 'black')
        .attr('stroke-width', 0.2)
        .attr('stroke-opacity', 1.0)
        .attr('fill-opacity', 1.0);
}
/**
 * Return selection of all paths that pass through the specified category
 * @param {CategoryBandViewModel} catBandViewModel
 */
function selectPathsThroughCategoryBandColor(catBandViewModel) {
    const allPaths = catBandViewModel.parcatsViewModel.pathSelection;
    const dimInd = catBandViewModel.categoryViewModel.model.dimensionInd;
    const catInd = catBandViewModel.categoryViewModel.model.categoryInd;
    return allPaths
        .filter(
    /** @param {PathViewModel} pathViewModel */
    function (pathViewModel) {
        return pathViewModel.model.categoryInds[dimInd] === catInd &&
            pathViewModel.model.color === catBandViewModel.color;
    });
}
/**
 * Perform hover styling for all paths that pass though the specified band element's category
 *
 * @param {HTMLElement} bandElement
 *  HTML element for band
 *
 */
function styleForCategoryHovermode(bandElement) {
    // Get all bands in the current category
    const bandSel = select(bandElement.parentNode).selectAll('rect.bandrect');
    // Raise and style paths
    bandSel.each(function (bvm) {
        const paths = selectPathsThroughCategoryBandColor(bvm);
        stylePathsHover(paths);
        paths.each(function () {
            // Raise path to top
            Lib.raiseToTop(this);
        });
    });
    // Style category
    styleCategoryHover(select(bandElement.parentNode));
}
/**
 * Perform hover styling for all paths that pass though the category of the specified band element and share the
 * same color
 *
 * @param {HTMLElement} bandElement
 *  HTML element for band
 *
 */
function styleForColorHovermode(bandElement) {
    const bandViewModel = select(bandElement).datum();
    const catPaths = selectPathsThroughCategoryBandColor(bandViewModel);
    stylePathsHover(catPaths);
    catPaths.each(function () {
        // Raise path to top
        Lib.raiseToTop(this);
    });
    // Style category for drag
    select(bandElement.parentNode)
        .selectAll('rect.bandrect')
        .filter((b) => b.color === bandViewModel.color)
        .each(function () {
        Lib.raiseToTop(this);
        styleBandsHover(select(this));
    });
}
/**
 * @param {HTMLElement} bandElement
 *  HTML element for band
 * @param eventName
 *  Event name (plotly_hover or plotly_click)
 * @param event
 *  Mouse Event
 */
function emitPointsEventCategoryHovermode(bandElement, eventName, event) {
    // Get all bands in the current category
    const bandViewModel = select(bandElement).datum();
    const categoryModel = bandViewModel.categoryViewModel.model;
    const gd = bandViewModel.parcatsViewModel.graphDiv;
    const bandSel = select(bandElement.parentNode).selectAll('rect.bandrect');
    const points = [];
    bandSel.each(function (bvm) {
        const paths = selectPathsThroughCategoryBandColor(bvm);
        paths.each(function (pathViewModel) {
            // Extend points array
            Array.prototype.push.apply(points, buildPointsArrayForPath(pathViewModel));
        });
    });
    const constraints = {};
    constraints[categoryModel.dimensionInd] = categoryModel.categoryValue;
    gd.emit(eventName, {
        points: points, event: event, constraints: constraints
    });
}
/**
 * @param {HTMLElement} bandElement
 *  HTML element for band
 * @param eventName
 *  Event name (plotly_hover or plotly_click)
 * @param event
 *  Mouse Event
 */
function emitPointsEventColorHovermode(bandElement, eventName, event) {
    const bandViewModel = select(bandElement).datum();
    const categoryModel = bandViewModel.categoryViewModel.model;
    const gd = bandViewModel.parcatsViewModel.graphDiv;
    const paths = selectPathsThroughCategoryBandColor(bandViewModel);
    const points = [];
    paths.each(function (pathViewModel) {
        // Extend points array
        Array.prototype.push.apply(points, buildPointsArrayForPath(pathViewModel));
    });
    const constraints = {};
    constraints[categoryModel.dimensionInd] = categoryModel.categoryValue;
    // color
    if (bandViewModel.rawColor !== undefined) {
        constraints.color = bandViewModel.rawColor;
    }
    gd.emit(eventName, {
        points: points, event: event, constraints: constraints
    });
}
/**
 * Create hover label for a band element's category (for use when hoveron === 'category')
 *
 * @param {ClientRect} rootBBox
 *  Client bounding box for root of figure
 * @param {HTMLElement} bandElement
 *  HTML element for band
 *
 */
function createHoverLabelForCategoryHovermode(gd, rootBBox, bandElement) {
    gd._fullLayout._calcInverseTransform(gd);
    const scaleX = gd._fullLayout._invScaleX;
    const scaleY = gd._fullLayout._invScaleY;
    // Selections
    const rectSelection = select(bandElement.parentNode).select('rect.catrect');
    const rectBoundingBox = rectSelection.node().getBoundingClientRect();
    // Models
    /** @type {CategoryViewModel} */
    const catViewModel = rectSelection.datum();
    const parcatsViewModel = catViewModel.parcatsViewModel;
    const dimensionModel = parcatsViewModel.model.dimensions[catViewModel.model.dimensionInd];
    const trace = parcatsViewModel.trace;
    // Positions
    const hoverCenterY = rectBoundingBox.top + rectBoundingBox.height / 2;
    let hoverCenterX, hoverLabelIdealAlign;
    if (parcatsViewModel.dimensions.length > 1 &&
        dimensionModel.displayInd === parcatsViewModel.dimensions.length - 1) {
        // right most dimension
        hoverCenterX = rectBoundingBox.left;
        hoverLabelIdealAlign = 'left';
    }
    else {
        hoverCenterX = rectBoundingBox.left + rectBoundingBox.width;
        hoverLabelIdealAlign = 'right';
    }
    const count = catViewModel.model.count;
    const catLabel = catViewModel.model.categoryLabel;
    const prob = count / catViewModel.parcatsViewModel.model.count;
    const labels = {
        countLabel: count,
        categoryLabel: catLabel,
        probabilityLabel: prob.toFixed(3)
    };
    // Hover label text
    const hoverinfoParts = [];
    if (catViewModel.parcatsViewModel.hoverinfoItems.indexOf('count') !== -1) {
        hoverinfoParts.push(['Count:', labels.countLabel].join(' '));
    }
    if (catViewModel.parcatsViewModel.hoverinfoItems.indexOf('probability') !== -1) {
        hoverinfoParts.push(['P(' + labels.categoryLabel + '):', labels.probabilityLabel].join(' '));
    }
    const hovertext = hoverinfoParts.join('<br>');
    return {
        trace: trace,
        x: scaleX * (hoverCenterX - rootBBox.left),
        y: scaleY * (hoverCenterY - rootBBox.top),
        text: hovertext,
        color: 'lightgray',
        borderColor: 'black',
        fontFamily: 'Monaco, "Courier New", monospace',
        fontSize: 12,
        fontColor: 'black',
        idealAlign: hoverLabelIdealAlign,
        hovertemplate: trace.hovertemplate,
        hovertemplateLabels: labels,
        eventData: [{
                data: trace._input,
                fullData: trace,
                count: count,
                category: catLabel,
                probability: prob
            }]
    };
}
/**
 * Create hover label for a band element's category (for use when hoveron === 'category')
 *
 * @param {ClientRect} rootBBox
 *  Client bounding box for root of figure
 * @param {HTMLElement} bandElement
 *  HTML element for band
 *
 */
function createHoverLabelForDimensionHovermode(gd, rootBBox, bandElement) {
    const allHoverlabels = [];
    select(bandElement.parentNode.parentNode)
        .selectAll('g.category')
        .select('rect.catrect')
        .each(function () {
        const bandNode = this;
        allHoverlabels.push(createHoverLabelForCategoryHovermode(gd, rootBBox, bandNode));
    });
    return allHoverlabels;
}
/**
 * Create hover labels for a band element's category (for use when hoveron === 'dimension')
 *
 * @param {ClientRect} rootBBox
 *  Client bounding box for root of figure
 * @param {HTMLElement} bandElement
 *  HTML element for band
 *
 */
function createHoverLabelForColorHovermode(gd, rootBBox, bandElement) {
    gd._fullLayout._calcInverseTransform(gd);
    const scaleX = gd._fullLayout._invScaleX;
    const scaleY = gd._fullLayout._invScaleY;
    const bandBoundingBox = bandElement.getBoundingClientRect();
    // Models
    /** @type {CategoryBandViewModel} */
    const bandViewModel = select(bandElement).datum();
    const catViewModel = bandViewModel.categoryViewModel;
    const parcatsViewModel = catViewModel.parcatsViewModel;
    const dimensionModel = parcatsViewModel.model.dimensions[catViewModel.model.dimensionInd];
    const trace = parcatsViewModel.trace;
    // positions
    const hoverCenterY = bandBoundingBox.y + bandBoundingBox.height / 2;
    let hoverCenterX, hoverLabelIdealAlign;
    if (parcatsViewModel.dimensions.length > 1 &&
        dimensionModel.displayInd === parcatsViewModel.dimensions.length - 1) {
        // right most dimension
        hoverCenterX = bandBoundingBox.left;
        hoverLabelIdealAlign = 'left';
    }
    else {
        hoverCenterX = bandBoundingBox.left + bandBoundingBox.width;
        hoverLabelIdealAlign = 'right';
    }
    // Labels
    const catLabel = catViewModel.model.categoryLabel;
    // Counts
    const totalCount = bandViewModel.parcatsViewModel.model.count;
    let bandColorCount = 0;
    bandViewModel.categoryViewModel.bands.forEach((b) => {
        if (b.color === bandViewModel.color) {
            bandColorCount += b.count;
        }
    });
    const catCount = catViewModel.model.count;
    let colorCount = 0;
    parcatsViewModel.pathSelection.each(
    /** @param {PathViewModel} pathViewModel */
    function (pathViewModel) {
        if (pathViewModel.model.color === bandViewModel.color) {
            colorCount += pathViewModel.model.count;
        }
    });
    const pColorAndCat = bandColorCount / totalCount;
    const pCatGivenColor = bandColorCount / colorCount;
    const pColorGivenCat = bandColorCount / catCount;
    const labels = {
        countLabel: bandColorCount,
        categoryLabel: catLabel,
        probabilityLabel: pColorAndCat.toFixed(3)
    };
    // Hover label text
    const hoverinfoParts = [];
    if (catViewModel.parcatsViewModel.hoverinfoItems.indexOf('count') !== -1) {
        hoverinfoParts.push(['Count:', labels.countLabel].join(' '));
    }
    if (catViewModel.parcatsViewModel.hoverinfoItems.indexOf('probability') !== -1) {
        hoverinfoParts.push('P(color ∩ ' + catLabel + '): ' + labels.probabilityLabel);
        hoverinfoParts.push('P(' + catLabel + ' | color): ' + pCatGivenColor.toFixed(3));
        hoverinfoParts.push('P(color | ' + catLabel + '): ' + pColorGivenCat.toFixed(3));
    }
    const hovertext = hoverinfoParts.join('<br>');
    // Compute text color
    const textColor = tinycolor.mostReadable(bandViewModel.color, ['black', 'white']);
    return {
        trace: trace,
        x: scaleX * (hoverCenterX - rootBBox.left),
        y: scaleY * (hoverCenterY - rootBBox.top),
        // name: 'NAME',
        text: hovertext,
        color: bandViewModel.color,
        borderColor: 'black',
        fontFamily: 'Monaco, "Courier New", monospace',
        fontColor: textColor,
        fontSize: 10,
        idealAlign: hoverLabelIdealAlign,
        hovertemplate: trace.hovertemplate,
        hovertemplateLabels: labels,
        eventData: [{
                data: trace._input,
                fullData: trace,
                category: catLabel,
                count: totalCount,
                probability: pColorAndCat,
                categorycount: catCount,
                colorcount: colorCount,
                bandcolorcount: bandColorCount
            }]
    };
}
/**
 * Handle dimension mouseover
 * @param {CategoryBandViewModel} bandViewModel
 */
function mouseoverCategoryBand(event, bandViewModel) {
    if (!bandViewModel.parcatsViewModel.dragDimension) {
        // We're not currently dragging
        if (bandViewModel.parcatsViewModel.hoverinfoItems.indexOf('skip') === -1) {
            // hoverinfo is not skip, so we at least style the bands and emit interaction events
            // Mouse
            const mouseY = pointer(event, this)[1];
            if (mouseY < -1) {
                // Hover is above above the category rectangle (probably the dimension title text)
                return;
            }
            const gd = bandViewModel.parcatsViewModel.graphDiv;
            const fullLayout = gd._fullLayout;
            const rootBBox = fullLayout._paperdiv.node().getBoundingClientRect();
            const hoveron = bandViewModel.parcatsViewModel.hoveron;
            /** @type {HTMLElement} */
            const bandElement = this;
            // Handle style and events
            if (hoveron === 'color') {
                styleForColorHovermode(bandElement);
                emitPointsEventColorHovermode(bandElement, 'plotly_hover', event);
            }
            else {
                styleForCategoryHovermode(bandElement);
                emitPointsEventCategoryHovermode(bandElement, 'plotly_hover', event);
            }
            // Handle hover label
            if (bandViewModel.parcatsViewModel.hoverinfoItems.indexOf('none') === -1) {
                let hoverItems;
                if (hoveron === 'category') {
                    hoverItems = createHoverLabelForCategoryHovermode(gd, rootBBox, bandElement);
                }
                else if (hoveron === 'color') {
                    hoverItems = createHoverLabelForColorHovermode(gd, rootBBox, bandElement);
                }
                else if (hoveron === 'dimension') {
                    hoverItems = createHoverLabelForDimensionHovermode(gd, rootBBox, bandElement);
                }
                if (hoverItems) {
                    Fx.loneHover(hoverItems, {
                        container: fullLayout._hoverlayer.node(),
                        outerContainer: fullLayout._paper.node(),
                        gd: gd
                    });
                }
            }
        }
    }
}
/**
 * Handle dimension mouseover
 * @param {CategoryBandViewModel} bandViewModel
 */
function mouseoutCategory(event, bandViewModel) {
    const parcatsViewModel = bandViewModel.parcatsViewModel;
    if (!parcatsViewModel.dragDimension) {
        // We're not dragging anything
        // Reset unhovered styles
        stylePathsNoHover(parcatsViewModel.pathSelection);
        styleCategoriesNoHover(parcatsViewModel.dimensionSelection.selectAll('g.category'));
        styleBandsNoHover(parcatsViewModel.dimensionSelection.selectAll('g.category').selectAll('rect.bandrect'));
        // Remove hover label
        Fx.loneUnhover(parcatsViewModel.graphDiv._fullLayout._hoverlayer.node());
        // Restore path order
        parcatsViewModel.pathSelection.sort(compareRawColor);
        // Emit unhover event
        if (parcatsViewModel.hoverinfoItems.indexOf('skip') === -1) {
            const hoveron = bandViewModel.parcatsViewModel.hoveron;
            const bandElement = this;
            // Handle style and events
            if (hoveron === 'color') {
                emitPointsEventColorHovermode(bandElement, 'plotly_unhover', event);
            }
            else {
                emitPointsEventCategoryHovermode(bandElement, 'plotly_unhover', event);
            }
        }
    }
}
/**
 * Handle dimension drag start
 * @param {DimensionViewModel} d
 */
function dragDimensionStart(event, d) {
    // Check if dragging is supported
    if (d.parcatsViewModel.arrangement === 'fixed') {
        return;
    }
    // Save off initial drag indexes for dimension
    d.dragDimensionDisplayInd = d.model.displayInd;
    d.initialDragDimensionDisplayInds = d.parcatsViewModel.model.dimensions.map((d) => d.displayInd);
    d.dragHasMoved = false;
    // Check for category hit
    d.dragCategoryDisplayInd = null;
    select(this)
        .selectAll('g.category')
        .select('rect.catrect')
        .each(
    /** @param {CategoryViewModel} catViewModel */
    function (catViewModel) {
        const catMouseX = pointer(event, this)[0];
        const catMouseY = pointer(event, this)[1];
        if (-2 <= catMouseX && catMouseX <= catViewModel.width + 2 &&
            -2 <= catMouseY && catMouseY <= catViewModel.height + 2) {
            // Save off initial drag indexes for categories
            d.dragCategoryDisplayInd = catViewModel.model.displayInd;
            d.initialDragCategoryDisplayInds = d.model.categories.map((c) => c.displayInd);
            // Initialize categories dragY to be the current y position
            catViewModel.model.dragY = catViewModel.y;
            // Raise category
            Lib.raiseToTop(this.parentNode);
            // Get band element
            select(this.parentNode)
                .selectAll('rect.bandrect')
                /** @param {CategoryBandViewModel} bandViewModel */
                .each(function (bandViewModel) {
                if (bandViewModel.y < catMouseY && catMouseY <= bandViewModel.y + bandViewModel.height) {
                    d.potentialClickBand = this;
                }
            });
        }
    });
    // Update toplevel drag dimension
    d.parcatsViewModel.dragDimension = d;
    // Remove hover label if any
    Fx.loneUnhover(d.parcatsViewModel.graphDiv._fullLayout._hoverlayer.node());
}
/**
 * Handle dimension drag
 * @param {DimensionViewModel} d
 */
function dragDimension(event, d) {
    // Check if dragging is supported
    if (d.parcatsViewModel.arrangement === 'fixed') {
        return;
    }
    d.dragHasMoved = true;
    if (d.dragDimensionDisplayInd === null) {
        return;
    }
    const dragDimInd = d.dragDimensionDisplayInd;
    const prevDimInd = dragDimInd - 1;
    const nextDimInd = dragDimInd + 1;
    const dragDimension = d.parcatsViewModel
        .dimensions[dragDimInd];
    // Update category
    if (d.dragCategoryDisplayInd !== null) {
        const dragCategory = dragDimension.categories[d.dragCategoryDisplayInd];
        // Update dragY by dy
        dragCategory.model.dragY += event.dy;
        const categoryY = dragCategory.model.dragY;
        // Check for category drag swaps
        const catDisplayInd = dragCategory.model.displayInd;
        const dimCategoryViews = dragDimension.categories;
        const catAbove = dimCategoryViews[catDisplayInd - 1];
        const catBelow = dimCategoryViews[catDisplayInd + 1];
        // Check for overlap above
        if (catAbove !== undefined) {
            if (categoryY < (catAbove.y + catAbove.height / 2.0)) {
                // Swap display inds
                dragCategory.model.displayInd = catAbove.model.displayInd;
                catAbove.model.displayInd = catDisplayInd;
            }
        }
        if (catBelow !== undefined) {
            if ((categoryY + dragCategory.height) > (catBelow.y + catBelow.height / 2.0)) {
                // Swap display inds
                dragCategory.model.displayInd = catBelow.model.displayInd;
                catBelow.model.displayInd = catDisplayInd;
            }
        }
        // Update category drag display index
        d.dragCategoryDisplayInd = dragCategory.model.displayInd;
    }
    // Update dimension position
    if (d.dragCategoryDisplayInd === null || d.parcatsViewModel.arrangement === 'freeform') {
        dragDimension.model.dragX = event.x;
        // Check for dimension swaps
        const prevDimension = d.parcatsViewModel.dimensions[prevDimInd];
        const nextDimension = d.parcatsViewModel.dimensions[nextDimInd];
        if (prevDimension !== undefined) {
            if (dragDimension.model.dragX < (prevDimension.x + prevDimension.width)) {
                // Swap display inds
                dragDimension.model.displayInd = prevDimension.model.displayInd;
                prevDimension.model.displayInd = dragDimInd;
            }
        }
        if (nextDimension !== undefined) {
            if ((dragDimension.model.dragX + dragDimension.width) > nextDimension.x) {
                // Swap display inds
                dragDimension.model.displayInd = nextDimension.model.displayInd;
                nextDimension.model.displayInd = d.dragDimensionDisplayInd;
            }
        }
        // Update drag display index
        d.dragDimensionDisplayInd = dragDimension.model.displayInd;
    }
    // Update view models
    updateDimensionViewModels(d.parcatsViewModel);
    updatePathViewModels(d.parcatsViewModel);
    // Update svg geometry
    updateSvgCategories(d.parcatsViewModel);
    updateSvgPaths(d.parcatsViewModel);
}
/**
 * Handle dimension drag end
 * @param {DimensionViewModel} d
 */
function dragDimensionEnd(event, d) {
    // Check if dragging is supported
    if (d.parcatsViewModel.arrangement === 'fixed') {
        return;
    }
    if (d.dragDimensionDisplayInd === null) {
        return;
    }
    select(this).selectAll('text').attr('font-weight', 'normal');
    // Compute restyle command
    // -----------------------
    const restyleData = {};
    const traceInd = getTraceIndex(d.parcatsViewModel);
    // ### Handle dimension reordering ###
    const finalDragDimensionDisplayInds = d.parcatsViewModel.model.dimensions.map((d) => d.displayInd);
    const anyDimsReordered = d.initialDragDimensionDisplayInds.some(function (initDimDisplay, dimInd) {
        return initDimDisplay !== finalDragDimensionDisplayInds[dimInd];
    });
    if (anyDimsReordered) {
        finalDragDimensionDisplayInds.forEach((finalDimDisplay, dimInd) => {
            const containerInd = d.parcatsViewModel.model.dimensions[dimInd].containerInd;
            restyleData['dimensions[' + containerInd + '].displayindex'] = finalDimDisplay;
        });
    }
    // ### Handle category reordering ###
    let anyCatsReordered = false;
    if (d.dragCategoryDisplayInd !== null) {
        const finalDragCategoryDisplayInds = d.model.categories.map((c) => c.displayInd);
        anyCatsReordered = d.initialDragCategoryDisplayInds.some(function (initCatDisplay, catInd) {
            return initCatDisplay !== finalDragCategoryDisplayInds[catInd];
        });
        if (anyCatsReordered) {
            // Sort a shallow copy of the category models by display index
            const sortedCategoryModels = d.model.categories.slice().sort(function (a, b) { return a.displayInd - b.displayInd; });
            // Get new categoryarray and ticktext values
            const newCategoryArray = sortedCategoryModels.map((v) => v.categoryValue);
            const newCategoryLabels = sortedCategoryModels.map((v) => v.categoryLabel);
            restyleData['dimensions[' + d.model.containerInd + '].categoryarray'] = [newCategoryArray];
            restyleData['dimensions[' + d.model.containerInd + '].ticktext'] = [newCategoryLabels];
            restyleData['dimensions[' + d.model.containerInd + '].categoryorder'] = 'array';
        }
    }
    // Handle potential click event
    // ----------------------------
    if (d.parcatsViewModel.hoverinfoItems.indexOf('skip') === -1) {
        if (!d.dragHasMoved && d.potentialClickBand) {
            if (d.parcatsViewModel.hoveron === 'color') {
                emitPointsEventColorHovermode(d.potentialClickBand, 'plotly_click', event.sourceEvent);
            }
            else {
                emitPointsEventCategoryHovermode(d.potentialClickBand, 'plotly_click', event.sourceEvent);
            }
        }
    }
    // Nullify drag states
    // -------------------
    d.model.dragX = null;
    if (d.dragCategoryDisplayInd !== null) {
        const dragCategory = d.parcatsViewModel
            .dimensions[d.dragDimensionDisplayInd]
            .categories[d.dragCategoryDisplayInd];
        dragCategory.model.dragY = null;
        d.dragCategoryDisplayInd = null;
    }
    d.dragDimensionDisplayInd = null;
    d.parcatsViewModel.dragDimension = null;
    d.dragHasMoved = null;
    d.potentialClickBand = null;
    // Update view models
    // ------------------
    updateDimensionViewModels(d.parcatsViewModel);
    updatePathViewModels(d.parcatsViewModel);
    // Perform transition
    // ------------------
    const trans = transition()
        .duration(300)
        .ease('cubic-in-out');
    trans
        .each(function () {
        updateSvgCategories(d.parcatsViewModel, true);
        updateSvgPaths(d.parcatsViewModel, true);
    })
        .on('end', function () {
        if (anyDimsReordered || anyCatsReordered) {
            // Perform restyle if the order of categories or dimensions changed
            Plotly.restyle(d.parcatsViewModel.graphDiv, restyleData, [traceInd]);
        }
    });
}
/**
 *
 * @param {ParcatsViewModel} parcatsViewModel
 */
function getTraceIndex(parcatsViewModel) {
    let traceInd;
    const allTraces = parcatsViewModel.graphDiv._fullData;
    for (let i = 0; i < allTraces.length; i++) {
        if (parcatsViewModel.key === allTraces[i].uid) {
            traceInd = i;
            break;
        }
    }
    return traceInd;
}
/** Update the svg paths for view model
 * @param {ParcatsViewModel} parcatsViewModel
 * @param {boolean} hasTransition Whether to update element with transition
 */
function updateSvgPaths(parcatsViewModel, hasTransition) {
    if (hasTransition === undefined) {
        hasTransition = false;
    }
    function transition(selection) {
        return hasTransition ? selection.transition() : selection;
    }
    // Update binding
    parcatsViewModel.pathSelection.data(function (d) {
        return d.paths;
    }, key);
    // Update paths
    transition(parcatsViewModel.pathSelection).attr('d', function (d) {
        return d.svgD;
    });
}
/** Update the svg paths for view model
 * @param {ParcatsViewModel} parcatsViewModel
 * @param {boolean} hasTransition Whether to update element with transition
 */
function updateSvgCategories(parcatsViewModel, hasTransition) {
    if (hasTransition === undefined) {
        hasTransition = false;
    }
    function transition(selection) {
        return hasTransition ? selection.transition() : selection;
    }
    // Update binding
    parcatsViewModel.dimensionSelection
        .data(function (d) {
        return d.dimensions;
    }, key);
    const categorySelection = parcatsViewModel.dimensionSelection
        .selectAll('g.category')
        .data(function (d) { return d.categories; }, key);
    // Update dimension position
    transition(parcatsViewModel.dimensionSelection)
        .attr('transform', function (d) {
        return strTranslate(d.x, 0);
    });
    // Update category position
    transition(categorySelection)
        .attr('transform', function (d) {
        return strTranslate(0, d.y);
    });
    const dimLabelSelection = categorySelection.select('.dimlabel');
    // ### Update dimension label
    // Only the top-most display category should have the dimension label
    dimLabelSelection
        .text(function (d, i) {
        if (i === 0) {
            // Add dimension label above topmost category
            return d.parcatsViewModel.model.dimensions[d.model.dimensionInd].dimensionLabel;
        }
        else {
            return null;
        }
    });
    // Update category label
    // Categories in the right-most display dimension have their labels on
    // the right, all others on the left
    const catLabelSelection = categorySelection.select('.catlabel');
    catLabelSelection
        .attr('text-anchor', function (d) {
        if (catInRightDim(d)) {
            // Place label to the right of category
            return 'start';
        }
        else {
            // Place label to the left of category
            return 'end';
        }
    })
        .attr('x', function (d) {
        if (catInRightDim(d)) {
            // Place label to the right of category
            return d.width + 5;
        }
        else {
            // Place label to the left of category
            return -5;
        }
    })
        .each(function (d) {
        // Update attriubutes of <tspan> elements
        let newX;
        let newAnchor;
        if (catInRightDim(d)) {
            // Place label to the right of category
            newX = d.width + 5;
            newAnchor = 'start';
        }
        else {
            // Place label to the left of category
            newX = -5;
            newAnchor = 'end';
        }
        select(this)
            .selectAll('tspan')
            .attr('x', newX)
            .attr('text-anchor', newAnchor);
    });
    // Update bands
    // Initialize color band rects
    const bandSelection = categorySelection
        .selectAll('rect.bandrect')
        .data(
    /** @param {CategoryViewModel} catViewModel*/
    function (catViewModel) {
        return catViewModel.bands;
    }, key);
    const bandsSelectionEnter = bandSelection.enter()
        .append('rect')
        .attr('class', 'bandrect')
        .attr('cursor', 'move')
        .attr('stroke-opacity', 0)
        .attr('fill', function (d) {
        return d.color;
    })
        .attr('fill-opacity', 0);
    const bandMerged = bandSelection.merge(bandsSelectionEnter);
    bandMerged
        .attr('fill', function (d) {
        return d.color;
    })
        .attr('width', function (d) {
        return d.width;
    })
        .attr('height', function (d) {
        return d.height;
    })
        .attr('y', function (d) {
        return d.y;
    });
    styleBandsNoHover(bandsSelectionEnter);
    // Raise bands to the top
    bandMerged.each(function () { Lib.raiseToTop(this); });
    // Remove unused bands
    bandSelection.exit().remove();
}
/**
 * Create a ParcatsViewModel traces
 * @param {Object} graphDiv
 *  Top-level graph div element
 * @param {Layout} layout
 *  SVG layout object
 * @param {Array.<ParcatsModel>} wrappedParcatsModel
 *  Wrapped ParcatsModel for this trace
 * @return {ParcatsViewModel}
 */
function createParcatsViewModel(graphDiv, layout, wrappedParcatsModel) {
    // Unwrap model
    const parcatsModel = wrappedParcatsModel[0];
    // Compute margin
    const margin = layout.margin || { l: 80, r: 80, t: 100, b: 80 };
    // Compute pixel position/extents
    const trace = parcatsModel.trace;
    const domain = trace.domain;
    const figureWidth = layout.width;
    const figureHeight = layout.height;
    const traceWidth = Math.floor(figureWidth * (domain.x[1] - domain.x[0]));
    const traceHeight = Math.floor(figureHeight * (domain.y[1] - domain.y[0]));
    const traceX = domain.x[0] * figureWidth + margin.l;
    const traceY = layout.height - domain.y[1] * layout.height + margin.t;
    // Handle path shape
    // -----------------
    const pathShape = trace.line.shape;
    // Handle hover info
    // -----------------
    let hoverinfoItems;
    if (trace.hoverinfo === 'all') {
        hoverinfoItems = ['count', 'probability'];
    }
    else {
        hoverinfoItems = (trace.hoverinfo || '').split('+');
    }
    // Construct parcatsViewModel
    // --------------------------
    const parcatsViewModel = {
        trace: trace,
        key: trace.uid,
        model: parcatsModel,
        x: traceX,
        y: traceY,
        width: traceWidth,
        height: traceHeight,
        hoveron: trace.hoveron,
        hoverinfoItems: hoverinfoItems,
        arrangement: trace.arrangement,
        bundlecolors: trace.bundlecolors,
        sortpaths: trace.sortpaths,
        labelfont: trace.labelfont,
        categorylabelfont: trace.tickfont,
        pathShape: pathShape,
        dragDimension: null,
        margin: margin,
        paths: [],
        dimensions: [],
        graphDiv: graphDiv,
        traceSelection: null,
        pathSelection: null,
        dimensionSelection: null
    };
    // Update dimension view models if we have at least 1 dimension
    if (parcatsModel.dimensions) {
        updateDimensionViewModels(parcatsViewModel);
        // Update path view models if we have at least 2 dimensions
        updatePathViewModels(parcatsViewModel);
    }
    // Inside a categories view model
    return parcatsViewModel;
}
/**
 * Build the SVG string to represents a parallel categories path
 * @param {Array.<Number>} leftXPositions
 *  Array of the x positions of the left edge of each dimension (in display order)
 * @param {Array.<Number>} pathYs
 *  Array of the y positions of the top of the path at each dimension (in display order)
 * @param {Array.<Number>} dimWidths
 *  Array of the widths of each dimension in display order
 * @param {Number} pathHeight
 *  The height of the path in pixels
 * @param {Number} curvature
 *  The curvature factor for the path. 0 results in a straight line and values greater than zero result in curved paths
 * @return {string}
 */
function buildSvgPath(leftXPositions, pathYs, dimWidths, pathHeight, curvature) {
    // Compute the x midpoint of each path segment
    const xRefPoints1 = [];
    const xRefPoints2 = [];
    let refInterpolator;
    let d;
    for (d = 0; d < dimWidths.length - 1; d++) {
        refInterpolator = interpolateNumber(dimWidths[d] + leftXPositions[d], leftXPositions[d + 1]);
        xRefPoints1.push(refInterpolator(curvature));
        xRefPoints2.push(refInterpolator(1 - curvature));
    }
    // Move to top of path on left edge of left-most category
    let svgD = 'M ' + leftXPositions[0] + ',' + pathYs[0];
    // Horizontal line to right edge
    svgD += 'l' + dimWidths[0] + ',0 ';
    // Horizontal line to right edge
    for (d = 1; d < dimWidths.length; d++) {
        // Curve to left edge of category
        svgD += 'C' + xRefPoints1[d - 1] + ',' + pathYs[d - 1] +
            ' ' + xRefPoints2[d - 1] + ',' + pathYs[d] +
            ' ' + leftXPositions[d] + ',' + pathYs[d];
        // svgD += 'L' + leftXPositions[d] + ',' + pathYs[d];
        // Horizontal line to right edge
        svgD += 'l' + dimWidths[d] + ',0 ';
    }
    // Line down
    svgD += 'l' + '0,' + pathHeight + ' ';
    // Line to left edge of right-most category
    svgD += 'l -' + dimWidths[dimWidths.length - 1] + ',0 ';
    for (d = dimWidths.length - 2; d >= 0; d--) {
        // Curve to right edge of category
        svgD += 'C' + xRefPoints2[d] + ',' + (pathYs[d + 1] + pathHeight) +
            ' ' + xRefPoints1[d] + ',' + (pathYs[d] + pathHeight) +
            ' ' + (leftXPositions[d] + dimWidths[d]) + ',' + (pathYs[d] + pathHeight);
        // svgD += 'L' + (leftXPositions[d] + dimWidths[d]) + ',' + (pathYs[d] + pathHeight);
        // Horizontal line to right edge
        svgD += 'l-' + dimWidths[d] + ',0 ';
    }
    // Close path
    svgD += 'Z';
    return svgD;
}
/**
 * Update the path view models based on the dimension view models in a ParcatsViewModel
 *
 * @param {ParcatsViewModel} parcatsViewModel
 *  View model for trace
 */
function updatePathViewModels(parcatsViewModel) {
    // Initialize an array of the y position of the top of the next path to be added to each category.
    //
    // nextYPositions[d][c] is the y position of the next path through category with index c of dimension with index d
    const dimensionViewModels = parcatsViewModel.dimensions;
    const parcatsModel = parcatsViewModel.model;
    const nextYPositions = dimensionViewModels.map(function (d) {
        return d.categories.map(function (c) {
            return c.y;
        });
    });
    // Array from category index to category display index for each true dimension index
    const catToDisplayIndPerDim = parcatsViewModel.model.dimensions.map(function (d) {
        return d.categories.map((c) => c.displayInd);
    });
    // Array from true dimension index to dimension display index
    const dimToDisplayInd = parcatsViewModel.model.dimensions.map((d) => d.displayInd);
    const displayToDimInd = parcatsViewModel.dimensions.map((d) => d.model.dimensionInd);
    // Array of the x position of the left edge of the rectangles for each dimension
    const leftXPositions = dimensionViewModels.map(function (d) {
        return d.x;
    });
    // Compute dimension widths
    const dimWidths = dimensionViewModels.map((d) => d.width);
    // Build sorted Array of PathModel objects
    const pathModels = [];
    for (const p in parcatsModel.paths) {
        if (parcatsModel.paths.hasOwnProperty(p)) {
            pathModels.push(parcatsModel.paths[p]);
        }
    }
    // Compute category display inds to use for sorting paths
    function pathDisplayCategoryInds(pathModel) {
        const dimensionInds = pathModel.categoryInds.map((catInd, dimInd) => catToDisplayIndPerDim[dimInd][catInd]);
        const displayInds = displayToDimInd.map((dimInd) => dimensionInds[dimInd]);
        return displayInds;
    }
    // Sort in ascending order by display index array
    pathModels.sort((v1, v2) => {
        // Build display inds for each path
        const sortArray1 = pathDisplayCategoryInds(v1);
        const sortArray2 = pathDisplayCategoryInds(v2);
        // Handle path sort order
        if (parcatsViewModel.sortpaths === 'backward') {
            sortArray1.reverse();
            sortArray2.reverse();
        }
        // Append the first value index of the path to break ties
        sortArray1.push(v1.valueInds[0]);
        sortArray2.push(v2.valueInds[0]);
        // Handle color bundling
        if (parcatsViewModel.bundlecolors) {
            // Prepend sort array with the raw color value
            sortArray1.unshift(v1.rawColor);
            sortArray2.unshift(v2.rawColor);
        }
        // colors equal, sort by display categories
        if (sortArray1 < sortArray2) {
            return -1;
        }
        if (sortArray1 > sortArray2) {
            return 1;
        }
        return 0;
    });
    // Create path models
    const pathViewModels = new Array(pathModels.length);
    const totalCount = dimensionViewModels[0].model.count;
    const totalHeight = dimensionViewModels[0].categories
        .map((c) => c.height)
        .reduce((v1, v2) => v1 + v2);
    for (let pathNumber = 0; pathNumber < pathModels.length; pathNumber++) {
        const pathModel = pathModels[pathNumber];
        let pathHeight;
        if (totalCount > 0) {
            pathHeight = totalHeight * (pathModel.count / totalCount);
        }
        else {
            pathHeight = 0;
        }
        // Build path y coords
        const pathYs = new Array(nextYPositions.length);
        for (let d = 0; d < pathModel.categoryInds.length; d++) {
            const catInd = pathModel.categoryInds[d];
            const catDisplayInd = catToDisplayIndPerDim[d][catInd];
            const dimDisplayInd = dimToDisplayInd[d];
            // Update next y position
            pathYs[dimDisplayInd] = nextYPositions[dimDisplayInd][catDisplayInd];
            nextYPositions[dimDisplayInd][catDisplayInd] += pathHeight;
            // Update category color information
            const catViewModle = parcatsViewModel.dimensions[dimDisplayInd].categories[catDisplayInd];
            const numBands = catViewModle.bands.length;
            const lastCatBand = catViewModle.bands[numBands - 1];
            if (lastCatBand === undefined || pathModel.rawColor !== lastCatBand.rawColor) {
                // Create a new band
                const bandY = lastCatBand === undefined ? 0 : lastCatBand.y + lastCatBand.height;
                catViewModle.bands.push({
                    key: bandY,
                    color: pathModel.color,
                    rawColor: pathModel.rawColor,
                    height: pathHeight,
                    width: catViewModle.width,
                    count: pathModel.count,
                    y: bandY,
                    categoryViewModel: catViewModle,
                    parcatsViewModel: parcatsViewModel
                });
            }
            else {
                // Extend current band
                const currentBand = catViewModle.bands[numBands - 1];
                currentBand.height += pathHeight;
                currentBand.count += pathModel.count;
            }
        }
        // build svg path
        let svgD;
        if (parcatsViewModel.pathShape === 'hspline') {
            svgD = buildSvgPath(leftXPositions, pathYs, dimWidths, pathHeight, 0.5);
        }
        else {
            svgD = buildSvgPath(leftXPositions, pathYs, dimWidths, pathHeight, 0);
        }
        pathViewModels[pathNumber] = {
            key: pathModel.valueInds[0],
            model: pathModel,
            height: pathHeight,
            leftXs: leftXPositions,
            topYs: pathYs,
            dimWidths: dimWidths,
            svgD: svgD,
            parcatsViewModel: parcatsViewModel
        };
    }
    parcatsViewModel.paths = pathViewModels;
    // * @property key
    // *  Unique key for this model
    // * @property {PathModel} model
    // *  Source path model
    // * @property {Number} height
    // *  Height of this path (pixels)
    // * @property {String} svgD
    // *  SVG path "d" attribute string
}
/**
 * Update the dimension view models based on the dimension models in a ParcatsViewModel
 *
 * @param {ParcatsViewModel} parcatsViewModel
 *  View model for trace
 */
function updateDimensionViewModels(parcatsViewModel) {
    // Compute dimension ordering
    const dimensionsIndInfo = parcatsViewModel.model.dimensions.map((d) => ({ displayInd: d.displayInd, dimensionInd: d.dimensionInd }));
    dimensionsIndInfo.sort((a, b) => a.displayInd - b.displayInd);
    const dimensions = [];
    for (const displayInd in dimensionsIndInfo) {
        const dimensionInd = dimensionsIndInfo[displayInd].dimensionInd;
        const dimModel = parcatsViewModel.model.dimensions[dimensionInd];
        dimensions.push(createDimensionViewModel(parcatsViewModel, dimModel));
    }
    parcatsViewModel.dimensions = dimensions;
}
/**
 * Create a parcats DimensionViewModel
 *
 * @param {ParcatsViewModel} parcatsViewModel
 *  View model for trace
 * @param {DimensionModel} dimensionModel
 * @return {DimensionViewModel}
 */
function createDimensionViewModel(parcatsViewModel, dimensionModel) {
    // Compute dimension x position
    const categoryLabelPad = 40;
    const dimWidth = 16;
    const numDimensions = parcatsViewModel.model.dimensions.length;
    const displayInd = dimensionModel.displayInd;
    // Compute x coordinate values
    let dimDx;
    let dimX0;
    let dimX;
    if (numDimensions > 1) {
        dimDx = (parcatsViewModel.width - 2 * categoryLabelPad - dimWidth) / (numDimensions - 1);
    }
    else {
        dimDx = 0;
    }
    dimX0 = categoryLabelPad;
    dimX = dimX0 + dimDx * displayInd;
    // Compute categories
    const categories = [];
    const maxCats = parcatsViewModel.model.maxCats;
    const numCats = dimensionModel.categories.length;
    const catSpacing = 8;
    const totalCount = dimensionModel.count;
    const totalHeight = parcatsViewModel.height - catSpacing * (maxCats - 1);
    let nextCatHeight;
    let nextCatModel;
    let nextCat;
    let catInd;
    let catDisplayInd;
    // Compute starting Y offset
    let nextCatY = (maxCats - numCats) * catSpacing / 2.0;
    // Compute category ordering
    const categoryIndInfo = dimensionModel.categories.map((c) => ({ displayInd: c.displayInd, categoryInd: c.categoryInd }));
    categoryIndInfo.sort((a, b) => a.displayInd - b.displayInd);
    for (catDisplayInd = 0; catDisplayInd < numCats; catDisplayInd++) {
        catInd = categoryIndInfo[catDisplayInd].categoryInd;
        nextCatModel = dimensionModel.categories[catInd];
        if (totalCount > 0) {
            nextCatHeight = (nextCatModel.count / totalCount) * totalHeight;
        }
        else {
            nextCatHeight = 0;
        }
        nextCat = {
            key: nextCatModel.valueInds[0],
            model: nextCatModel,
            width: dimWidth,
            height: nextCatHeight,
            y: nextCatModel.dragY !== null ? nextCatModel.dragY : nextCatY,
            bands: [],
            parcatsViewModel: parcatsViewModel
        };
        nextCatY = nextCatY + nextCatHeight + catSpacing;
        categories.push(nextCat);
    }
    return {
        key: dimensionModel.dimensionInd,
        x: dimensionModel.dragX !== null ? dimensionModel.dragX : dimX,
        y: 0,
        width: dimWidth,
        model: dimensionModel,
        categories: categories,
        parcatsViewModel: parcatsViewModel,
        dragCategoryDisplayInd: null,
        dragDimensionDisplayInd: null,
        initialDragDimensionDisplayInds: null,
        initialDragCategoryDisplayInds: null,
        dragHasMoved: null,
        potentialClickBand: null
    };
}
// JSDoc typedefs
// ==============
/**
 * @typedef {Object} Layout
 *  Object containing svg layout information
 *
 * @property {Number} width (pixels)
 *  Usable width for Figure (after margins are removed)
 * @property {Number} height (pixels)
 *  Usable height for Figure (after margins are removed)
 * @property {Margin} margin
 *  Margin around the Figure (pixels)
 */
/**
 * @typedef {Object} Margin
 *  Object containing padding information in pixels
 *
 * @property {Number} t
 *  Top margin
 * @property {Number} r
 *  Right margin
 * @property {Number} b
 *  Bottom margin
 * @property {Number} l
 *  Left margin
 */
/**
 * @typedef {Object} Font
 *  Object containing font information
 *
 * @property {Number} size: Font size
 * @property {String} color: Font color
 * @property {String} family: Font family
 */
/**
 * @typedef {Object} ParcatsViewModel
 *  Object containing calculated parcats view information
 *
 *  These are quantities that require Layout information to calculate
 * @property key
 *  Unique key for this model
 * @property {ParcatsModel} model
 *  Source parcats model
 * @property {Array.<DimensionViewModel>} dimensions
 *  Array of dimension view models
 * @property {Number} width
 *  Width for this trace (pixels)
 * @property {Number} height
 *  Height for this trace (pixels)
 * @property {Number} x
 *  X position of this trace with respect to the Figure (pixels)
 * @property {Number} y
 *  Y position of this trace with respect to the Figure (pixels)
 * @property {String} hoveron
 *  Hover interaction mode. One of: 'category', 'color', or 'dimension'
 * @property {Array.<String>} hoverinfoItems
 *  Info to display on hover. Array with a combination of 'counts' and/or 'probabilities', or 'none', or 'skip'
 * @property {String} arrangement
 *  Category arrangement. One of: 'perpendicular', 'freeform', or 'fixed'
 * @property {Boolean} bundlecolors
 *  Whether paths should be sorted so that like colors are bundled together as they pass through categories
 * @property {String} sortpaths
 *  If 'forward' then sort paths based on dimensions from left to right. If 'backward' sort based on dimensions
 *  from right to left
 * @property {Font} labelfont
 *  Font for the dimension labels
 * @property {Font} categorylabelfont
 *  Font for the category labels
 * @property {String} pathShape
 *  The shape of the paths. Either 'linear' or 'hspline'.
 * @property {DimensionViewModel|null} dragDimension
 *  Dimension currently being dragged. Null if no drag in progress
 * @property {Margin} margin
 *  Margin around the Figure
 * @property {Object} graphDiv
 *  Top-level graph div element
 * @property {Object} traceSelection
 *  D3 selection of this view models trace group element
 * @property {Object} pathSelection
 *  D3 selection of this view models path elements
 * @property {Object} dimensionSelection
 *  D3 selection of this view models dimension group element
 */
/**
 * @typedef {Object} DimensionViewModel
 *  Object containing calculated parcats dimension view information
 *
 *  These are quantities that require Layout information to calculate
 * @property key
 *  Unique key for this model
 * @property {DimensionModel} model
 *  Source dimension model
 * @property {Number} x
 *  X position of the center of this dimension with respect to the Figure (pixels)
 * @property {Number} y
 *  Y position of the top of this dimension with respect to the Figure (pixels)
 * @property {Number} width
 *  Width of categories in this dimension (pixels)
 * @property {ParcatsViewModel} parcatsViewModel
 *  The parent trace's view model
 * @property {Array.<CategoryViewModel>} categories
 *  Dimensions category view models
 * @property {Number|null} dragCategoryDisplayInd
 *  Display index of category currently being dragged. null if no category is being dragged
 * @property {Number|null} dragDimensionDisplayInd
 *  Display index of the dimension being dragged. null if no dimension is being dragged
 * @property {Array.<Number>|null} initialDragDimensionDisplayInds
 *  Dimensions display indexes at the beginning of the current drag. null if no dimension is being dragged
 * @property {Array.<Number>|null} initialDragCategoryDisplayInds
 *  Category display indexes for the at the beginning of the current drag. null if no category is being dragged
 * @property {HTMLElement} potentialClickBand
 *  Band under mouse when current drag began. If no drag movement takes place then a click will be emitted for this
 *  band. Null if not drag in progress.
 * @property {Boolean} dragHasMoved
 *  True if there is an active drag and the drag has moved. If drag doesn't move before being ended then
 *  this may be interpreted as a click. Null if no drag in progress
 */
/**
 * @typedef {Object} CategoryViewModel
 *  Object containing calculated parcats category view information
 *
 *  These are quantities that require Layout information to calculate
 * @property key
 *  Unique key for this model
 * @property {CategoryModel} model
 *  Source category model
 * @property {Number} width
 *  Width for this category (pixels)
 * @property {Number} height
 *  Height for this category (pixels)
 * @property {Number} y
 *  Y position of this cateogry with respect to the Figure (pixels)
 * @property {Array.<CategoryBandViewModel>} bands
 *  Array of color bands inside the category
 * @property {ParcatsViewModel} parcatsViewModel
 *  The parent trace's view model
 */
/**
 * @typedef {Object} CategoryBandViewModel
 *  Object containing calculated category band information. A category band is a region inside a category covering
 *  paths of a single color
 *
 * @property key
 *  Unique key for this model
 * @property color
 *  Band color
 * @property rawColor
 *  Raw color value for band
 * @property {Number} width
 *  Band width
 * @property {Number} height
 *  Band height
 * @property {Number} y
 *  Y position of top of the band with respect to the category
 * @property {Number} count
 *  The number of samples represented by the band
 * @property {CategoryViewModel} categoryViewModel
 *  The parent categorie's view model
 * @property {ParcatsViewModel} parcatsViewModel
 *  The parent trace's view model
 */
/**
 * @typedef {Object} PathViewModel
 *  Object containing calculated parcats path view information
 *
 *  These are quantities that require Layout information to calculate
 * @property key
 *  Unique key for this model
 * @property {PathModel} model
 *  Source path model
 * @property {Number} height
 *  Height of this path (pixels)
 * @property {Array.<Number>} leftXs
 *  The x position of the left edge of each display dimension
 * @property {Array.<Number>} topYs
 *  The y position of the top of the path for each display dimension
 * @property {Array.<Number>} dimWidths
 *  The width of each display dimension
 * @property {String} svgD
 *  SVG path "d" attribute string
 * @property {ParcatsViewModel} parcatsViewModel
 *  The parent trace's view model
 */
