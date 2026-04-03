import { select } from 'd3-selection';
import isNumeric from 'fast-isnumeric';
const NOTEDATA = [];
export default function (text, displayLength) {
    if (NOTEDATA.indexOf(text) !== -1)
        return;
    NOTEDATA.push(text);
    let ts = 1000;
    if (isNumeric(displayLength))
        ts = displayLength;
    else if (displayLength === 'long')
        ts = 3000;
    let notifierContainer = select('body')
        .selectAll('.plotly-notifier')
        .data([0]);
    const notifierEnter = notifierContainer.enter()
        .append('div')
        .classed('plotly-notifier', true);
    notifierContainer = notifierContainer.merge(notifierEnter);
    const notes = notifierContainer.selectAll('.notifier-note').data(NOTEDATA);
    function killNote(transition) {
        transition
            .duration(700)
            .style('opacity', 0)
            .on('end', function (thisText) {
            const thisIndex = NOTEDATA.indexOf(thisText);
            if (thisIndex !== -1)
                NOTEDATA.splice(thisIndex, 1);
            select(this).remove();
        });
    }
    notes.enter().append('div')
        .classed('notifier-note', true)
        .style('opacity', 0)
        .each(function (thisText) {
        const note = select(this);
        note.append('button')
            .classed('notifier-close', true)
            .html('&times;')
            .on('click', function () {
            note.transition().call(killNote);
        });
        const p = note.append('p');
        const lines = thisText.split(/<br\s*\/?>/g);
        for (let i = 0; i < lines.length; i++) {
            if (i)
                p.append('br');
            p.append('span').text(lines[i]);
        }
        if (displayLength === 'stick') {
            note.transition()
                .duration(350)
                .style('opacity', 1);
        }
        else {
            note.transition()
                .duration(700)
                .style('opacity', 1)
                .transition()
                .delay(ts)
                .call(killNote);
        }
    });
}
