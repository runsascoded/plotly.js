import { isArrayOrTypedArray, isPlainObject, relinkPrivateKeys } from '../lib/index.js';
import Template from '../plot_api/plot_template.js';

export default function handleArrayContainerDefaults(parentObjIn?: any, parentObjOut?: any, opts?: any): any {
    const name = opts.name;
    const inclusionAttr = opts.inclusionAttr || 'visible';

    const previousContOut = parentObjOut[name];

    const contIn = isArrayOrTypedArray(parentObjIn[name]) ? parentObjIn[name] : [];
    const contOut = parentObjOut[name] = [] as any[];
    const templater = Template.arrayTemplater(parentObjOut, name, inclusionAttr);
    let i, itemOut;

    for(i = 0; i < contIn.length; i++) {
        const itemIn = contIn[i];

        if(!isPlainObject(itemIn)) {
            itemOut = templater.newItem({});
            itemOut[inclusionAttr] = false;
        } else {
            itemOut = templater.newItem(itemIn);
        }

        itemOut._index = i;

        if(itemOut[inclusionAttr] !== false) {
            opts.handleItemDefaults(itemIn, itemOut, parentObjOut, opts);
        }

        contOut.push((itemOut as any));
    }

    const defaultItems = templater.defaultItems();
    for(i = 0; i < defaultItems.length; i++) {
        itemOut = defaultItems[i];
        itemOut._index = contOut.length;
        opts.handleItemDefaults({}, itemOut, parentObjOut, opts, {});
        contOut.push((itemOut as any));
    }

    // in case this array gets its defaults rebuilt independent of the whole layout,
    // relink the private keys just for this array.
    if(isArrayOrTypedArray(previousContOut)) {
        const len = Math.min(previousContOut.length, contOut.length);
        for(i = 0; i < len; i++) {
            relinkPrivateKeys(contOut[i], previousContOut[i]);
        }
    }

    return contOut;
}
