import { selection } from 'd3-selection';
import { utcFormat } from 'd3-time-format';
import { format as d3Format } from 'd3-format';
import isNumeric from 'fast-isnumeric';
import numConstants from '../constants/numerical.js';
import type { GraphDiv } from '../../types/core';

export { isArrayBuffer, isTypedArray, isArrayOrTypedArray, isArray1D, ensureArray, concat, maxRowLength, minRowLength } from './array.js';
export { mod, modHalf } from './mod.js';
export { valObjectMeta, coerce, coerce2, coerceFont, coercePattern, coerceHoverinfo, coerceSelectionMarkerOpacity, validate } from './coerce.js';
export { dateTime2ms, isDateTime, ms2DateTime, ms2DateTimeLocal, cleanDate, isJSDate, formatDate, incrementMonth, dateTick0, dfltRange, findExactDates, MIN_MS, MAX_MS } from './dates.js';
export { findBin, sorterAsc, sorterDes, distinctVals, roundUp, sort, findIndexOfMin } from './search.js';
export { aggNums, len, mean, geometricMean, median, midRange, variance, stdev, interp } from './stats.js';
export { init2dArray, transposeRagged, dot, translationMatrix, rotationMatrix, rotationXYMatrix, apply3DTransform, apply2DTransform, apply2DTransform2, convertCssMatrix, inverseTransformMatrix } from './matrix.js';
export { deg2rad, rad2deg, angleDelta, angleDist, isFullCircle, isAngleInsideSector, isPtInsideSector, pathArc, pathSector, pathAnnulus } from './angles.js';
export { isLeftAnchor, isCenterAnchor, isRightAnchor, isTopAnchor, isMiddleAnchor, isBottomAnchor } from './anchor_utils.js';
export { segmentsIntersect, segmentDistance, getTextLocation, clearLocationCache, getVisibleSegment, findPointOnPath } from './geometry2d.js';
export { extendFlat, extendDeep, extendDeepAll, extendDeepNoArrays } from './extend.js';
export { log, warn, error } from './loggers.js';
export { getGraphDiv, isPlotDiv, removeElement, addStyleRule, addRelatedStyleRule, deleteRelatedStyleRule, setStyleOnHover, getFullTransformMatrix, getElementTransformMatrix, getElementAndAncestors, equalDomRects } from './dom.js';

import { counter as counterRegex } from './regex.js';
export { counterRegex };

import { throttle, done as throttleDone, clear as clearThrottle } from './throttle.js';
export { throttle, throttleDone, clearThrottle };

import _nestedProperty from './nested_property.js';
export const nestedProperty: any = _nestedProperty;

import _keyedContainer from './keyed_container.js';
export const keyedContainer: any = _keyedContainer;

import _relativeAttr from './relative_attr.js';
export const relativeAttr: any = _relativeAttr;

import _isPlainObject from './is_plain_object.js';
export const isPlainObject: any = _isPlainObject;

import _toLogRange from './to_log_range.js';
export const toLogRange: any = _toLogRange;

import _relinkPrivateKeys from './relink_private.js';
export const relinkPrivateKeys: any = _relinkPrivateKeys;

import _sortObjectKeys from './sort_object_keys.js';
export const sortObjectKeys: any = _sortObjectKeys;

import _clearResponsive from './clear_responsive.js';
export const clearResponsive: any = _clearResponsive;

import _preserveDrawingBuffer from './preserve_drawing_buffer.js';
export const preserveDrawingBuffer: any = _preserveDrawingBuffer;

import _makeTraceGroups from './make_trace_groups.js';
export const makeTraceGroups: any = _makeTraceGroups;

import _localize from './localize.js';
export { _localize as _ };

import _notifier from './notifier.js';
export const notifier: any = _notifier;

import _filterUnique from './filter_unique.js';
export const filterUnique: any = _filterUnique;

import _filterVisible from './filter_visible.js';
export const filterVisible: any = _filterVisible;

import _pushUnique from './push_unique.js';
export const pushUnique: any = _pushUnique;

import _increment from './increment.js';
export const increment: any = _increment;

import _cleanNumber from './clean_number.js';
export const cleanNumber: any = _cleanNumber;

import _noop from './noop.js';
export const noop: any = _noop;

import _identity from './identity.js';
export const identity: any = _identity;

// Re-import modules needed by inline functions
import { isArrayOrTypedArray, isTypedArray } from './array.js';
import { extendFlat, extendDeepNoArrays } from './extend.js';
import { warn } from './loggers.js';
import { formatDate, dateTime2ms } from './dates.js';

const MAX_SAFE: number = numConstants.FP_SAFE;
const MIN_SAFE: number = -MAX_SAFE;
const BADNUM: number = (numConstants.BADNUM as any);

export function setAttrs(sel: any, attrs: Record<string, any>): any {
    for(const k in attrs) sel.attr(k, attrs[k]);
    return sel;
}

export function adjustFormat(formatStr: string): string {
    if (!formatStr || /^\d[.]\df/.test(formatStr) || /[.]\d%/.test(formatStr)) return formatStr;

    if (formatStr === '0.f') return '~f';
    if (/^\d%/.test(formatStr)) return '~%';
    if (/^\ds/.test(formatStr)) return '~s';

    // try adding tilde to the start of format in order to trim
    if (!/^[~,.0$]/.test(formatStr) && /[&fps]/.test(formatStr)) return '~' + formatStr;

    return formatStr;
}

const seenBadFormats: Record<string, number> = {};
export function warnBadFormat(f: any): void {
    const key = String(f);
    if (!seenBadFormats[key]) {
        seenBadFormats[key] = 1;
        warn('encountered bad format: "' + key + '"');
    }
}

export function noFormat(value: any): string {
    return String(value);
}

export function numberFormat(formatStr: string): (v: any) => string {
    let fn: (v: any) => string;
    try {
        fn = d3Format(adjustFormat(formatStr));
    } catch (e) {
        warnBadFormat(formatStr);
        return noFormat;
    }

    return fn;
}

export function ensureNumber(v: any): number {
    if (!isNumeric(v)) return BADNUM;
    v = Number(v);
    return v > MAX_SAFE || v < MIN_SAFE ? BADNUM : v;
}

/**
 * Is v a valid array index? Accepts numeric strings as well as numbers.
 *
 * @param {any} v: the value to test
 * @param {Optional[integer]} len: the array length we are indexing
 *
 * @return {bool}: v is a valid array index
 */
export function isIndex(v: any, len?: number): boolean {
    if (len !== undefined && v >= len) return false;
    return isNumeric(v) && v >= 0 && v % 1 === 0;
}

/**
 * create an array of length 'cnt' filled with 'v' at all indices
 *
 * @param {any} v
 * @param {number} cnt
 * @return {array}
 */
export function repeat(v: any, cnt: number): any[] {
    const out = new Array(cnt);
    for (let i = 0; i < cnt; i++) {
        out[i] = v;
    }
    return out;
}

/**
 * swap x and y of the same attribute in container cont
 * specify attr with a ? in place of x/y
 * you can also swap other things than x/y by providing part1 and part2
 */
export function swapAttrs(cont: any, attrList: string[], part1?: string, part2?: string): void {
    if (!part1) part1 = 'x';
    if (!part2) part2 = 'y';
    for (let i = 0; i < attrList.length; i++) {
        const attr = attrList[i];
        const xp = nestedProperty(cont, attr.replace('?', part1));
        const yp = nestedProperty(cont, attr.replace('?', part2));
        const temp = xp.get();
        xp.set(yp.get());
        yp.set(temp);
    }
}

/**
 * SVG painter's algo worked around with reinsertion
 */
export function raiseToTop(elem: any): void {
    elem.parentNode.appendChild(elem);
}

/**
 * cancel a possibly pending transition; returned selection may be used by caller
 */
export function cancelTransition(sel: any): any {
    return sel.transition().duration(0);
}

// constrain - restrict a number v to be between v0 and v1
export function constrain(v: number, v0: number, v1: number): number {
    if (v0 > v1) return Math.max(v1, Math.min(v0, v));
    return Math.max(v0, Math.min(v1, v));
}

/**
 * do two bounding boxes from getBoundingClientRect,
 * ie {left,right,top,bottom,width,height}, overlap?
 * takes optional padding pixels
 */
export function bBoxIntersect(a: any, b: any, pad?: number): boolean {
    pad = pad || 0;
    return a.left <= b.right + pad && b.left <= a.right + pad && a.top <= b.bottom + pad && b.top <= a.bottom + pad;
}

/*
 * simpleMap: alternative to Array.map that only
 * passes on the element and up to 2 extra args you
 * provide (but not the array index or the whole array)
 *
 * array: the array to map it to
 * func: the function to apply
 * x1, x2: optional extra args
 */
export function simpleMap(array: any[], func: any, x1?: any, x2?: any, opts?: any): any[] {
    const len = array.length;
    const out = new Array(len);
    for (let i = 0; i < len; i++) out[i] = func(array[i], x1, x2, opts);
    return out;
}

/**
 * Random string generator
 *
 * @param {object} existing
 *     pass in strings to avoid as keys with truthy values
 * @param {int} bits
 *     bits of information in the output string, default 24
 * @param {int} base
 *     base of string representation, default 16. Should be a power of 2.
 */
export function randstr(existing?: any, bits?: number, base?: number, _recursion?: number): string {
    if (!base) base = 16;
    if (bits === undefined) bits = 24;
    if (bits <= 0) return '0';

    let digits = Math.log(Math.pow(2, bits)) / Math.log(base);
    let res = '';
    let i: number, b: number, x: string;

    for (i = 2; digits === Infinity; i *= 2) {
        digits = (Math.log(Math.pow(2, bits / i)) / Math.log(base)) * i;
    }

    const rem = digits - Math.floor(digits);

    for (i = 0; i < Math.floor(digits); i++) {
        x = Math.floor(Math.random() * base).toString(base);
        res = x + res;
    }

    if (rem) {
        b = Math.pow(base, rem);
        x = Math.floor(Math.random() * b).toString(base);
        res = x + res;
    }

    const parsed = parseInt(res, base);
    if ((existing && existing[res]) || (parsed !== Infinity && parsed >= Math.pow(2, bits))) {
        if (_recursion! > 10) {
            warn('randstr failed uniqueness');
            return res;
        }
        return randstr(existing, bits, base, (_recursion || 0) + 1);
    } else return res;
}

export function OptionControl(opt?: any, optname?: string): any {
    /*
     * An environment to contain all option setters and
     * getters that collectively modify opts.
     *
     * You can call up opts from any function in new object
     * as this.optname || this.opt
     *
     * See FitOpts for example of usage
     */
    if (!opt) opt = {};
    if (!optname) optname = 'opt';

    const self: any = {};
    self.optionList = [];

    self._newoption = function (optObj: any) {
        optObj[optname!] = opt;
        self[optObj.name] = optObj;
        self.optionList.push(optObj);
    };

    self['_' + optname] = opt;
    return self;
}

/**
 * lib.smooth: smooth arrayIn by convolving with
 * a hann window with given full width at half max
 * bounce the ends in, so the output has the same length as the input
 */
export function smooth(arrayIn: number[], FWHM: number): number[] {
    FWHM = Math.round(FWHM) || 0; // only makes sense for integers
    if (FWHM < 2) return arrayIn;

    const alen = arrayIn.length;
    const alen2 = 2 * alen;
    const wlen = 2 * FWHM - 1;
    const w = new Array(wlen);
    const arrayOut = new Array(alen);
    let i: number;
    let j: number;
    let k: number;
    let v: number;

    // first make the window array
    for (i = 0; i < wlen; i++) {
        w[i] = (1 - Math.cos((Math.PI * (i + 1)) / FWHM)) / (2 * FWHM);
    }

    // now do the convolution
    for (i = 0; i < alen; i++) {
        v = 0;
        for (j = 0; j < wlen; j++) {
            k = i + j + 1 - FWHM;

            // multibounce
            if (k < -alen) k -= alen2 * Math.round(k / alen2);
            else if (k >= alen2) k -= alen2 * Math.floor(k / alen2);

            // single bounce
            if (k < 0) k = -1 - k;
            else if (k >= alen) k = alen2 - 1 - k;

            v += arrayIn[k] * w[j];
        }
        arrayOut[i] = v;
    }

    return arrayOut;
}

/**
 * syncOrAsync: run a sequence of functions synchronously
 * as long as its returns are not promises (ie have no .then)
 * includes one argument arg to send to all functions...
 * this is mainly just to prevent us having to make wrapper functions
 * when the only purpose of the wrapper is to reference gd
 * and a final step to be executed at the end
 * TODO: if there's an error and everything is sync,
 * this doesn't happen yet because we want to make sure
 * that it gets reported
 */
export function syncOrAsync(sequence: any[], arg?: any, finalStep?: any): any {
    let ret: any, fni: any;

    function continueAsync(): any {
        return syncOrAsync(sequence, arg, finalStep);
    }

    while (sequence.length) {
        fni = sequence.splice(0, 1)[0];
        ret = fni(arg);

        if (ret && ret.then) {
            return ret.then(continueAsync);
        }
    }

    return finalStep && finalStep(arg);
}

/**
 * Helper to strip trailing slash, from
 * http://stackoverflow.com/questions/6680825/return-string-without-trailing-slash
 */
export function stripTrailingSlash(str: string): string {
    if (str.slice(-1) === '/') return str.slice(0, -1);
    return str;
}

export function noneOrAll(containerIn: any, containerOut: any, attrList: string[]): void {
    /**
     * some attributes come together, so if you have one of them
     * in the input, you should copy the default values of the others
     * to the input as well.
     */
    if (!containerIn) return;

    let hasAny = false;
    let hasAll = true;
    let i: number;
    let val: any;

    for (i = 0; i < attrList.length; i++) {
        val = containerIn[attrList[i]];
        if (val !== undefined && val !== null) hasAny = true;
        else hasAll = false;
    }

    if (hasAny && !hasAll) {
        for (i = 0; i < attrList.length; i++) {
            containerIn[attrList[i]] = containerOut[attrList[i]];
        }
    }
}

/** merges calcdata field (given by cdAttr) with traceAttr values
 *
 * N.B. Loop over minimum of cd.length and traceAttr.length
 * i.e. it does not try to fill in beyond traceAttr.length-1
 *
 * @param {array} traceAttr : trace attribute
 * @param {object} cd : calcdata trace
 * @param {string} cdAttr : calcdata key
 */
export function mergeArray(traceAttr: any, cd: any[], cdAttr: string, fn?: (v: any) => any): void {
    const hasFn = typeof fn === 'function';
    if (isArrayOrTypedArray(traceAttr)) {
        const imax = Math.min(traceAttr.length, cd.length);
        for (let i = 0; i < imax; i++) {
            const v = traceAttr[i];
            cd[i][cdAttr] = hasFn ? fn!(v) : v;
        }
    }
}

// cast numbers to positive numbers, returns 0 if not greater than 0
export function mergeArrayCastPositive(traceAttr: any, cd: any[], cdAttr: string): void {
    return mergeArray(traceAttr, cd, cdAttr, function (v: any) {
        const w = +v;
        return !isFinite(w) ? 0 : w > 0 ? w : 0;
    });
}

/** fills calcdata field (given by cdAttr) with traceAttr values
 *  or function of traceAttr values (e.g. some fallback)
 *
 * N.B. Loops over all cd items.
 *
 * @param {array} traceAttr : trace attribute
 * @param {object} cd : calcdata trace
 * @param {string} cdAttr : calcdata key
 * @param {function} [fn] : optional function to apply to each array item
 */
export function fillArray(traceAttr: any, cd: any[], cdAttr: string, fn?: (v: any) => any): void {
    fn = fn || identity;

    if (isArrayOrTypedArray(traceAttr)) {
        for (let i = 0; i < cd.length; i++) {
            cd[i][cdAttr] = fn!(traceAttr[i]);
        }
    }
}

/** Handler for trace-wide vs per-point options
 *
 * @param {object} trace : (full) trace object
 * @param {number} ptNumber : index of the point in question
 * @param {string} astr : attribute string
 * @param {function} [fn] : optional function to apply to each array item
 *
 * @return {any}
 */
export function castOption(trace: any, ptNumber: any, astr: string, fn?: (v: any) => any): any {
    fn = fn || identity;

    const val = nestedProperty(trace, astr).get();

    if (isArrayOrTypedArray(val)) {
        if (Array.isArray(ptNumber) && isArrayOrTypedArray(val[ptNumber[0]])) {
            return fn!(val[ptNumber[0]][ptNumber[1]]);
        } else {
            return fn!(val[ptNumber]);
        }
    } else {
        return val;
    }
}

/** Extract option from calcdata item, correctly falling back to
 *  trace value if not found.
 *
 *  @param {object} calcPt : calcdata[i][j] item
 *  @param {object} trace : (full) trace object
 *  @param {string} calcKey : calcdata key
 *  @param {string} traceKey : aka trace attribute string
 *  @return {any}
 */
export function extractOption(calcPt: any, trace: any, calcKey: string, traceKey: string): any {
    if (calcKey in calcPt) return calcPt[calcKey];

    // fallback to trace value,
    //   must check if value isn't itself an array
    //   which means the trace attribute has a corresponding
    //   calcdata key, but its value is falsy
    const traceVal = nestedProperty(trace, traceKey).get();
    if (!Array.isArray(traceVal)) return traceVal;
}

function makePtIndex2PtNumber(indexToPoints: any): Record<string, number> {
    const ptIndex2ptNumber: Record<string, number> = {};
    for (const k in indexToPoints) {
        const pts = indexToPoints[k];
        for (let j = 0; j < pts.length; j++) {
            ptIndex2ptNumber[pts[j]] = +k;
        }
    }
    return ptIndex2ptNumber;
}

/** Tag selected calcdata items
 *
 * N.B. note that point 'index' corresponds to input data array index
 *  whereas 'number' is its post-transform version.
 *
 * @param {array} calcTrace
 * @param {object} trace
 *  - selectedpoints {array}
 *  - _indexToPoints {object}
 * @param {ptNumber2cdIndex} ptNumber2cdIndex (optional)
 *  optional map object for trace types that do not have 1-to-1 point number to
 *  calcdata item index correspondence (e.g. histogram)
 */
export function tagSelected(calcTrace: any[], trace: any, ptNumber2cdIndex?: any): void {
    const selectedpoints = trace.selectedpoints;
    const indexToPoints = trace._indexToPoints;
    let ptIndex2ptNumber: any;

    // make pt index-to-number map object, which takes care of transformed traces
    if (indexToPoints) {
        ptIndex2ptNumber = makePtIndex2PtNumber(indexToPoints);
    }

    function isCdIndexValid(v: any): boolean {
        return v !== undefined && v < calcTrace.length;
    }

    for (let i = 0; i < selectedpoints.length; i++) {
        const ptIndex = selectedpoints[i];

        if (
            isIndex(ptIndex) ||
            (isArrayOrTypedArray(ptIndex) && isIndex(ptIndex[0]) && isIndex(ptIndex[1]))
        ) {
            const ptNumber = ptIndex2ptNumber ? ptIndex2ptNumber[ptIndex] : ptIndex;
            const cdIndex = ptNumber2cdIndex ? ptNumber2cdIndex[ptNumber] : ptNumber;

            if (isCdIndexValid(cdIndex)) {
                calcTrace[cdIndex].selected = 1;
            }
        }
    }
}

export function selIndices2selPoints(trace: any): any {
    const selectedpoints = trace.selectedpoints;
    const indexToPoints = trace._indexToPoints;

    if (indexToPoints) {
        const ptIndex2ptNumber = makePtIndex2PtNumber(indexToPoints);
        const out: any[] = [];

        for (let i = 0; i < selectedpoints.length; i++) {
            const ptIndex = selectedpoints[i];
            if (isIndex(ptIndex)) {
                const ptNumber = ptIndex2ptNumber[ptIndex];
                if (isIndex(ptNumber)) {
                    out.push(ptNumber);
                }
            }
        }

        return out;
    } else {
        return selectedpoints;
    }
}

/** Returns target as set by 'target' transform attribute
 *
 * @param {object} trace : full trace object
 * @param {object} transformOpts : transform option object
 *  - target (string} :
 *      either an attribute string referencing an array in the trace object, or
 *      a set array.
 *
 * @return {array or false} : the target array (NOT a copy!!) or false if invalid
 */
export function getTargetArray(trace: any, transformOpts: any): any[] | false {
    const target = transformOpts.target;

    if (typeof target === 'string' && target) {
        const array = nestedProperty(trace, target).get();
        return isArrayOrTypedArray(array) ? array : false;
    } else if (isArrayOrTypedArray(target)) {
        return target;
    }

    return false;
}

/**
 * modified version of jQuery's extend to strip out private objs and functions,
 * and cut arrays down to first <arraylen> or 1 elements
 * because extend-like algorithms are hella slow
 * obj2 is assumed to already be clean of these things (including no arrays)
 */
export function minExtend(obj1: any, obj2: any, opt?: string): any {
    const objOut: any = {};
    if (typeof obj2 !== 'object') obj2 = {};

    const arrayLen = opt === 'pieLike' ? -1 : 3;

    let keys = Object.keys(obj1);
    let i: number, k: string, v: any;

    for (i = 0; i < keys.length; i++) {
        k = keys[i];
        v = obj1[k];
        if (k.charAt(0) === '_' || typeof v === 'function') continue;
        else if (k === 'module') objOut[k] = v;
        else if (Array.isArray(v)) {
            if (k === 'colorscale' || arrayLen === -1) {
                objOut[k] = v.slice();
            } else {
                objOut[k] = v.slice(0, arrayLen);
            }
        } else if (isTypedArray(v)) {
            if (arrayLen === -1) {
                objOut[k] = v.subarray();
            } else {
                objOut[k] = v.subarray(0, arrayLen);
            }
        } else if (v && typeof v === 'object') objOut[k] = minExtend(obj1[k], obj2[k], opt);
        else objOut[k] = v;
    }

    keys = Object.keys(obj2);
    for (i = 0; i < keys.length; i++) {
        k = keys[i];
        v = obj2[k];
        if (typeof v !== 'object' || !(k in objOut) || typeof objOut[k] !== 'object') {
            objOut[k] = v;
        }
    }

    return objOut;
}

export function titleCase(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function containsAny(s: string, fragments: string[]): boolean {
    for (let i = 0; i < fragments.length; i++) {
        if (s.indexOf(fragments[i]) !== -1) return true;
    }
    return false;
}

const IS_SAFARI_REGEX = /Version\/[\d\.]+.*Safari/;
export function isSafari(): boolean {
    return IS_SAFARI_REGEX.test(window.navigator.userAgent);
}

const IS_IOS_REGEX = /iPad|iPhone|iPod/;
export function isIOS(): boolean {
    return IS_IOS_REGEX.test(window.navigator.userAgent);
}

// The WKWebView user agent string doesn't include 'Safari', so we need a separate test
// for a UA string like this:
// Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)
const IS_MAC_WKWEBVIEW_REGEX = /Macintosh.+AppleWebKit.+Gecko\)$/;
export const isMacWKWebView = (): boolean => IS_MAC_WKWEBVIEW_REGEX.test(window.navigator.userAgent);

const FIREFOX_VERSION_REGEX = /Firefox\/(\d+)\.\d+/;
export function getFirefoxVersion(): number | null {
    const match = FIREFOX_VERSION_REGEX.exec(window.navigator.userAgent);
    if (match && match.length === 2) {
        const versionInt = parseInt(match[1]);
        if (!isNaN(versionInt)) {
            return versionInt;
        }
    }
    return null;
}

export function isD3Selection(obj: any): boolean {
    return obj instanceof selection;
}

/**
 * Append element to DOM only if not present.
 *
 * @param {d3 selection} parent : parent selection of the element in question
 * @param {string} nodeType : node type of element to append
 * @param {string} className (optional) : class name of element in question
 * @param {fn} enterFn (optional) : optional fn applied to entering elements only
 * @return {d3 selection} selection of new layer
 *
 * Previously, we were using the following pattern:
 *
 * ```
 * const sel = parent.selectAll('.' + className)
 *     .data([0]);
 *
 * sel.enter().append(nodeType)
 *     .classed(className, true);
 *
 * return sel;
 * ```
 *
 * in numerous places in our codebase to achieve the same behavior.
 *
 * The logic below performs much better, mostly as we are using
 * `.select` instead `.selectAll` that is `querySelector` instead of
 * `querySelectorAll`.
 *
 */
export function ensureSingle(parent: any, nodeType: string, className?: string, enterFn?: any): any {
    const sel = parent.select(nodeType + (className ? '.' + className : ''));
    if (sel.size()) return sel;

    const layer = parent.append(nodeType);
    if (className) layer.classed(className, true);
    if (enterFn) layer.call(enterFn);

    return layer;
}

/**
 * Same as Lib.ensureSingle, but using id as selector.
 * This version is mostly used for clipPath nodes.
 *
 * @param {d3 selection} parent : parent selection of the element in question
 * @param {string} nodeType : node type of element to append
 * @param {string} id : id of element in question
 * @param {fn} enterFn (optional) : optional fn applied to entering elements only
 * @return {d3 selection} selection of new layer
 */
export function ensureSingleById(parent: any, nodeType: string, id: string, enterFn?: any): any {
    const sel = parent.select(nodeType + '#' + id);
    if (sel.size()) return sel;

    const layer = parent.append(nodeType).attr('id', id);
    if (enterFn) layer.call(enterFn);

    return layer;
}

/**
 * Converts a string path to an object.
 *
 * When given a string containing an array element, it will create a `null`
 * filled array of the given size.
 *
 * @example
 * lib.objectFromPath('nested.test[2].path', 'value');
 * // returns { nested: { test: [null, null, { path: 'value' }]}
 *
 * @param   {string}    path to nested value
 * @param   {*}         any value to be set
 *
 * @return {Object} the constructed object with a full nested path
 */
export function objectFromPath(path: string, value: any): any {
    const keys = path.split('.');
    let tmpObj: any;
    const obj: any = (tmpObj = {});

    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let el: any = null;

        const parts = keys[i].match(/(.*)\[([0-9]+)\]/);

        if (parts) {
            key = parts[1];
            el = parts[2];

            tmpObj = tmpObj[key] = [];

            if (i === keys.length - 1) {
                tmpObj[el] = value;
            } else {
                tmpObj[el] = {};
            }

            tmpObj = tmpObj[el];
        } else {
            if (i === keys.length - 1) {
                tmpObj[key] = value;
            } else {
                tmpObj[key] = {};
            }

            tmpObj = tmpObj[key];
        }
    }

    return obj;
}

/**
 * Iterate through an object in-place, converting dotted properties to objects.
 *
 * Examples:
 *
 *   lib.expandObjectPaths({'nested.test.path': 'value'});
 *     => { nested: { test: {path: 'value'}}}
 *
 * It also handles array notation, e.g.:
 *
 *   lib.expandObjectPaths({'foo[1].bar': 'value'});
 *     => { foo: [null, {bar: value}] }
 *
 * It handles merges the results when two properties are specified in parallel:
 *
 *   lib.expandObjectPaths({'foo[1].bar': 10, 'foo[0].bar': 20});
 *     => { foo: [{bar: 10}, {bar: 20}] }
 *
 * It does NOT, however, merge multiple multiply-nested arrays::
 *
 *   lib.expandObjectPaths({'marker[1].range[1]': 5, 'marker[1].range[0]': 4})
 *     => { marker: [null, {range: 4}] }
 */

// Store this to avoid recompiling regex on *every* prop since this may happen many
// many times for animations. Could maybe be inside the function. Not sure about
// scoping vs. recompilation tradeoff, but at least it's not just inlining it into
// the inner loop.
const dottedPropertyRegex = /^([^\[\.]+)\.(.+)?/;
const indexedPropertyRegex = /^([^\.]+)\[([0-9]+)\](\.)?(.+)?/;

function notValid(prop: string): boolean {
    // guard against polluting __proto__ and other internals getters and setters
    return prop.slice(0, 2) === '__';
}

export function expandObjectPaths(data: any): any {
    let match: any, key: string, prop: string, datum: any, idx: number, dest: any, trailingPath: string;
    if (typeof data === 'object' && !Array.isArray(data)) {
        for (key in data) {
            if (data.hasOwnProperty(key)) {
                if ((match = key.match(dottedPropertyRegex))) {
                    datum = data[key];
                    prop = match[1];
                    if (notValid(prop)) continue;

                    delete data[key];

                    data[prop] = extendDeepNoArrays(
                        data[prop] || {},
                        objectFromPath(key, expandObjectPaths(datum))[prop]
                    );
                } else if ((match = key.match(indexedPropertyRegex))) {
                    datum = data[key];

                    prop = match[1];
                    if (notValid(prop)) continue;

                    idx = parseInt(match[2]);

                    delete data[key];

                    data[prop] = data[prop] || [];

                    if (match[3] === '.') {
                        // This is the case where theere are subsequent properties into which
                        // we must recurse, e.g. transforms[0].value
                        trailingPath = match[4];
                        dest = data[prop][idx] = data[prop][idx] || {};

                        // NB: Extend deep no arrays prevents this from working on multiple
                        // nested properties in the same object, e.g.
                        //
                        // {
                        //   foo[0].bar[1].range
                        //   foo[0].bar[0].range
                        // }
                        //
                        // In this case, the extendDeepNoArrays will overwrite one array with
                        // the other, so that both properties *will not* be present in the
                        // result. Fixing this would require a more intelligent tracking
                        // of changes and merging than extendDeepNoArrays currently accomplishes.
                        extendDeepNoArrays(dest, objectFromPath(trailingPath, expandObjectPaths(datum)));
                    } else {
                        // This is the case where this property is the end of the line,
                        // e.g. xaxis.range[0]

                        if (notValid(prop)) continue;
                        data[prop][idx] = expandObjectPaths(datum);
                    }
                } else {
                    if (notValid(key)) continue;
                    data[key] = expandObjectPaths(data[key]);
                }
            }
        }
    }

    return data;
}

/**
 * Converts value to string separated by the provided separators.
 *
 * @example
 * lib.numSeparate(2016, '.,');
 * // returns '2016'
 *
 * @example
 * lib.numSeparate(3000, '.,', true);
 * // returns '3,000'
 *
 * @example
 * lib.numSeparate(1234.56, '|,')
 * // returns '1,234|56'
 *
 * @param   {string|number} value       the value to be converted
 * @param   {string}    separators  string of decimal, then thousands separators
 * @param   {boolean}    separatethousands  boolean, 4-digit integers are separated if true
 *
 * @return  {string}    the value that has been separated
 */
export function numSeparate(value: string | number, separators: string, separatethousands?: boolean): string {
    if (!separatethousands) separatethousands = false;

    if (typeof separators !== 'string' || separators.length === 0) {
        throw new Error('Separator string required for formatting!');
    }

    if (typeof value === 'number') {
        value = String(value);
    }

    const thousandsRe = /(\d+)(\d{3})/;
    const decimalSep = separators.charAt(0);
    const thouSep = separators.charAt(1);

    const x = value.split('.');
    let x1 = x[0];
    const x2 = x.length > 1 ? decimalSep + x[1] : '';

    // Years are ignored for thousands separators
    if (thouSep && (x.length > 1 || x1.length > 4 || separatethousands)) {
        while (thousandsRe.test(x1)) {
            x1 = x1.replace(thousandsRe, '$1' + thouSep + '$2');
        }
    }

    return x1 + x2;
}

export const TEMPLATE_STRING_REGEX = /%{([^\s%{}:]*)([:|\|][^}]*)?}/g;
const SIMPLE_PROPERTY_REGEX = /^\w*$/;

/**
 * Substitute values from an object into a string
 *
 * Examples:
 *  Lib.templateString('name: %{trace}', {trace: 'asdf'}) --> 'name: asdf'
 *  Lib.templateString('name: %{trace[0].name}', {trace: [{name: 'asdf'}]}) --> 'name: asdf'
 *
 * @param {string}  input string containing %{...} template strings
 * @param {obj}     data object containing substitution values
 *
 * @return {string} templated string
 */
export function templateString(string: string, obj: any): string {
    // Not all that useful, but cache nestedProperty instantiation
    // just in case it speeds things up *slightly*:
    const getterCache: Record<string, any> = {};

    return string.replace(TEMPLATE_STRING_REGEX, function (dummy: string, key: string) {
        let v: any;
        if (SIMPLE_PROPERTY_REGEX.test(key)) {
            v = obj[key];
        } else {
            getterCache[key] = getterCache[key] || nestedProperty(obj, key).get;
            v = getterCache[key](true); // true means don't replace undefined with null
        }
        return v !== undefined ? v : '';
    });
}

const hovertemplateWarnings = {
    max: 10,
    count: 0,
    name: 'hovertemplate'
};
export const hovertemplateString = (params: any): string => templateFormatString({ ...params, opts: hovertemplateWarnings });

const texttemplateWarnings = {
    max: 10,
    count: 0,
    name: 'texttemplate'
};
export const texttemplateString = (params: any): string => templateFormatString({ ...params, opts: texttemplateWarnings });

// Regex for parsing multiplication and division operations applied to a template key
// Used for shape.label.texttemplate
// Matches a key name (non-whitespace characters), followed by a * or / character, followed by a number
// For example, the following strings are matched: `x0*2`, `slope/1.60934`, `y1*2.54`
const MULT_DIV_REGEX = /^(\S+)([\*\/])(-?\d+(\.\d+)?)$/;
function multDivParser(inputStr: string): { key: string; op: string | null; number: number | null } {
    const match = inputStr.match(MULT_DIV_REGEX);
    if (match) return { key: match[1], op: match[2], number: Number(match[3]) };
    return { key: inputStr, op: null, number: null };
}
const texttemplateWarningsForShapes = {
    max: 10,
    count: 0,
    name: 'texttemplate',
    parseMultDiv: true
};
export const texttemplateStringForShapes = (params: any): string => templateFormatString({ ...params, opts: texttemplateWarningsForShapes });

const TEMPLATE_STRING_FORMAT_SEPARATOR = /^[:|\|]/;
/**
 * Substitute values from an object into a string and optionally formats them using d3-format,
 * or fallback to associated labels.
 *
 * Examples:
 *  Lib.templateFormatString({ template 'name: %{trace}', labels: {trace: 'asdf'} }) --> 'name: asdf'
 *  Lib.templateFormatString({ template: 'name: %{trace[0].name}', labels: { trace: [{ name: 'asdf' }] } }) --> 'name: asdf'
 *  Lib.templateFormatString({ template: 'price: %{y:$.2f}', labels: { y: 1 } }) --> 'price: $1.00'
 *
 * @param {object}  options - Configuration object
 * @param {array}   options.data - Data objects containing substitution values
 * @param {boolean|string}  options.fallback - Fallback value when substitution fails. If false, the specifier is used.
 * @param {object}  options.labels - Data object containing fallback text when no formatting is specified, ex.: {yLabel: 'formattedYValue'}
 * @param {object}  options.locale - D3 locale for formatting
 * @param {object}  options.opts - Additional options
 * @param {number}  options.opts.count - Count of warnings for missing values
 * @param {number}  options.opts.max - Maximum allowed count of warnings for missing values before suppressing the warning message
 * @param {string}  options.opts.name - Template name, used in warning message
 * @param {boolean} options.opts.parseMultDiv - Parse * and / operators in template string (used in shape labels)
 * @param {string}  options.template - Input string containing %{...:...} template string specifiers
 *
 * @return {string} templated string
 */
function templateFormatString({ data = [], locale, fallback, labels = {}, opts, template }: any): string {
    return template.replace(TEMPLATE_STRING_REGEX, (match: string, key: string, format: string) => {
        const isOther = ['xother', 'yother'].includes(key);
        const isSpaceOther = ['_xother', '_yother'].includes(key);
        const isSpaceOtherSpace = ['_xother_', '_yother_'].includes(key);
        const isOtherSpace = ['xother_', 'yother_'].includes(key);
        const hasOther = isOther || isSpaceOther || isOtherSpace || isSpaceOtherSpace;

        // Remove underscores from key
        if (isSpaceOther || isSpaceOtherSpace) key = key.substring(1);
        if (isOtherSpace || isSpaceOtherSpace) key = key.substring(0, key.length - 1);

        let parsedOp: string | null = null;
        let parsedNumber: number | null = null;
        if (opts.parseMultDiv) {
            const _match = multDivParser(key);
            key = _match.key;
            parsedOp = _match.op;
            parsedNumber = _match.number;
        }

        let value: any = undefined;
        if (hasOther) {
            // 'other' specifiers that are undefined return an empty string by design
            if (labels[key] === undefined) return '';
            value = labels[key];
        } else {
            for (const obj of data) {
                if (!obj) continue;
                if (obj.hasOwnProperty(key)) {
                    value = obj[key];
                    break;
                }

                if (!SIMPLE_PROPERTY_REGEX.test(key)) {
                    // true here means don't convert null to undefined
                    value = nestedProperty(obj, key).get(true);
                }
                if (value !== undefined) break;
            }
        }

        if (value === undefined) {
            const { count, max, name } = opts;
            const fallbackValue = fallback === false ? match : fallback;
            if (count < max) {
                warn(
                    [
                        `Variable '${key}' in ${name} could not be found!`,
                        'Please verify that the template is correct.',
                        `Using value: '${fallbackValue}'.`
                    ].join(' ')
                );
            }
            if (count === max) warn(`Too many '${name}' warnings - additional warnings will be suppressed.`);
            opts.count++;

            return fallbackValue;
        }

        if (parsedOp === '*') value *= parsedNumber!;
        if (parsedOp === '/') value /= parsedNumber!;

        if (format) {
            let fmt: any;
            if (format[0] === ':') {
                fmt = locale ? locale.numberFormat : numberFormat;
                if (value !== '') {
                    // e.g. skip missing data on heatmap
                    value = fmt(format.replace(TEMPLATE_STRING_FORMAT_SEPARATOR, ''))(value);
                }
            }

            if (format[0] === '|') {
                fmt = locale ? locale.timeFormat : utcFormat;
                const ms = dateTime2ms(value);
                value = formatDate(ms, format.replace(TEMPLATE_STRING_FORMAT_SEPARATOR, ''), false, fmt);
            }
        } else {
            const keyLabel = key + 'Label';
            if (labels.hasOwnProperty(keyLabel)) value = labels[keyLabel];
        }

        if (hasOther) {
            value = '(' + value + ')';
            if (isSpaceOther || isSpaceOtherSpace) value = ' ' + value;
            if (isOtherSpace || isSpaceOtherSpace) value = value + ' ';
        }

        return value;
    });
}

/*
 * alphanumeric string sort, tailored for subplot IDs like scene2, scene10, x10y13 etc
 */
const char0 = 48;
const char9 = 57;
export function subplotSort(a: string, b: string): number {
    const l = Math.min(a.length, b.length) + 1;
    let numA = 0;
    let numB = 0;
    for (let i = 0; i < l; i++) {
        const charA = a.charCodeAt(i) || 0;
        const charB = b.charCodeAt(i) || 0;
        const isNumA = charA >= char0 && charA <= char9;
        const isNumB = charB >= char0 && charB <= char9;

        if (isNumA) numA = 10 * numA + charA - char0;
        if (isNumB) numB = 10 * numB + charB - char0;

        if (!isNumA || !isNumB) {
            if (numA !== numB) return numA - numB;
            if (charA !== charB) return charA - charB;
        }
    }
    return numB - numA;
}

// repeatable pseudorandom generator
let randSeed = 2000000000;

export function seedPseudoRandom(): void {
    randSeed = 2000000000;
}

export function pseudoRandom(): number {
    const lastVal = randSeed;
    randSeed = (69069 * randSeed + 1) % 4294967296;
    // don't let consecutive vals be too close together
    // gets away from really trying to be random, in favor of better local uniformity
    if (Math.abs(randSeed - lastVal) < 429496729) return pseudoRandom();
    return randSeed / 4294967296;
}

/** Fill hover 'pointData' container with 'correct' hover text value
 *
 * - If trace hoverinfo contains a 'text' flag and hovertext is not set,
 *   the text elements will be seen in the hover labels.
 *
 * - If trace hoverinfo contains a 'text' flag and hovertext is set,
 *   hovertext takes precedence over text
 *   i.e. the hoverinfo elements will be seen in the hover labels
 *
 *  @param {object} calcPt
 *  @param {object} trace
 *  @param {object || array} contOut (mutated here)
 */
export function fillText(calcPt: any, trace: any, contOut: any): any {
    const fill = Array.isArray(contOut)
        ? function (v: any) {
              contOut.push(v);
          }
        : function (v: any) {
              contOut.text = v;
          };

    const htx = extractOption(calcPt, trace, 'htx', 'hovertext');
    if (isValidTextValue(htx)) return fill(htx);

    const tx = extractOption(calcPt, trace, 'tx', 'text');
    if (isValidTextValue(tx)) return fill(tx);
}

// accept all truthy values and 0 (which gets cast to '0' in the hover labels)
export function isValidTextValue(v: any): boolean {
    return v || v === 0;
}

/**
 * @param {number} ratio
 * @param {number} n (number of decimal places)
 */
export function formatPercent(ratio: number, n?: number): string {
    n = n || 0;
    let str = (Math.round(100 * ratio * Math.pow(10, n)) * Math.pow(0.1, n)).toFixed(n) + '%';
    for (let i = 0; i < n; i++) {
        if (str.indexOf('.') !== -1) {
            str = str.replace('0%', '%');
            str = str.replace('.%', '%');
        }
    }
    return str;
}

export function isHidden(gd: GraphDiv): boolean {
    const display = window.getComputedStyle(gd).display;
    return !display || display === 'none';
}

export function strTranslate(x: number, y: number): string {
    return x || y ? 'translate(' + x + ',' + y + ')' : '';
}

export function strRotate(a: number): string {
    return a ? 'rotate(' + a + ')' : '';
}

export function strScale(s: number): string {
    return s !== 1 ? 'scale(' + s + ')' : '';
}

/** Return transform text for bar bar-like rectangles and pie-like slices
 *  @param {object} transform
 *  - targetX: desired position on the x-axis
 *  - targetY: desired position on the y-axis
 *  - textX: text middle position on the x-axis
 *  - textY: text middle position on the y-axis
 *  - anchorX: (optional) text anchor position on the x-axis (computed from textX), zero for middle anchor
 *  - anchorY: (optional) text anchor position on the y-axis (computed from textY), zero for middle anchor
 *  - scale: (optional) scale applied after translate
 *  - rotate: (optional) rotation applied after scale
 *  - noCenter: when defined no extra arguments needed in rotation
 */
export function getTextTransform(transform: any): string {
    const noCenter = transform.noCenter;
    const textX = transform.textX;
    const textY = transform.textY;
    const targetX = transform.targetX;
    const targetY = transform.targetY;
    const anchorX = transform.anchorX || 0;
    const anchorY = transform.anchorY || 0;
    const rotate = transform.rotate;
    let scale = transform.scale;
    if (!scale) scale = 0;
    else if (scale > 1) scale = 1;

    return (
        strTranslate(targetX - scale * (textX + anchorX), targetY - scale * (textY + anchorY)) +
        strScale(scale) +
        (rotate ? 'rotate(' + rotate + (noCenter ? '' : ' ' + textX + ' ' + textY) + ')' : '')
    );
}

export function setTransormAndDisplay(s: any, transform: any): void {
    s.attr('transform', getTextTransform(transform));
    s.style('display', transform.scale ? null : 'none');
}

export function ensureUniformFontSize(gd: GraphDiv, baseFont: any): any {
    const out = extendFlat({}, baseFont);
    out.size = Math.max(baseFont.size, gd._fullLayout.uniformtext.minsize || 0);
    return out;
}

/**
 * provide a human-readable list e.g. "A, B, C and D" with an ending separator
 *
 * @param {array} arr : the array to join
 * @param {string} mainSeparator : main separator
 * @param {string} lastSeparator : last separator
 *
 * @return {string} : joined list
 */
export function join2(arr: any[], mainSeparator: string, lastSeparator: string): string {
    const len = arr.length;
    if (len > 1) {
        return arr.slice(0, -1).join(mainSeparator) + lastSeparator + arr[len - 1];
    }
    return arr.join(mainSeparator);
}

export function bigFont(size: number): number {
    return Math.round(1.2 * size);
}

const firefoxVersion = getFirefoxVersion();
// see https://bugzilla.mozilla.org/show_bug.cgi?id=1684973
const isProblematicFirefox = firefoxVersion !== null && firefoxVersion < 86;

/**
 * Return the mouse position from the last event registered by D3.
 * @returns An array with two numbers, representing the x and y coordinates of the mouse pointer
 *   at the event relative to the targeted node.
 */
export function getPositionFromD3Event(event: any): number[] {
    if (isProblematicFirefox) {
        // layerX and layerY are non-standard, so we only fallback to them when we have to:
        return [event.layerX, event.layerY];
    } else {
        return [event.offsetX, event.offsetY];
    }
}

// Backward-compatible default export with all methods
const lib: any = {};

lib.adjustFormat = adjustFormat;
lib.warnBadFormat = warnBadFormat;
lib.noFormat = noFormat;
lib.numberFormat = numberFormat;

lib.nestedProperty = nestedProperty;
lib.keyedContainer = keyedContainer;
lib.relativeAttr = relativeAttr;
lib.isPlainObject = isPlainObject;
lib.toLogRange = toLogRange;
lib.relinkPrivateKeys = relinkPrivateKeys;

// Re-import for default export assignment
import {
    isArrayBuffer as _isArrayBuffer,
    isTypedArray as _isTypedArray,
    isArrayOrTypedArray as _isArrayOrTypedArray,
    isArray1D as _isArray1D,
    ensureArray as _ensureArray,
    concat as _concat,
    maxRowLength as _maxRowLength,
    minRowLength as _minRowLength,
} from './array.js';
lib.isArrayBuffer = _isArrayBuffer;
lib.isTypedArray = _isTypedArray;
lib.isArrayOrTypedArray = _isArrayOrTypedArray;
lib.isArray1D = _isArray1D;
lib.ensureArray = _ensureArray;
lib.concat = _concat;
lib.maxRowLength = _maxRowLength;
lib.minRowLength = _minRowLength;

import { mod as _mod, modHalf as _modHalf } from './mod.js';
lib.mod = _mod;
lib.modHalf = _modHalf;

import {
    valObjectMeta as _valObjectMeta,
    coerce as _coerce,
    coerce2 as _coerce2,
    coerceFont as _coerceFont,
    coercePattern as _coercePattern,
    coerceHoverinfo as _coerceHoverinfo,
    coerceSelectionMarkerOpacity as _coerceSelectionMarkerOpacity,
    validate as _validate,
} from './coerce.js';
lib.valObjectMeta = _valObjectMeta;
lib.coerce = _coerce;
lib.coerce2 = _coerce2;
lib.coerceFont = _coerceFont;
lib.coercePattern = _coercePattern;
lib.coerceHoverinfo = _coerceHoverinfo;
lib.coerceSelectionMarkerOpacity = _coerceSelectionMarkerOpacity;
lib.validate = _validate;

import {
    dateTime2ms as _dateTime2ms,
    isDateTime as _isDateTime,
    ms2DateTime as _ms2DateTime,
    ms2DateTimeLocal as _ms2DateTimeLocal,
    cleanDate as _cleanDate,
    isJSDate as _isJSDate,
    formatDate as _formatDate,
    incrementMonth as _incrementMonth,
    dateTick0 as _dateTick0,
    dfltRange as _dfltRange,
    findExactDates as _findExactDates,
    MIN_MS as _MIN_MS,
    MAX_MS as _MAX_MS,
} from './dates.js';
lib.dateTime2ms = _dateTime2ms;
lib.isDateTime = _isDateTime;
lib.ms2DateTime = _ms2DateTime;
lib.ms2DateTimeLocal = _ms2DateTimeLocal;
lib.cleanDate = _cleanDate;
lib.isJSDate = _isJSDate;
lib.formatDate = _formatDate;
lib.incrementMonth = _incrementMonth;
lib.dateTick0 = _dateTick0;
lib.dfltRange = _dfltRange;
lib.findExactDates = _findExactDates;
lib.MIN_MS = _MIN_MS;
lib.MAX_MS = _MAX_MS;

import {
    findBin as _findBin,
    sorterAsc as _sorterAsc,
    sorterDes as _sorterDes,
    distinctVals as _distinctVals,
    roundUp as _roundUp,
    sort as _sort,
    findIndexOfMin as _findIndexOfMin,
} from './search.js';
lib.findBin = _findBin;
lib.sorterAsc = _sorterAsc;
lib.sorterDes = _sorterDes;
lib.distinctVals = _distinctVals;
lib.roundUp = _roundUp;
lib.sort = _sort;
lib.findIndexOfMin = _findIndexOfMin;

lib.sortObjectKeys = sortObjectKeys;

import {
    aggNums as _aggNums,
    len as _len,
    mean as _mean,
    geometricMean as _geometricMean,
    median as _median,
    midRange as _midRange,
    variance as _variance,
    stdev as _stdev,
    interp as _interp,
} from './stats.js';
lib.aggNums = _aggNums;
lib.len = _len;
lib.mean = _mean;
lib.geometricMean = _geometricMean;
lib.median = _median;
lib.midRange = _midRange;
lib.variance = _variance;
lib.stdev = _stdev;
lib.interp = _interp;

import {
    init2dArray as _init2dArray,
    transposeRagged as _transposeRagged,
    dot as _dot,
    translationMatrix as _translationMatrix,
    rotationMatrix as _rotationMatrix,
    rotationXYMatrix as _rotationXYMatrix,
    apply3DTransform as _apply3DTransform,
    apply2DTransform as _apply2DTransform,
    apply2DTransform2 as _apply2DTransform2,
    convertCssMatrix as _convertCssMatrix,
    inverseTransformMatrix as _inverseTransformMatrix,
} from './matrix.js';
lib.init2dArray = _init2dArray;
lib.transposeRagged = _transposeRagged;
lib.dot = _dot;
lib.translationMatrix = _translationMatrix;
lib.rotationMatrix = _rotationMatrix;
lib.rotationXYMatrix = _rotationXYMatrix;
lib.apply3DTransform = _apply3DTransform;
lib.apply2DTransform = _apply2DTransform;
lib.apply2DTransform2 = _apply2DTransform2;
lib.convertCssMatrix = _convertCssMatrix;
lib.inverseTransformMatrix = _inverseTransformMatrix;

import {
    deg2rad as _deg2rad,
    rad2deg as _rad2deg,
    angleDelta as _angleDelta,
    angleDist as _angleDist,
    isFullCircle as _isFullCircle,
    isAngleInsideSector as _isAngleInsideSector,
    isPtInsideSector as _isPtInsideSector,
    pathArc as _pathArc,
    pathSector as _pathSector,
    pathAnnulus as _pathAnnulus,
} from './angles.js';
lib.deg2rad = _deg2rad;
lib.rad2deg = _rad2deg;
lib.angleDelta = _angleDelta;
lib.angleDist = _angleDist;
lib.isFullCircle = _isFullCircle;
lib.isAngleInsideSector = _isAngleInsideSector;
lib.isPtInsideSector = _isPtInsideSector;
lib.pathArc = _pathArc;
lib.pathSector = _pathSector;
lib.pathAnnulus = _pathAnnulus;

import {
    isLeftAnchor as _isLeftAnchor,
    isCenterAnchor as _isCenterAnchor,
    isRightAnchor as _isRightAnchor,
    isTopAnchor as _isTopAnchor,
    isMiddleAnchor as _isMiddleAnchor,
    isBottomAnchor as _isBottomAnchor,
} from './anchor_utils.js';
lib.isLeftAnchor = _isLeftAnchor;
lib.isCenterAnchor = _isCenterAnchor;
lib.isRightAnchor = _isRightAnchor;
lib.isTopAnchor = _isTopAnchor;
lib.isMiddleAnchor = _isMiddleAnchor;
lib.isBottomAnchor = _isBottomAnchor;

import {
    segmentsIntersect as _segmentsIntersect,
    segmentDistance as _segmentDistance,
    getTextLocation as _getTextLocation,
    clearLocationCache as _clearLocationCache,
    getVisibleSegment as _getVisibleSegment,
    findPointOnPath as _findPointOnPath,
} from './geometry2d.js';
lib.segmentsIntersect = _segmentsIntersect;
lib.segmentDistance = _segmentDistance;
lib.getTextLocation = _getTextLocation;
lib.clearLocationCache = _clearLocationCache;
lib.getVisibleSegment = _getVisibleSegment;
lib.findPointOnPath = _findPointOnPath;

import {
    extendFlat as _extendFlat,
    extendDeep as _extendDeep,
    extendDeepAll as _extendDeepAll,
    extendDeepNoArrays as _extendDeepNoArrays,
} from './extend.js';
lib.extendFlat = _extendFlat;
lib.extendDeep = _extendDeep;
lib.extendDeepAll = _extendDeepAll;
lib.extendDeepNoArrays = _extendDeepNoArrays;

import { log as _log, warn as _warn, error as _error } from './loggers.js';
lib.log = _log;
lib.warn = _warn;
lib.error = _error;

lib.counterRegex = counterRegex;

lib.throttle = throttle;
lib.throttleDone = throttleDone;
lib.clearThrottle = clearThrottle;

import {
    getGraphDiv as _getGraphDiv,
    isPlotDiv as _isPlotDiv,
    removeElement as _removeElement,
    addStyleRule as _addStyleRule,
    addRelatedStyleRule as _addRelatedStyleRule,
    deleteRelatedStyleRule as _deleteRelatedStyleRule,
    setStyleOnHover as _setStyleOnHover,
    getFullTransformMatrix as _getFullTransformMatrix,
    getElementTransformMatrix as _getElementTransformMatrix,
    getElementAndAncestors as _getElementAndAncestors,
    equalDomRects as _equalDomRects,
} from './dom.js';
lib.getGraphDiv = _getGraphDiv;
lib.isPlotDiv = _isPlotDiv;
lib.removeElement = _removeElement;
lib.addStyleRule = _addStyleRule;
lib.addRelatedStyleRule = _addRelatedStyleRule;
lib.deleteRelatedStyleRule = _deleteRelatedStyleRule;
lib.setStyleOnHover = _setStyleOnHover;
lib.getFullTransformMatrix = _getFullTransformMatrix;
lib.getElementTransformMatrix = _getElementTransformMatrix;
lib.getElementAndAncestors = _getElementAndAncestors;
lib.equalDomRects = _equalDomRects;

lib.clearResponsive = clearResponsive;
lib.preserveDrawingBuffer = preserveDrawingBuffer;
lib.makeTraceGroups = makeTraceGroups;
lib._ = _localize;
lib.notifier = notifier;
lib.filterUnique = filterUnique;
lib.filterVisible = filterVisible;
lib.pushUnique = pushUnique;
lib.increment = increment;
lib.cleanNumber = cleanNumber;
lib.ensureNumber = ensureNumber;
lib.isIndex = isIndex;
lib.noop = noop;
lib.identity = identity;
lib.repeat = repeat;
lib.swapAttrs = swapAttrs;
lib.raiseToTop = raiseToTop;
lib.cancelTransition = cancelTransition;
lib.constrain = constrain;
lib.bBoxIntersect = bBoxIntersect;
lib.simpleMap = simpleMap;
lib.randstr = randstr;
lib.OptionControl = OptionControl;
lib.smooth = smooth;
lib.syncOrAsync = syncOrAsync;
lib.stripTrailingSlash = stripTrailingSlash;
lib.noneOrAll = noneOrAll;
lib.mergeArray = mergeArray;
lib.mergeArrayCastPositive = mergeArrayCastPositive;
lib.fillArray = fillArray;
lib.castOption = castOption;
lib.extractOption = extractOption;
lib.tagSelected = tagSelected;
lib.selIndices2selPoints = selIndices2selPoints;
lib.getTargetArray = getTargetArray;
lib.minExtend = minExtend;
lib.titleCase = titleCase;
lib.containsAny = containsAny;
lib.isSafari = isSafari;
lib.isIOS = isIOS;
lib.isMacWKWebView = isMacWKWebView;
lib.getFirefoxVersion = getFirefoxVersion;
lib.isD3Selection = isD3Selection;
lib.ensureSingle = ensureSingle;
lib.ensureSingleById = ensureSingleById;
lib.objectFromPath = objectFromPath;
lib.expandObjectPaths = expandObjectPaths;
lib.numSeparate = numSeparate;
lib.TEMPLATE_STRING_REGEX = TEMPLATE_STRING_REGEX;
lib.templateString = templateString;
lib.hovertemplateString = hovertemplateString;
lib.texttemplateString = texttemplateString;
lib.texttemplateStringForShapes = texttemplateStringForShapes;
lib.subplotSort = subplotSort;
lib.seedPseudoRandom = seedPseudoRandom;
lib.pseudoRandom = pseudoRandom;
lib.fillText = fillText;
lib.isValidTextValue = isValidTextValue;
lib.formatPercent = formatPercent;
lib.isHidden = isHidden;
lib.strTranslate = strTranslate;
lib.strRotate = strRotate;
lib.strScale = strScale;
lib.getTextTransform = getTextTransform;
lib.setTransormAndDisplay = setTransormAndDisplay;
lib.ensureUniformFontSize = ensureUniformFontSize;
lib.join2 = join2;
lib.bigFont = bigFont;
lib.getPositionFromD3Event = getPositionFromD3Event;
lib.setAttrs = setAttrs;

export default lib;
