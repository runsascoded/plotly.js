export default function handleAutorangeOptionsDefaults(coerce?: any, autorange?: any, range?: any): void {
    let minRange, maxRange;
    if(range) {
        const isReversed = (
            autorange === 'reversed' ||
            autorange === 'min reversed' ||
            autorange === 'max reversed'
        );

        minRange = range[isReversed ? 1 : 0];
        maxRange = range[isReversed ? 0 : 1];
    }

    const minallowed = coerce('autorangeoptions.minallowed', maxRange === null ? minRange : undefined);
    const maxallowed = coerce('autorangeoptions.maxallowed', minRange === null ? maxRange : undefined);

    if(minallowed === undefined) coerce('autorangeoptions.clipmin');
    if(maxallowed === undefined) coerce('autorangeoptions.clipmax');

    coerce('autorangeoptions.include');
}
