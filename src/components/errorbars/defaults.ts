import isNumeric from 'fast-isnumeric';
import { traceIs } from '../../lib/trace_categories.js';
import Lib from '../../lib/index.js';
import Template from '../../plot_api/plot_template.js';
import attributes from './attributes.js';

export default function(traceIn: any, traceOut: any, defaultColor: string, opts: any): void {
    const objName = 'error_' + opts.axis;
    const containerOut = Template.newContainer(traceOut, objName);
    const containerIn = traceIn[objName] || {};

    function coerce(attr: string, dflt?: any): any {
        return Lib.coerce(containerIn, containerOut, attributes, attr, dflt);
    }

    const hasErrorBars = (
        containerIn.array !== undefined ||
        containerIn.value !== undefined ||
        containerIn.type === 'sqrt'
    );

    const visible = coerce('visible', hasErrorBars);

    if(visible === false) return;

    const type = coerce('type', 'array' in containerIn ? 'data' : 'percent');
    let symmetric = true;

    if(type !== 'sqrt') {
        symmetric = coerce('symmetric',
            !((type === 'data' ? 'arrayminus' : 'valueminus') in containerIn));
    }

    if(type === 'data') {
        coerce('array');
        coerce('traceref');
        if(!symmetric) {
            coerce('arrayminus');
            coerce('tracerefminus');
        }
    } else if(type === 'percent' || type === 'constant') {
        coerce('value');
        if(!symmetric) coerce('valueminus');
    }

    const copyAttr = 'copy_' + opts.inherit + 'style';
    if(opts.inherit) {
        const inheritObj = traceOut['error_' + opts.inherit];
        if((inheritObj || {}).visible) {
            coerce(copyAttr, !(containerIn.color ||
                               isNumeric(containerIn.thickness) ||
                               isNumeric(containerIn.width)));
        }
    }
    if(!opts.inherit || !containerOut[copyAttr]) {
        coerce('color', defaultColor);
        coerce('thickness');
        coerce('width', traceIs(traceOut, 'gl3d') ? 0 : 4);
    }
}
