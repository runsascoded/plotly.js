import Lib from '../../lib/index.js';
import Color from '../color/index.js';
import Template from '../../plot_api/plot_template.js';
import attributes from './attributes.js';
export default function supplyLayoutDefaults(layoutIn, layoutOut) {
    const containerIn = layoutIn.modebar || {};
    const containerOut = Template.newContainer(layoutOut, 'modebar');
    function coerce(attr, dflt) {
        return Lib.coerce(containerIn, containerOut, attributes, attr, dflt);
    }
    coerce('orientation');
    coerce('bgcolor', Color.addOpacity(layoutOut.paper_bgcolor, 0.5));
    const defaultColor = Color.contrast(Color.rgb(layoutOut.modebar.bgcolor));
    coerce('color', Color.addOpacity(defaultColor, 0.3));
    coerce('activecolor', Color.addOpacity(defaultColor, 0.7));
    coerce('uirevision', layoutOut.uirevision);
    coerce('add');
    coerce('remove');
}
