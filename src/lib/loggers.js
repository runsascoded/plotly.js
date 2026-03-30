import _plot_config from '../plot_api/plot_config.js';
const { dfltConfig } = _plot_config;
import notifier from './notifier.js';

var loggers = {};

/**
 * ------------------------------------------
 * debugging tools
 * ------------------------------------------
 */

loggers.log = function() {
    var i;

    if(dfltConfig.logging > 1) {
        var messages = ['LOG:'];
        for(i = 0; i < arguments.length; i++) {
            messages.push(arguments[i]);
        }
        console.trace.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 1) {
        var lines = [];
        for(i = 0; i < arguments.length; i++) {
            lines.push(arguments[i]);
        }
        notifier(lines.join('<br>'), 'long');
    }
};

loggers.warn = function() {
    var i;

    if(dfltConfig.logging > 0) {
        var messages = ['WARN:'];
        for(i = 0; i < arguments.length; i++) {
            messages.push(arguments[i]);
        }
        console.trace.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 0) {
        var lines = [];
        for(i = 0; i < arguments.length; i++) {
            lines.push(arguments[i]);
        }
        notifier(lines.join('<br>'), 'stick');
    }
};

loggers.error = function() {
    var i;

    if(dfltConfig.logging > 0) {
        var messages = ['ERROR:'];
        for(i = 0; i < arguments.length; i++) {
            messages.push(arguments[i]);
        }
        console.error.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 0) {
        var lines = [];
        for(i = 0; i < arguments.length; i++) {
            lines.push(arguments[i]);
        }
        notifier(lines.join('<br>'), 'stick');
    }
};

export var log = loggers.log;
export var warn = loggers.warn;
export var error = loggers.error;

export default loggers;
