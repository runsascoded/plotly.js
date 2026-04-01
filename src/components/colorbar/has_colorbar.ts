import { isPlainObject } from '../../lib/index.js';

export default function hasColorbar(container: any) {
    return isPlainObject(container.colorbar);
}
