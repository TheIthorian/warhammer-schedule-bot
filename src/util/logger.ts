import Module from 'module';
import { createWriteStream } from 'fs';
import { pino } from 'pino';
import { config } from '../config';

const DEFAULT_LEVEL = 'debug';
const BASE_DIR_NAME = 'warhammer-schedule-bot';
const LOG_FILE = 'app.log';

interface LogFunction {
    <T extends object>(obj: T, msg?: string, ...args: any[]): void;
    (obj: unknown, msg?: string, ...args: any[]): void;
    (msg: string, ...args: any[]): void;
}

export interface Logger {
    fatal: LogFunction;
    error: LogFunction;
    warn: LogFunction;
    info: LogFunction;
    debug: LogFunction;
    trace: LogFunction;
    silent?: LogFunction;
}

export function makeLogger(module: Module | undefined, level = DEFAULT_LEVEL): Logger {
    const streams = [{ stream: process.stdout }] as any[];
    if (config.isLocal) {
        streams.push({ stream: createWriteStream(LOG_FILE, { flags: 'a' }) });
    }

    let name = 'unknown';
    if (module?.filename) {
        const modulePath = module.filename?.split(BASE_DIR_NAME)[1]?.split('\\') ?? [];
        const lastPart = [modulePath[modulePath.length - 2], modulePath[modulePath.length - 1]];
        name = `${lastPart.join('/')}`;
    }

    return pino({ level, name }, pino.multistream(streams));
}

export function logContext(
    functionName: string,
    dataObject: Record<string, string | null | number | Date | undefined> = {},
    log?: Logger
) {
    const objectString = Object.entries(dataObject)
        .map(([key, value]) => `[${key} : ${value?.toString()}]`)
        .join(', ');

    const delimiter = objectString ? ' - ' : '';
    const ctx = `${functionName}${delimiter}${objectString}`;

    log?.info(ctx);

    return ctx;
}
