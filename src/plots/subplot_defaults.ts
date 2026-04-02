import Lib from '../lib/index.js';
import Template from '../plot_api/plot_template.js';
import { defaults as handleDomainDefaults } from './domain.js';

export default function handleSubplotDefaults(layoutIn?: any, layoutOut?: any, fullData?: any, opts?: any): void {
    const subplotType = opts.type;
    const subplotAttributes = opts.attributes;
    const handleDefaults = opts.handleDefaults;
    const partition = opts.partition || 'x';

    const ids = layoutOut._subplots[subplotType];
    const idsLength = ids.length;

    const baseId = idsLength && ids[0].replace(/\d+$/, '');

    let subplotLayoutIn, subplotLayoutOut;

    function coerce(attr?: any, dflt?: any) {
        return Lib.coerce(subplotLayoutIn, subplotLayoutOut, subplotAttributes, attr, dflt);
    }

    for(let i = 0; i < idsLength; i++) {
        const id = ids[i];

        // ternary traces get a layout ternary for free!
        if(layoutIn[id]) subplotLayoutIn = layoutIn[id];
        else subplotLayoutIn = layoutIn[id] = {};

        subplotLayoutOut = Template.newContainer(layoutOut, id, baseId);

        if(!opts.noUirevision) coerce('uirevision', layoutOut.uirevision);

        const dfltDomains: any = {};
        dfltDomains[partition] = [i / idsLength, (i + 1) / idsLength];
        handleDomainDefaults(subplotLayoutOut, layoutOut, coerce, dfltDomains);

        opts.id = id;
        handleDefaults(subplotLayoutIn, subplotLayoutOut, coerce, opts);
    }
}
