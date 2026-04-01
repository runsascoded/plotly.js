import _plot_config from '../plot_api/plot_config.js';
const { dfltConfig } = _plot_config;
import notifier from './notifier.js';

var loggers: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
} = {} as any;

/**
 * ------------------------------------------
 * debugging tools
 * ------------------------------------------
 */

loggers.log = function(...args: any[]): void {
    var i: number;

    if(dfltConfig.logging > 1) {
        var messages: any[] = ['LOG:'];
        for(i = 0; i < args.length; i++) {
            messages.push(args[i]);
        }
        console.trace.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 1) {
        var lines: any[] = [];
        for(i = 0; i < args.length; i++) {
            lines.push(args[i]);
        }
        notifier(lines.join('<br>'), 'long');
    }
};

loggers.warn = function(...args: any[]): void {
    var i: number;

    if(dfltConfig.logging > 0) {
        var messages: any[] = ['WARN:'];
        for(i = 0; i < args.length; i++) {
            messages.push(args[i]);
        }
        console.trace.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 0) {
        var lines: any[] = [];
        for(i = 0; i < args.length; i++) {
            lines.push(args[i]);
        }
        notifier(lines.join('<br>'), 'stick');
    }
};

loggers.error = function(...args: any[]): void {
    var i: number;

    if(dfltConfig.logging > 0) {
        var messages: any[] = ['ERROR:'];
        for(i = 0; i < args.length; i++) {
            messages.push(args[i]);
        }
        console.error.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 0) {
        var lines: any[] = [];
        for(i = 0; i < args.length; i++) {
            lines.push(args[i]);
        }
        notifier(lines.join('<br>'), 'stick');
    }
};

export var log = loggers.log;
export var warn = loggers.warn;
export var error = loggers.error;

export default loggers;
