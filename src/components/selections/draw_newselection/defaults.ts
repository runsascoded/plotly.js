import type { FullLayout } from '../../../../types/core';

export default function supplyDrawNewSelectionDefaults(layoutIn: any, layoutOut: FullLayout, coerce: any) {
    coerce('newselection.mode');

    var newselectionLineWidth = coerce('newselection.line.width');
    if(newselectionLineWidth) {
        coerce('newselection.line.color');
        coerce('newselection.line.dash');
    }

    coerce('activeselection.fillcolor');
    coerce('activeselection.opacity');
}
