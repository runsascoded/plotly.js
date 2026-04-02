import str2RGBArray from '../../../lib/str2rgbarray.js';

const AXES_NAMES = ['xaxis', 'yaxis', 'zaxis'];

function SpikeOptions(this: any) {
    this.enabled = [true, true, true];
    this.colors = [[0, 0, 0, 1],
                   [0, 0, 0, 1],
                   [0, 0, 0, 1]];
    this.drawSides = [true, true, true];
    this.lineWidth = [1, 1, 1];
}

const proto = SpikeOptions.prototype;

proto.merge = function(sceneLayout: any) {
    for(let i = 0; i < 3; ++i) {
        const axes = sceneLayout[AXES_NAMES[i]];

        if(!axes.visible) {
            this.enabled[i] = false;
            this.drawSides[i] = false;
            continue;
        }

        this.enabled[i] = axes.showspikes;
        this.colors[i] = str2RGBArray(axes.spikecolor);
        this.drawSides[i] = axes.spikesides;
        this.lineWidth[i] = axes.spikethickness;
    }
};

function createSpikeOptions(layout: any) {
    // @ts-ignore TS7009
    const result: any = (new SpikeOptions() as any);
    result.merge(layout);
    return result;
}

export default createSpikeOptions;
