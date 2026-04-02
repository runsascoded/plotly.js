import isNumeric from 'fast-isnumeric';

const binFunctions: Record<string, (...args: any[]) => any> = {
    count: function(n, i, size) {
        size[n]++;
        return 1;
    },

    sum: function(n, i, size, counterData) {
        let v = counterData[i];
        if(isNumeric(v)) {
            v = Number(v);
            size[n] += v;
            return v;
        }
        return 0;
    },

    avg: function(n, i, size, counterData, counts) {
        let v = counterData[i];
        if(isNumeric(v)) {
            v = Number(v);
            size[n] += v;
            counts[n]++;
        }
        return 0;
    },

    min: function(n, i, size, counterData) {
        let v = counterData[i];
        if(isNumeric(v)) {
            v = Number(v);
            if(!isNumeric(size[n])) {
                size[n] = v;
                return v;
            } else if(size[n] > v) {
                const delta = v - size[n];
                size[n] = v;
                return delta;
            }
        }
        return 0;
    },

    max: function(n, i, size, counterData) {
        let v = counterData[i];
        if(isNumeric(v)) {
            v = Number(v);
            if(!isNumeric(size[n])) {
                size[n] = v;
                return v;
            } else if(size[n] < v) {
                const delta = v - size[n];
                size[n] = v;
                return delta;
            }
        }
        return 0;
    }
};

export default binFunctions;
