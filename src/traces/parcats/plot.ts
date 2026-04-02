import parcats from './parcats.js';

export default function plot(graphDiv, parcatsModels, transitionOpts, makeOnCompleteCallback) {
    const fullLayout = graphDiv._fullLayout;
    const svg = fullLayout._paper;
    const size = fullLayout._size;

    parcats(
        graphDiv,
        svg,
        parcatsModels,
        {
            width: size.w,
            height: size.h,
            margin: {
                t: size.t,
                r: size.r,
                b: size.b,
                l: size.l
            }
        },
        transitionOpts,
        makeOnCompleteCallback
    );
}
