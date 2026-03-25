import Lib from '../../lib/index.js';

export default function hasColorbar(container) {
    return Lib.isPlainObject(container.colorbar);
}
