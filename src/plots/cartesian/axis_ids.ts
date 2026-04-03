import { traceIs } from '../../lib/trace_categories.js';
import constants from './constants.js';

export function id2name(id?: any): any {
    if(typeof id !== 'string' || !id.match(constants.AX_ID_PATTERN)) return;
    let axNum = id.split(' ')[0].slice(1);
    if(axNum === '1') axNum = '';
    return id.charAt(0) + 'axis' + axNum;
}

export function name2id(name?: any): any {
    if(!name.match(constants.AX_NAME_PATTERN)) return;
    let axNum = name.slice(5);
    if(axNum === '1') axNum = '';
    return name.charAt(0) + axNum;
}

export function cleanId(id?: any, axLetter?: any, domainId?: any): any {
    const domainTest = /( domain)$/.test(id);
    if(typeof id !== 'string' || !id.match(constants.AX_ID_PATTERN)) return;
    if(axLetter && id.charAt(0) !== axLetter) return;
    if(domainTest && (!domainId)) return;
    let axNum = id.split(' ')[0].slice(1).replace(/^0+/, '');
    if(axNum === '1') axNum = '';
    return id.charAt(0) + axNum + (domainTest && domainId ? ' domain' : '');
}

export function list(gd?: any, axLetter?: any, only2d?: any): any {
    const fullLayout = gd._fullLayout;
    if(!fullLayout) return [];

    const idList = listIds(gd, axLetter);
    const out = new Array(idList.length);
    let i;

    for(i = 0; i < idList.length; i++) {
        const idi = idList[i];
        out[i] = fullLayout[idi.charAt(0) + 'axis' + idi.slice(1)];
    }

    if(!only2d) {
        const sceneIds3D = fullLayout._subplots.gl3d || [];

        for(i = 0; i < sceneIds3D.length; i++) {
            const scene = fullLayout[sceneIds3D[i]];

            if(axLetter) out.push(scene[axLetter + 'axis']);
            else out.push(scene.xaxis, scene.yaxis, scene.zaxis);
        }
    }

    return out;
}

export function listIds(gd?: any, axLetter?: any): any {
    const fullLayout = gd._fullLayout;
    if(!fullLayout) return [];

    const subplotLists = fullLayout._subplots;
    if(axLetter) return subplotLists[axLetter + 'axis'];
    return subplotLists.xaxis.concat(subplotLists.yaxis);
}

export function getFromId(gd?: any, id?: any, type?: any): any {
    const fullLayout = gd._fullLayout;
    // remove "domain" suffix
    id = ((id === undefined) || (typeof(id) !== 'string')) ? id : id.replace(' domain', '');

    if(type === 'x') id = id.replace(/y[0-9]*/, '');
    else if(type === 'y') id = id.replace(/x[0-9]*/, '');

    return fullLayout[id2name(id)];
}

export function getFromTrace(gd?: any, fullTrace?: any, type?: any): any {
    const fullLayout = gd._fullLayout;
    let ax = null;

    if(traceIs(fullTrace, 'gl3d')) {
        const scene = fullTrace.scene;
        if(scene.slice(0, 5) === 'scene') {
            ax = fullLayout[scene][type + 'axis'];
        }
    } else {
        ax = getFromId(gd, fullTrace[type + 'axis'] || type);
    }

    return ax;
}

export function idSort(id1?: any, id2?: any): any {
    if(typeof id1 !== 'string' || typeof id2 !== 'string') return 0;
    const letter1 = id1.charAt(0);
    const letter2 = id2.charAt(0);
    if(letter1 !== letter2) return letter1 > letter2 ? 1 : -1;
    return +(id1.slice(1) || 1) - +(id2.slice(1) || 1);
}

export function ref2id(ar?: any): any {
    // This assumes ar has been coerced via coerceRef, and uses the shortcut of
    // checking if the first letter matches [xyz] to determine if it should
    // return the axis ID. Otherwise it returns false.
    return (/^[xyz]/.test(ar)) ? ar.split(' ')[0] : false;
}

function isFound(axId?: any, list?: any): boolean {
    if(list && list.length) {
        for(let i = 0; i < list.length; i++) {
            if(list[i][axId]) return true;
        }
    }
    return false;
}

export function isLinked(fullLayout?: any, axId?: any): any {
    return (
        isFound(axId, fullLayout._axisMatchGroups) ||
        isFound(axId, fullLayout._axisConstraintGroups)
    );
}

export default { id2name, name2id, cleanId, list, listIds, getFromId, getFromTrace, idSort, ref2id, isLinked };
