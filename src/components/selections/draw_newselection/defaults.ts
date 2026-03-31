export default function supplyDrawNewSelectionDefaults(layoutIn: any, layoutOut: any, coerce: any) {
    coerce('newselection.mode');

    var newselectionLineWidth = coerce('newselection.line.width');
    if(newselectionLineWidth) {
        coerce('newselection.line.color');
        coerce('newselection.line.dash');
    }

    coerce('activeselection.fillcolor');
    coerce('activeselection.opacity');
}
