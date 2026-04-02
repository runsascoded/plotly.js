import { select } from 'd3-selection';
import isNumeric from 'fast-isnumeric';

const NOTEDATA: string[] = [];

export default function(text: string, displayLength?: number | string): void {
    if(NOTEDATA.indexOf(text) !== -1) return;

    NOTEDATA.push(text);

    let ts = 1000;
    if(isNumeric(displayLength)) ts = displayLength as number;
    else if(displayLength === 'long') ts = 3000;

    const notifierContainer = select('body')
        .selectAll('.plotly-notifier')
        .data([0]);
    notifierContainer.enter()
        .append('div')
        .classed('plotly-notifier', true);

    const notes = notifierContainer.selectAll('.notifier-note').data(NOTEDATA);

    function killNote(transition: any): void {
        transition
            .duration(700)
            .style('opacity', 0)
            .on('end', function(this: Element, thisText: string) {
                const thisIndex = NOTEDATA.indexOf(thisText);
                if(thisIndex !== -1) NOTEDATA.splice(thisIndex, 1);
                select(this).remove();
            });
    }

    notes.enter().append('div')
        .classed('notifier-note', true)
        .style('opacity', 0)
        .each(function(this: Element, thisText: string) {
            const note = select(this);

            note.append('button')
                .classed('notifier-close', true)
                .html('&times;')
                .on('click', function() {
                    note.transition().call(killNote);
                });

            const p = note.append('p');
            const lines = thisText.split(/<br\s*\/?>/g);
            for(let i = 0; i < lines.length; i++) {
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
