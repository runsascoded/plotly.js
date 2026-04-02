import _plot_config from '../plot_api/plot_config.js';
const { dfltConfig } = _plot_config;
import notifier from './notifier.js';

const loggers: {
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
    let i: number;

    if(dfltConfig.logging > 1) {
        const messages: any[] = ['LOG:'];
        for(i = 0; i < args.length; i++) {
            messages.push(args[i]);
        }
        console.trace.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 1) {
        const lines: any[] = [];
        for(i = 0; i < args.length; i++) {
            lines.push(args[i]);
        }
        notifier(lines.join('<br>'), 'long');
    }
};

loggers.warn = function(...args: any[]): void {
    let i: number;

    if(dfltConfig.logging > 0) {
        const messages: any[] = ['WARN:'];
        for(i = 0; i < args.length; i++) {
            messages.push(args[i]);
        }
        console.trace.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 0) {
        const lines: any[] = [];
        for(i = 0; i < args.length; i++) {
            lines.push(args[i]);
        }
        notifier(lines.join('<br>'), 'stick');
    }
};

loggers.error = function(...args: any[]): void {
    let i: number;

    if(dfltConfig.logging > 0) {
        const messages: any[] = ['ERROR:'];
        for(i = 0; i < args.length; i++) {
            messages.push(args[i]);
        }
        console.error.apply(console, messages);
    }

    if(dfltConfig.notifyOnLogging > 0) {
        const lines: any[] = [];
        for(i = 0; i < args.length; i++) {
            lines.push(args[i]);
        }
        notifier(lines.join('<br>'), 'stick');
    }
};

export const log = loggers.log;
export const warn = loggers.warn;
export const error = loggers.error;

export default loggers;
