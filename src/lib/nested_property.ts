import isNumeric from 'fast-isnumeric';
import { isArrayOrTypedArray } from './array.js';

interface NestedPropertyResult {
    set: (val: any) => void;
    get: (retainNull?: boolean) => any;
    astr: string;
    parts: (string | number)[];
    obj: any;
}

export default function nestedProperty(container: any, propStr: string | number): NestedPropertyResult {
    if(isNumeric(propStr)) propStr = String(propStr);
    else if(typeof propStr !== 'string' ||
            (propStr as string).slice(-4) === '[-1]') {
        throw 'bad property string';
    }

    const propParts: (string | number)[] = (propStr as string).split('.');
    let indexed: RegExpMatchArray | null;
    let indices: string[];
    let i: number, j: number;

    for(j = 0; j < propParts.length; j++) {
        // guard against polluting __proto__ and other internals
        if(String(propParts[j]).slice(0, 2) === '__') {
            throw 'bad property string';
        }
    }

    // check for parts of the nesting hierarchy that are numbers (ie array elements)
    j = 0;
    while(j < propParts.length) {
        // look for non-bracket chars, then any number of [##] blocks
        indexed = String(propParts[j]).match(/^([^\[\]]*)((\[\-?[0-9]*\])+)$/);
        if(indexed) {
            if(indexed[1]) propParts[j] = indexed[1];
            // allow propStr to start with bracketed array indices
            else if(j === 0) propParts.splice(0, 1);
            else throw 'bad property string';

            indices = indexed[2]
                .slice(1, -1)
                .split('][');

            for(i = 0; i < indices.length; i++) {
                j++;
                propParts.splice(j, 0, Number(indices[i]));
            }
        }
        j++;
    }

    if(typeof container !== 'object') {
        return badContainer(container, propStr as string, propParts);
    }

    return {
        set: npSet(container, propParts, propStr as string),
        get: npGet(container, propParts),
        astr: propStr as string,
        parts: propParts,
        obj: container
    };
}

function npGet(cont: any, parts: (string | number)[]): (retainNull?: boolean) => any {
    return function(retainNull?: boolean): any {
        let curCont = cont;
        let curPart: string | number;
        let allSame: boolean;
        let out: any;
        let i: number;
        let j: number;

        for(i = 0; i < parts.length - 1; i++) {
            curPart = parts[i];
            if(curPart === -1) {
                allSame = true;
                out = [];
                for(j = 0; j < curCont.length; j++) {
                    out[j] = npGet(curCont[j], parts.slice(i + 1))(retainNull);
                    if(out[j] !== out[0]) allSame = false;
                }
                return allSame ? out[0] : out;
            }
            if(typeof curPart === 'number' && !isArrayOrTypedArray(curCont)) {
                return undefined;
            }
            curCont = curCont[curPart];
            if(typeof curCont !== 'object' || curCont === null) {
                return undefined;
            }
        }

        // only hit this if parts.length === 1
        if(typeof curCont !== 'object' || curCont === null) return undefined;

        out = curCont[parts[i]];
        if(!retainNull && (out === null)) return undefined;
        return out;
    };
}

/*
 * Can this value be deleted? We can delete `undefined`, and `null` except INSIDE an
 * *args* array.
 *
 * Previously we also deleted some `{}` and `[]`, in order to try and make set/unset
 * a net noop; but this causes far more complication than it's worth, and still had
 * lots of exceptions. See https://github.com/plotly/plotly.js/issues/1410
 *
 * *args* arrays get passed directly to API methods and we should respect null if
 * the user put it there, but otherwise null is deleted as we use it as code
 * in restyle/relayout/update for "delete this value" whereas undefined means
 * "ignore this edit"
 */
const ARGS_PATTERN = /(^|\.)args\[/;
function isDeletable(val: any, propStr: string): boolean {
    return (val === undefined) || (val === null && !propStr.match(ARGS_PATTERN));
}

function npSet(cont: any, parts: (string | number)[], propStr: string): (val: any) => void {
    return function(val: any): any {
        let curCont = cont;
        let propPart = '';
        const containerLevels: [any, string][] = [[cont, propPart]];
        let toDelete = isDeletable(val, propStr);
        let curPart: string | number;
        let i: number;

        for(i = 0; i < parts.length - 1; i++) {
            curPart = parts[i];

            if(typeof curPart === 'number' && !isArrayOrTypedArray(curCont)) {
                throw 'array index but container is not an array';
            }

            // handle special -1 array index
            if(curPart === -1) {
                toDelete = !setArrayAll(curCont, parts.slice(i + 1), val, propStr);
                if(toDelete) break;
                else return;
            }

            if(!checkNewContainer(curCont, curPart, parts[i + 1], toDelete)) {
                break;
            }

            curCont = curCont[curPart];

            if(typeof curCont !== 'object' || curCont === null) {
                throw 'container is not an object';
            }

            propPart = joinPropStr(propPart, curPart);

            containerLevels.push([curCont, propPart]);
        }

        if(toDelete) {
            if(i === parts.length - 1) {
                delete curCont[parts[i]];

                // The one bit of pruning we still do: drop `undefined` from the end of arrays.
                // In case someone has already unset previous items, continue until we hit a
                // non-undefined value.
                if(Array.isArray(curCont) && +parts[i] === curCont.length - 1) {
                    while(curCont.length && curCont[curCont.length - 1] === undefined) {
                        curCont.pop();
                    }
                }
            }
        } else curCont[parts[i]] = val;
    };
}

function joinPropStr(propStr: string, newPart: string | number): string {
    let toAdd: string;
    if(isNumeric(newPart)) toAdd = '[' + newPart + ']';
    else if(propStr) toAdd = '.' + newPart;
    else toAdd = String(newPart);

    return propStr + toAdd;
}

// handle special -1 array index
function setArrayAll(containerArray: any[], innerParts: (string | number)[], val: any, propStr: string): boolean {
    const arrayVal = isArrayOrTypedArray(val);
    let allSet = true;
    let thisVal = val;
    let thisPropStr = propStr.replace('-1', '0');
    let deleteThis = arrayVal ? false : isDeletable(val, thisPropStr);
    const firstPart = innerParts[0];
    let i: number;

    for(i = 0; i < containerArray.length; i++) {
        thisPropStr = propStr.replace('-1', String(i));
        if(arrayVal) {
            thisVal = val[i % val.length];
            deleteThis = isDeletable(thisVal, thisPropStr);
        }
        if(deleteThis) allSet = false;
        if(!checkNewContainer(containerArray, i, firstPart, deleteThis)) {
            continue;
        }
        npSet(containerArray[i], innerParts, propStr.replace('-1', String(i)))(thisVal);
    }
    return allSet;
}

/**
 * make new sub-container as needed.
 * returns false if there's no container and none is needed
 * because we're only deleting an attribute
 */
function checkNewContainer(container: any, part: string | number, nextPart: string | number, toDelete: boolean): boolean {
    if(container[part] === undefined) {
        if(toDelete) return false;

        if(typeof nextPart === 'number') container[part] = [];
        else container[part] = {};
    }
    return true;
}

function badContainer(container: any, propStr: string, propParts: (string | number)[]): NestedPropertyResult {
    return {
        set: function() { throw 'bad container'; },
        get: function() {},
        astr: propStr,
        parts: propParts,
        obj: container
    };
}
