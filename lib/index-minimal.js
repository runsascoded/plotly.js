'use strict';

var Plotly = require('./core');

Plotly.register([
    require('./bar'),
]);

module.exports = Plotly;
