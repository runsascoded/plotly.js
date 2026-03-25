import isNumeric from 'fast-isnumeric';
import toLogRange from '../../lib/to_log_range.js';

export default function convertCoords(gd, ax, newType, doExtra) {
    ax = ax || {};

    var toLog = (newType === 'log') && (ax.type === 'linear');
    var fromLog = (newType === 'linear') && (ax.type === 'log');

    if(!(toLog || fromLog)) return;

    var images = gd._fullLayout.images;
    var axLetter = ax._id.charAt(0);
    var image;
    var attrPrefix;

    for(var i = 0; i < images.length; i++) {
        image = images[i];
        attrPrefix = 'images[' + i + '].';

        if(image[axLetter + 'ref'] === ax._id) {
            var currentPos = image[axLetter];
            var currentSize = image['size' + axLetter];
            var newPos = null;
            var newSize = null;

            if(toLog) {
                newPos = toLogRange(currentPos, ax.range);

                // this is the inverse of the conversion we do in fromLog below
                // so that the conversion is reversible (notice the fromLog conversion
                // is like sinh, and this one looks like arcsinh)
                var dx = currentSize / Math.pow(10, newPos) / 2;
                newSize = 2 * Math.log(dx + Math.sqrt(1 + dx * dx)) / Math.LN10;
            } else {
                newPos = Math.pow(10, currentPos);
                newSize = newPos * (Math.pow(10, currentSize / 2) - Math.pow(10, -currentSize / 2));
            }

            // if conversion failed, delete the value so it can get a default later on
            if(!isNumeric(newPos)) {
                newPos = null;
                newSize = null;
            } else if(!isNumeric(newSize)) newSize = null;

            doExtra(attrPrefix + axLetter, newPos);
            doExtra(attrPrefix + 'size' + axLetter, newSize);
        }
    }
}
