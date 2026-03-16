'use strict';

var Plotly = require('./core-lite');

Plotly.register([
    require('./bar'),
]);

module.exports = Plotly;
