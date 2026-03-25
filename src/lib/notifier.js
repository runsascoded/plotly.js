import d3 from '@plotly/d3';
import isNumeric from 'fast-isnumeric';

var NOTEDATA = [];

export default function(text, displayLength) {
    if(NOTEDATA.indexOf(text) !== -1) return;

    NOTEDATA.push(text);

    var ts = 1000;
    if(isNumeric(displayLength)) ts = displayLength;
    else if(displayLength === 'long') ts = 3000;

    var notifierContainer = d3.select('body')
        .selectAll('.plotly-notifier')
        .data([0]);
    notifierContainer.enter()
        .append('div')
        .classed('plotly-notifier', true);

    var notes = notifierContainer.selectAll('.notifier-note').data(NOTEDATA);

    function killNote(transition) {
        transition
            .duration(700)
            .style('opacity', 0)
            .each('end', function(thisText) {
                var thisIndex = NOTEDATA.indexOf(thisText);
                if(thisIndex !== -1) NOTEDATA.splice(thisIndex, 1);
                d3.select(this).remove();
            });
    }

    notes.enter().append('div')
        .classed('notifier-note', true)
        .style('opacity', 0)
        .each(function(thisText) {
            var note = d3.select(this);

            note.append('button')
                .classed('notifier-close', true)
                .html('&times;')
                .on('click', function() {
                    note.transition().call(killNote);
                });

            var p = note.append('p');
            var lines = thisText.split(/<br\s*\/?>/g);
            for(var i = 0; i < lines.length; i++) {
                if(i) p.append('br');
                p.append('span').text(lines[i]);
            }

            if(displayLength === 'stick') {
                note.transition()
                        .duration(350)
                        .style('opacity', 1);
            } else {
                note.transition()
                        .duration(700)
                        .style('opacity', 1)
                    .transition()
                        .delay(ts)
                        .call(killNote);
            }
        });
}
