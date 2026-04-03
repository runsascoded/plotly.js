export default function supplyDrawNewSelectionDefaults(layoutIn, layoutOut, coerce) {
    coerce('newselection.mode');
    const newselectionLineWidth = coerce('newselection.line.width');
    if (newselectionLineWidth) {
        coerce('newselection.line.color');
        coerce('newselection.line.dash');
    }
    coerce('activeselection.fillcolor');
    coerce('activeselection.opacity');
}
