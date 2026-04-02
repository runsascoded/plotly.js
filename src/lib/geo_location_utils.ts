
import countryRegex from 'country-regex';
import { area as turfArea } from '@turf/area';
import { centroid as turfCentroid } from '@turf/centroid';
import { bbox as turfBbox } from '@turf/bbox';
import identity from './identity.js';
import loggers from './loggers.js';
import isPlainObject from './is_plain_object.js';
import nestedProperty from './nested_property.js';
import polygon from './polygon.js';

// make list of all country iso3 ids from at runtime
const countryIds: string[] = Object.keys(countryRegex);

const locationmodeToIdFinder: Record<string, (location: string) => string | false> = {
    'ISO-3': identity,
    'USA-states': identity,
    'country names': countryNameToISO3
};

function countryNameToISO3(countryName: string): string | false {
    for(let i = 0; i < countryIds.length; i++) {
        const iso3 = countryIds[i];
        const regex = new RegExp(countryRegex[iso3]);

        if(regex.test(countryName.trim().toLowerCase())) return iso3;
    }

    loggers.log('Unrecognized country name: ' + countryName + '.');

    return false;
}

function locationToFeature(locationmode: string, location: any, features: any[]): boolean {
    if(!location || typeof location !== 'string') return false;

    const locationId = locationmodeToIdFinder[locationmode](location);
    let filteredFeatures: any[];
    let f: any, i: number;

    if(locationId) {
        if(locationmode === 'USA-states') {
            // Filter out features out in USA
            //
            // This is important as the Natural Earth files
            // include state/provinces from USA, Canada, Australia and Brazil
            // which have some overlay in their two-letter ids. For example,
            // 'WA' is used for both Washington state and Western Australia.
            filteredFeatures = [];
            for(i = 0; i < features.length; i++) {
                f = features[i];
                if(f.properties && f.properties.gu && f.properties.gu === 'USA') {
                    filteredFeatures.push(f);
                }
            }
        } else {
            filteredFeatures = features;
        }

        for(i = 0; i < filteredFeatures.length; i++) {
            f = filteredFeatures[i];
            if(f.id === locationId) return f;
        }

        loggers.log([
            'Location with id', locationId,
            'does not have a matching topojson feature at this resolution.'
        ].join(' '));
    }

    return false;
}

function feature2polygons(feature: any): any[] {
    const geometry = feature.geometry;
    const coords = geometry.coordinates;
    const loc = feature.id;

    const polygons: any[] = [];
    let appendPolygon: (pts: any[]) => void, j: number, k: number, m: number;

    function doesCrossAntiMerdian(pts: number[][]): number | null {
        for(let l = 0; l < pts.length - 1; l++) {
            if(pts[l][0] > 0 && pts[l + 1][0] < 0) return l;
        }
        return null;
    }

    if(loc === 'RUS' || loc === 'FJI') {
        // Russia and Fiji have landmasses that cross the antimeridian,
        // we need to add +360 to their longitude coordinates, so that
        // polygon 'contains' doesn't get confused when crossing the antimeridian.
        //
        // Note that other countries have polygons on either side of the antimeridian
        // (e.g. some Aleutian island for the USA), but those don't confuse
        // the 'contains' method; these are skipped here.
        appendPolygon = function(_pts: number[][]) {
            let pts: number[][];

            if(doesCrossAntiMerdian(_pts) === null) {
                pts = _pts;
            } else {
                pts = new Array(_pts.length);
                for(m = 0; m < _pts.length; m++) {
                    // do not mutate calcdata[i][j].geojson !!
                    pts[m] = [
                        _pts[m][0] < 0 ? _pts[m][0] + 360 : _pts[m][0],
                        _pts[m][1]
                    ];
                }
            }

            polygons.push(polygon.tester(pts));
        };
    } else if(loc === 'ATA') {
        // Antarctica has a landmass that wraps around every longitudes which
        // confuses the 'contains' methods.
        appendPolygon = function(pts: number[][]) {
            const crossAntiMeridianIndex = doesCrossAntiMerdian(pts);

            // polygon that do not cross anti-meridian need no special handling
            if(crossAntiMeridianIndex === null) {
                return polygons.push(polygon.tester(pts));
            }

            // stitch polygon by adding pt over South Pole,
            // so that it covers the projected region covers all latitudes
            //
            // Note that the algorithm below only works for polygons that
            // start and end on longitude -180 (like the ones built by
            // https://github.com/etpinard/sane-topojson).
            const stitch = new Array(pts.length + 1);
            let si = 0;

            for(m = 0; m < pts.length; m++) {
                if(m > crossAntiMeridianIndex) {
                    stitch[si++] = [pts[m][0] + 360, pts[m][1]];
                } else if(m === crossAntiMeridianIndex) {
                    stitch[si++] = pts[m];
                    stitch[si++] = [pts[m][0], -90];
                } else {
                    stitch[si++] = pts[m];
                }
            }

            // polygon.tester by default appends pt[0] to the points list,
            // we must remove it here, to avoid a jump in longitude from 180 to -180,
            // that would confuse the 'contains' method
            const tester = polygon.tester(stitch);
            tester.pts.pop();
            polygons.push(tester);
        };
    } else {
        // otherwise using same array ref is fine
        appendPolygon = function(pts: number[][]) {
            polygons.push(polygon.tester(pts));
        };
    }

    switch(geometry.type) {
        case 'MultiPolygon':
            for(j = 0; j < coords.length; j++) {
                for(k = 0; k < coords[j].length; k++) {
                    appendPolygon(coords[j][k]);
                }
            }
            break;
        case 'Polygon':
            for(j = 0; j < coords.length; j++) {
                appendPolygon(coords[j]);
            }
            break;
    }

    return polygons;
}

function getTraceGeojson(trace: any): any {
    const g = trace.geojson;
    const PlotlyGeoAssets = (window as any).PlotlyGeoAssets || {};
    const geojsonIn = typeof g === 'string' ? PlotlyGeoAssets[g] : g;

    // This should not happen, but just in case something goes
    // really wrong when fetching the GeoJSON
    if(!isPlainObject(geojsonIn)) {
        loggers.error('Oops ... something went wrong when fetching ' + g);
        return false;
    }

    return geojsonIn;
}

function extractTraceFeature(calcTrace: any[]): any[] | false {
    const trace = calcTrace[0].trace;

    const geojsonIn = getTraceGeojson(trace);
    if(!geojsonIn) return false;

    const lookup: Record<string, any> = {};
    const featuresOut: any[] = [];
    let i: number;

    for(i = 0; i < trace._length; i++) {
        const cdi = calcTrace[i];
        if(cdi.loc || cdi.loc === 0) {
            lookup[cdi.loc] = cdi;
        }
    }

    function appendFeature(fIn: any): void {
        const id = nestedProperty(fIn, trace.featureidkey || 'id').get();
        const cdi = lookup[id];

        if(cdi) {
            const geometry = fIn.geometry;

            if(geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
                const fOut: any = {
                    type: 'Feature',
                    id: id,
                    geometry: geometry,
                    properties: {} as any
                };

                // Compute centroid, add it to the properties
                if (fOut.geometry.coordinates.length > 0) {
                    fOut.properties.ct = findCentroid(fOut);
                } else {
                    fOut.properties.ct = [NaN, NaN];
                }

                // Mutate in in/out features into calcdata
                cdi.fIn = fIn;
                cdi.fOut = fOut;

                featuresOut.push(fOut);
            } else {
                loggers.log([
                    'Location', cdi.loc, 'does not have a valid GeoJSON geometry.',
                    'Traces with locationmode *geojson-id* only support',
                    '*Polygon* and *MultiPolygon* geometries.'
                ].join(' '));
            }
        }

        // remove key from lookup, so that we can track (if any)
        // the locations that did not have a corresponding GeoJSON feature
        delete lookup[id];
    }

    switch(geojsonIn.type) {
        case 'FeatureCollection':
            const featuresIn = geojsonIn.features;
            for(i = 0; i < featuresIn.length; i++) {
                appendFeature(featuresIn[i]);
            }
            break;
        case 'Feature':
            appendFeature(geojsonIn);
            break;
        default:
            loggers.warn([
                'Invalid GeoJSON type', (geojsonIn.type || 'none') + '.',
                'Traces with locationmode *geojson-id* only support',
                '*FeatureCollection* and *Feature* types.'
            ].join(' '));
            return false;
    }

    for(const loc in lookup) {
        loggers.log([
            'Location *' + loc + '*',
            'does not have a matching feature with id-key',
            '*' + trace.featureidkey + '*.'
        ].join(' '));
    }

    return featuresOut;
}

// TODO this find the centroid of the polygon of maxArea
// (just like we currently do for geo choropleth polygons),
// maybe instead it would make more sense to compute the centroid
// of each polygon and consider those on hover/select
function findCentroid(feature: any): number[] {
    const geometry = feature.geometry;
    let poly: any;

    if(geometry.type === 'MultiPolygon') {
        const coords = geometry.coordinates;
        let maxArea = 0;

        for(let i = 0; i < coords.length; i++) {
            const polyi = {type: 'Polygon', coordinates: coords[i]};
            const area = turfArea(polyi as any);
            if(area > maxArea) {
                maxArea = area;
                poly = polyi;
            }
        }
    } else {
        poly = geometry;
    }

    return turfCentroid(poly).geometry.coordinates;
}

function fetchTraceGeoData(calcData: any[]): Promise<any>[] {
    const PlotlyGeoAssets = (window as any).PlotlyGeoAssets || {};
    const promises: Promise<any>[] = [];

    function fetch(url: string): Promise<any> {
        return new Promise(function(resolve, reject) {
            window.fetch(url).then((r) => {
                if(!r.ok) {
                    delete PlotlyGeoAssets[url];
                    const msg = r.status === 404 ?
                        ('GeoJSON at URL "' + url + '" does not exist.') :
                        ('Unexpected error while fetching from ' + url);
                    throw new Error(msg);
                }
                return r.json();
            }).then((d) => {
                PlotlyGeoAssets[url] = d;
                return resolve(d);
            });
        });
    }

    function wait(url: string): Promise<any> {
        return new Promise(function(resolve, reject) {
            let cnt = 0;
            const interval = setInterval(function() {
                if(PlotlyGeoAssets[url] && PlotlyGeoAssets[url] !== 'pending') {
                    clearInterval(interval);
                    return resolve(PlotlyGeoAssets[url]);
                }
                if(cnt > 100) {
                    clearInterval(interval);
                    return reject('Unexpected error while fetching from ' + url);
                }
                cnt++;
            }, 50);
        });
    }

    for(let i = 0; i < calcData.length; i++) {
        const trace = calcData[i][0].trace;
        const url = trace.geojson;

        if(typeof url === 'string') {
            if(!PlotlyGeoAssets[url]) {
                PlotlyGeoAssets[url] = 'pending';
                promises.push(fetch(url));
            } else if(PlotlyGeoAssets[url] === 'pending') {
                promises.push(wait(url));
            }
        }
    }

    return promises;
}

// TODO `turf/bbox` gives wrong result when the input feature/geometry
// crosses the anti-meridian. We should try to implement our own bbox logic.
function computeBbox(d: any): any {
    return turfBbox(d);
}

export default {
    locationToFeature: locationToFeature,
    feature2polygons: feature2polygons,
    getTraceGeojson: getTraceGeojson,
    extractTraceFeature: extractTraceFeature,
    fetchTraceGeoData: fetchTraceGeoData,
    computeBbox: computeBbox
};
