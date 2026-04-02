export default {
    percent: function(size, total) {
        const nMax = size.length;
        const norm = 100 / total;
        for(let n = 0; n < nMax; n++) size[n] *= norm;
    },
    probability: function(size, total) {
        const nMax = size.length;
        for(let n = 0; n < nMax; n++) size[n] /= total;
    },
    density: function(size, total, inc, yinc) {
        const nMax = size.length;
        yinc = yinc || 1;
        for(let n = 0; n < nMax; n++) size[n] *= inc[n] * yinc;
    },
    'probability density': function(size, total, inc, yinc) {
        const nMax = size.length;
        if(yinc) total /= yinc;
        for(let n = 0; n < nMax; n++) size[n] *= inc[n] / total;
    }
};
