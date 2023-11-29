import { setTimeout } from 'timers/promises';
import { LinearSpamProtection } from '../linear-protection';

describe('LinearSpamProtection', () => {
    let linearSpamProtection: LinearSpamProtection;

    beforeEach(() => {
        linearSpamProtection = new LinearSpamProtection();
    });

    describe('getSpamValidation', () => {
        it('should return ok: true for a new user and command', () => {
            const result = linearSpamProtection.getSpamValidation('commandA', 'user123');
            expect(result).toEqual({ ok: true });
        });

        it('should return ok: true for a new command from an existing user', () => {
            linearSpamProtection.getSpamValidation('commandA', 'user123');
            const result = linearSpamProtection.getSpamValidation('commandB', 'user123');
            expect(result).toEqual({ ok: true });
        });

        it('should return ok: true if the cooldown has expired', async () => {
            linearSpamProtection.getSpamValidation('commandA', 'user123');

            await setTimeout(3500);

            const result = linearSpamProtection.getSpamValidation('commandA', 'user123');
            expect(result).toEqual({ ok: true });
        });

        it('should return ok: false and a cooldown message if still within cooldown', async () => {
            linearSpamProtection.getSpamValidation('commandA', 'user123');

            await setTimeout(2000);

            linearSpamProtection.getSpamValidation('commandA', 'user123');

            const result = linearSpamProtection.getSpamValidation('commandA', 'user123') as {
                ok: false;
                message: string;
            };
            expect(result.ok).toBe(false);
            expect(result.message).toContain(
                'Please wait, you are on a cooldown for `commandA`. You can use it again <t:'
            );
        });

        it('should handle cases where userRates or lastCommandTime is undefined', () => {
            // Simulate a case where userRates is undefined
            const result1 = linearSpamProtection.getSpamValidation('commandA', 'user123');
            expect(result1).toEqual({ ok: true });

            // Simulate a case where lastCommandTime is undefined
            linearSpamProtection.getSpamValidation('commandA', 'user123'); // Seed an existing user
            const result2 = linearSpamProtection.getSpamValidation('commandB', 'user123');
            expect(result2).toEqual({ ok: true });
        });
    });
});
