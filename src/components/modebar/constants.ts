import modeBarButtons from './buttons.js';
const buttonList = Object.keys(modeBarButtons);

const DRAW_MODES = [
    'drawline',
    'drawopenpath',
    'drawclosedpath',
    'drawcircle',
    'drawrect',
    'eraseshape'
];

const backButtons = [
    'v1hovermode',
    'hoverclosest',
    'hovercompare',
    'togglehover',
    'togglespikelines'
].concat(DRAW_MODES);

const foreButtons: any[] = [];
const addToForeButtons = (b: any) => {
    if(backButtons.indexOf(b._cat || b.name) !== -1) return;
    // for convenience add lowercase shotname e.g. zoomin as well fullname zoomInGeo
    const name = b.name;
    const _cat = (b._cat || b.name).toLowerCase();
    if(foreButtons.indexOf(name) === -1) foreButtons.push(name);
    if(foreButtons.indexOf(_cat) === -1) foreButtons.push(_cat);
};
buttonList.forEach((k: any) => {
    addToForeButtons(modeBarButtons[k]);
});
foreButtons.sort();

export default {
    DRAW_MODES: DRAW_MODES,
    backButtons: backButtons,
    foreButtons: foreButtons
};
