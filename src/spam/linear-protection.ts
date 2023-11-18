import { Collection } from 'discord.js';
import { GetSpamValidationResult, SpamProtection } from './types';
import { logContext, makeLogger } from '../util/logger';

const COOLDOWN_DURATION_IN_SECONDS = 3;

const log = makeLogger(module);

export class LinearSpamProtection implements SpamProtection {
    private readonly rateCounter = new Collection<string, Record<string, number>>();

    getSpamValidation(command: string, userId: string): GetSpamValidationResult {
        const ctx = logContext(`${LinearSpamProtection.name}.${this.getSpamValidation.name}`, { command, userId }, log);
        const now = new Date().getTime();
        const userRates = this.rateCounter.get(userId);

        if (!userRates) {
            log.debug(`${ctx} setting userRates`);
            const newUserRates = { [command]: now };
            this.rateCounter.set(userId, newUserRates);
            return { ok: true };
        }

        const lastCommandTime = userRates[command];
        if (!lastCommandTime) {
            log.debug(`${ctx} setting lastCommandTime for ${command}`);
            userRates[command] = now;
            return { ok: true };
        }

        const expirationTime = lastCommandTime + COOLDOWN_DURATION_IN_SECONDS * 1000;
        if (now > expirationTime) {
            log.debug(`${ctx} within expiration time (${expirationTime})`);
            return { ok: true };
        }

        const expiredTimestamp = Math.round(expirationTime / 1000);
        log.debug(`${ctx} request within cooldown`);
        return {
            ok: false,
            message: `Please wait, you are on a cooldown for \`${command}\`. You can use it again <t:${expiredTimestamp}:R>.`,
        };
    }
}
