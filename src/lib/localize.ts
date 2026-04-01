import Registry from '../registry.js';
import type { GraphDiv } from '../../types/core';

export default function localize(gd: GraphDiv, s: string): string {
    var locale = gd._context.locale;

    /*
     * Priority of lookup:
     *     contextDicts[locale],
     *     registeredDicts[locale],
     *     contextDicts[baseLocale], (if baseLocale is distinct)
     *     registeredDicts[baseLocale]
     * Return the first translation we find.
     * This way if you have a regionalization you are allowed to specify
     * only what's different from the base locale, everything else will
     * fall back on the base.
     */
    for(var i = 0; i < 2; i++) {
        var locales = gd._context.locales;
        for(var j = 0; j < 2; j++) {
            var dict = (locales[locale] || {}).dictionary;
            if(dict) {
                var out = dict[s];
                if(out) return out;
            }
            locales = Registry.localeRegistry;
        }

        var baseLocale = locale.split('-')[0];
        if(baseLocale === locale) break;
        locale = baseLocale;
    }

    return s;
}
