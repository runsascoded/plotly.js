import modeBarButtons from './buttons.js';
var buttonList = Object.keys(modeBarButtons);

var DRAW_MODES = [
    'drawline',
    'drawopenpath',
    'drawclosedpath',
    'drawcircle',
    'drawrect',
    'eraseshape'
];

var backButtons = [
    'v1hovermode',
    'hoverclosest',
    'hovercompare',
    'togglehover',
    'togglespikelines'
].concat(DRAW_MODES);

var foreButtons = [];
var addToForeButtons = function(b) {
    if(backButtons.indexOf(b._cat || b.name) !== -1) return;
    // for convenience add lowercase shotname e.g. zoomin as well fullname zoomInGeo
    var name = b.name;
    var _cat = (b._cat || b.name).toLowerCase();
    if(foreButtons.indexOf(name) === -1) foreButtons.push(name);
    if(foreButtons.indexOf(_cat) === -1) foreButtons.push(_cat);
};
buttonList.forEach(function(k) {
    addToForeButtons(modeBarButtons[k]);
});
foreButtons.sort();

export default {
    DRAW_MODES: DRAW_MODES,
    backButtons: backButtons,
    foreButtons: foreButtons
};
