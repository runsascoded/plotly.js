export default function(opts?: any): any {
    var editType = opts.editType;
    return {
        t: {
            valType: 'number',
            dflt: 0,
            editType: editType,
            description: 'The amount of padding (in px) along the top of the component.'
        },
        r: {
            valType: 'number',
            dflt: 0,
            editType: editType,
            description: 'The amount of padding (in px) on the right side of the component.'
        },
        b: {
            valType: 'number',
            dflt: 0,
            editType: editType,
            description: 'The amount of padding (in px) along the bottom of the component.'
        },
        l: {
            valType: 'number',
            dflt: 0,
            editType: editType,
            description: 'The amount of padding (in px) on the left side of the component.'
        },
        editType: editType
    };
}
