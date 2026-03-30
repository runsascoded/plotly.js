import { isPlainObject } from '../../lib/index.js';

export default function hasColorbar(container) {
    return isPlainObject(container.colorbar);
}
