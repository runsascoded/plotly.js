import isNumeric from 'fast-isnumeric';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import Template from '../../plot_api/plot_template.js';
import attributes from './attributes.js';

export default function(traceIn: any, traceOut: any, defaultColor: string, opts: any): void {
    var objName = 'error_' + opts.axis;
    var containerOut = Template.newContainer(traceOut, objName);
    var containerIn = traceIn[objName] || {};

    function coerce(attr: string, dflt?: any): any {
        return Lib.coerce(containerIn, containerOut, attributes, attr, dflt);
    }

    var hasErrorBars = (
        containerIn.array !== undefined ||
        containerIn.value !== undefined ||
        containerIn.type === 'sqrt'
    );

    var visible = coerce('visible', hasErrorBars);

    if(visible === false) return;

    var type = coerce('type', 'array' in containerIn ? 'data' : 'percent');
    var symmetric = true;

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

    var copyAttr = 'copy_' + opts.inherit + 'style';
    if(opts.inherit) {
        var inheritObj = traceOut['error_' + opts.inherit];
        if((inheritObj || {}).visible) {
            coerce(copyAttr, !(containerIn.color ||
                               isNumeric(containerIn.thickness) ||
                               isNumeric(containerIn.width)));
        }
    }
    if(!opts.inherit || !containerOut[copyAttr]) {
        coerce('color', defaultColor);
        coerce('thickness');
        coerce('width', Registry.traceIs(traceOut, 'gl3d') ? 0 : 4);
    }
}
