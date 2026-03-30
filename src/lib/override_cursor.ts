import setCursor from './setcursor.js';

var STASHATTR = 'data-savedcursor';
var NO_CURSOR = '!!';

export default function overrideCursor(el3: any, csr?: string): void {
    var savedCursor = el3.attr(STASHATTR);
    if(csr) {
        if(!savedCursor) {
            var classes = (el3.attr('class') || '').split(' ');
            for(var i = 0; i < classes.length; i++) {
                var cls = classes[i];
                if(cls.indexOf('cursor-') === 0) {
                    el3.attr(STASHATTR, cls.slice(7))
                        .classed(cls, false);
                }
            }
            if(!el3.attr(STASHATTR)) {
                el3.attr(STASHATTR, NO_CURSOR);
            }
        }
        setCursor(el3, csr);
    } else if(savedCursor) {
        el3.attr(STASHATTR, null);

        if(savedCursor === NO_CURSOR) setCursor(el3);
        else setCursor(el3, savedCursor);
    }
}
