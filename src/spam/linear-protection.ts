import { Collection } from 'discord.js';
import { GetSpamValidationResult, SpamProtection } from './types';

const COOLDOWN_DURATION_IN_SECONDS = 3;

export class LinearSpamProtection implements SpamProtection {
    private readonly rateCounter = new Collection<string, Record<string, number>>();

    getSpamValidation(command: string, userId: string): GetSpamValidationResult {
        const now = new Date().getTime();
        const userRates = this.rateCounter.get(userId);

        console.log(userRates);

        if (!userRates) {
            const newUserRates = { [command]: now };
            this.rateCounter.set(userId, newUserRates);
            return { ok: true };
        }

        const lastCommandTime = userRates[command];
        if (!lastCommandTime) {
            userRates[command] = now;
            return { ok: true };
        }

        const expirationTime = lastCommandTime + COOLDOWN_DURATION_IN_SECONDS * 1000;
        if (now > expirationTime) {
            return { ok: true };
        }

        const expiredTimestamp = Math.round(expirationTime / 1000);
        return {
            ok: false,
            message: `Please wait, you are on a cooldown for \`${command}\`. You can use it again <t:${expiredTimestamp}:R>.`,
        };
    }
}
