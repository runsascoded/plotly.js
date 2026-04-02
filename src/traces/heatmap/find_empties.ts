import _index from '../../lib/index.js';
const { maxRowLength } = _index;

export default function findEmpties(z: any) {
    const empties: any[] = [];
    const neighborHash: Record<string, any> = {};
    const noNeighborList: any[] = [];
    let nextRow = z[0];
    let row: any[] = [];
    const blank = [0, 0, 0];
    const rowLength = maxRowLength(z);
    let prevRow: any;
    let i: number;
    let j: number;
    let thisPt: any;
    let p: any;
    let neighborCount: number;
    let newNeighborHash: Record<string, any>;
    let foundNewNeighbors: boolean;

    for(i = 0; i < z.length; i++) {
        prevRow = row;
        row = nextRow;
        nextRow = z[i + 1] || [];
        for(j = 0; j < rowLength; j++) {
            if(row[j] === undefined) {
                neighborCount = (row[j - 1] !== undefined ? 1 : 0) +
                    (row[j + 1] !== undefined ? 1 : 0) +
                    (prevRow[j] !== undefined ? 1 : 0) +
                    (nextRow[j] !== undefined ? 1 : 0);

                if(neighborCount) {
                    // for this purpose, don't count off-the-edge points
                    // as undefined neighbors
                    if(i === 0) neighborCount++;
                    if(j === 0) neighborCount++;
                    if(i === z.length - 1) neighborCount++;
                    if(j === row.length - 1) neighborCount++;

                    // if all neighbors that could exist do, we don't
                    // need this for finding farther neighbors
                    if(neighborCount < 4) {
                        neighborHash['' + [i, j]] = [i, j, neighborCount];
                    }

                    empties.push([i, j, neighborCount]);
                } else noNeighborList.push([i, j]);
            }
        }
    }

    while(noNeighborList.length) {
        newNeighborHash = {};
        foundNewNeighbors = false;

        // look for cells that now have neighbors but didn't before
        for(p = noNeighborList.length - 1; p >= 0; p--) {
            thisPt = noNeighborList[p];
            i = thisPt[0];
            j = thisPt[1];

            neighborCount = ((neighborHash['' + [i - 1, j]] || blank)[2] +
                (neighborHash['' + [i + 1, j]] || blank)[2] +
                (neighborHash['' + [i, j - 1]] || blank)[2] +
                (neighborHash['' + [i, j + 1]] || blank)[2]) / 20;

            if(neighborCount) {
                newNeighborHash[thisPt] = [i, j, neighborCount];
                noNeighborList.splice(p, 1);
                foundNewNeighbors = true;
            }
        }

        if(!foundNewNeighbors) {
            throw 'findEmpties iterated with no new neighbors';
        }

        // put these new cells into the main neighbor list
        for(thisPt in newNeighborHash) {
            neighborHash[thisPt] = newNeighborHash[thisPt];
            empties.push(newNeighborHash[thisPt]);
        }
    }

    // sort the full list in descending order of neighbor count
    return empties.sort((a, b) => b[2] - a[2]);
}
