import type { GraphDiv } from '../../../types/core';
import { transition } from 'd3-transition';
import 'd3-transition';
import helpers from '../sunburst/helpers.js';
import uniformText from '../bar/uniform_text.js';
import _style from '../bar/style.js';
const { resizeText } = _style;
import plotOne from './plot_one.js';
const clearMinTextSize = uniformText.clearMinTextSize;

export default function _plot(gd: GraphDiv, cdmodule: any[], transitionOpts: any, makeOnCompleteCallback: any, opts: any) {
    const type = opts.type;
    const drawDescendants = opts.drawDescendants;

    const fullLayout = gd._fullLayout;
    const layer = fullLayout['_' + type + 'layer'];
    let join, onComplete;

    // If transition config is provided, then it is only a partial replot and traces not
    // updated are removed.
    const isFullReplot = !transitionOpts;

    clearMinTextSize(type, fullLayout);

    join = layer.selectAll('g.trace.' + type)
        .data(cdmodule, function(cd) { return cd[0].trace.uid; });

    join.enter().append('g')
        .classed('trace', true)
        .classed(type, true);

    join.order();

    if(!fullLayout.uniformtext.mode && helpers.hasTransition(transitionOpts)) {
        if(makeOnCompleteCallback) {
            // If it was passed a callback to register completion, make a callback. If
            // this is created, then it must be executed on completion, otherwise the
            // pos-transition redraw will not execute:
            onComplete = makeOnCompleteCallback();
        }

        const trans = transition()
            .duration(transitionOpts.duration)
            .ease(transitionOpts.easing)
            .on('end', function() { onComplete && onComplete(); })
            .on('interrupt', function() { onComplete && onComplete(); });

        trans.each(function() {
            // Must run the selection again since otherwise enters/updates get grouped together
            // and these get executed out of order. Except we need them in order!
            layer.selectAll('g.trace').each(function(cd) {
                plotOne(gd, cd, this, transitionOpts, drawDescendants);
            });
        });
    } else {
        join.each(function(cd) {
            plotOne(gd, cd, this, transitionOpts, drawDescendants);
        });

        if(fullLayout.uniformtext.mode) {
            resizeText(gd, layer.selectAll('.trace'), type);
        }
    }

    if(isFullReplot) {
        join.exit().remove();
    }
}
