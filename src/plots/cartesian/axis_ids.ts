import Registry from '../../registry.js';
import constants from './constants.js';

export var id2name = function id2name(id?: any): any {
    if(typeof id !== 'string' || !id.match(constants.AX_ID_PATTERN)) return;
    var axNum = id.split(' ')[0].slice(1);
    if(axNum === '1') axNum = '';
    return id.charAt(0) + 'axis' + axNum;
};

export var name2id = function name2id(name?: any): any {
    if(!name.match(constants.AX_NAME_PATTERN)) return;
    var axNum = name.slice(5);
    if(axNum === '1') axNum = '';
    return name.charAt(0) + axNum;
};

export var cleanId = function cleanId(id?: any, axLetter?: any, domainId?: any): any {
    var domainTest = /( domain)$/.test(id);
    if(typeof id !== 'string' || !id.match(constants.AX_ID_PATTERN)) return;
    if(axLetter && id.charAt(0) !== axLetter) return;
    if(domainTest && (!domainId)) return;
    var axNum = id.split(' ')[0].slice(1).replace(/^0+/, '');
    if(axNum === '1') axNum = '';
    return id.charAt(0) + axNum + (domainTest && domainId ? ' domain' : '');
};

export var list = function(gd?: any, axLetter?: any, only2d?: any): any {
    var fullLayout = gd._fullLayout;
    if(!fullLayout) return [];

    var idList = listIds(gd, axLetter);
    var out = new Array(idList.length);
    var i;

    for(i = 0; i < idList.length; i++) {
        var idi = idList[i];
        out[i] = fullLayout[idi.charAt(0) + 'axis' + idi.slice(1)];
    }

    if(!only2d) {
        var sceneIds3D = fullLayout._subplots.gl3d || [];

        for(i = 0; i < sceneIds3D.length; i++) {
            var scene = fullLayout[sceneIds3D[i]];

            if(axLetter) out.push(scene[axLetter + 'axis']);
            else out.push(scene.xaxis, scene.yaxis, scene.zaxis);
        }
    }

    return out;
};

export var listIds = function(gd?: any, axLetter?: any): any {
    var fullLayout = gd._fullLayout;
    if(!fullLayout) return [];

    var subplotLists = fullLayout._subplots;
    if(axLetter) return subplotLists[axLetter + 'axis'];
    return subplotLists.xaxis.concat(subplotLists.yaxis);
};

export var getFromId = function(gd?: any, id?: any, type?: any): any {
    var fullLayout = gd._fullLayout;
    // remove "domain" suffix
    id = ((id === undefined) || (typeof(id) !== 'string')) ? id : id.replace(' domain', '');

    if(type === 'x') id = id.replace(/y[0-9]*/, '');
    else if(type === 'y') id = id.replace(/x[0-9]*/, '');

    return fullLayout[id2name(id)];
};

export var getFromTrace = function(gd?: any, fullTrace?: any, type?: any): any {
    var fullLayout = gd._fullLayout;
    var ax = null;

    if(Registry.traceIs(fullTrace, 'gl3d')) {
        var scene = fullTrace.scene;
        if(scene.slice(0, 5) === 'scene') {
            ax = fullLayout[scene][type + 'axis'];
        }
    } else {
        ax = getFromId(gd, fullTrace[type + 'axis'] || type);
    }

    return ax;
};

export var idSort = function(id1?: any, id2?: any): any {
    var letter1 = id1.charAt(0);
    var letter2 = id2.charAt(0);
    if(letter1 !== letter2) return letter1 > letter2 ? 1 : -1;
    return +(id1.slice(1) || 1) - +(id2.slice(1) || 1);
};

export var ref2id = function(ar?: any): any {
    // This assumes ar has been coerced via coerceRef, and uses the shortcut of
    // checking if the first letter matches [xyz] to determine if it should
    // return the axis ID. Otherwise it returns false.
    return (/^[xyz]/.test(ar)) ? ar.split(' ')[0] : false;
};

function isFound(axId?: any, list?: any): boolean {
    if(list && list.length) {
        for(var i = 0; i < list.length; i++) {
            if(list[i][axId]) return true;
        }
    }
    return false;
}

export var isLinked = function(fullLayout?: any, axId?: any): any {
    return (
        isFound(axId, fullLayout._axisMatchGroups) ||
        isFound(axId, fullLayout._axisConstraintGroups)
    );
};

export default { id2name, name2id, cleanId, list, listIds, getFromId, getFromTrace, idSort, ref2id, isLinked };
