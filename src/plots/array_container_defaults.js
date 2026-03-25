import Lib from '../lib/index.js';
import Template from '../plot_api/plot_template.js';

export default function handleArrayContainerDefaults(parentObjIn, parentObjOut, opts) {
    var name = opts.name;
    var inclusionAttr = opts.inclusionAttr || 'visible';

    var previousContOut = parentObjOut[name];

    var contIn = Lib.isArrayOrTypedArray(parentObjIn[name]) ? parentObjIn[name] : [];
    var contOut = parentObjOut[name] = [];
    var templater = Template.arrayTemplater(parentObjOut, name, inclusionAttr);
    var i, itemOut;

    for(i = 0; i < contIn.length; i++) {
        var itemIn = contIn[i];

        if(!Lib.isPlainObject(itemIn)) {
            itemOut = templater.newItem({});
            itemOut[inclusionAttr] = false;
        } else {
            itemOut = templater.newItem(itemIn);
        }

        itemOut._index = i;

        if(itemOut[inclusionAttr] !== false) {
            opts.handleItemDefaults(itemIn, itemOut, parentObjOut, opts);
        }

        contOut.push(itemOut);
    }

    var defaultItems = templater.defaultItems();
    for(i = 0; i < defaultItems.length; i++) {
        itemOut = defaultItems[i];
        itemOut._index = contOut.length;
        opts.handleItemDefaults({}, itemOut, parentObjOut, opts, {});
        contOut.push(itemOut);
    }

    // in case this array gets its defaults rebuilt independent of the whole layout,
    // relink the private keys just for this array.
    if(Lib.isArrayOrTypedArray(previousContOut)) {
        var len = Math.min(previousContOut.length, contOut.length);
        for(i = 0; i < len; i++) {
            Lib.relinkPrivateKeys(contOut[i], previousContOut[i]);
        }
    }

    return contOut;
}
