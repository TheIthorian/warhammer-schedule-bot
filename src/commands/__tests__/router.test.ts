import {
    AutocompleteInteraction,
    CacheType,
    DiscordAPIError,
    RESTJSONErrorCodes,
    SlashCommandBuilder,
} from 'discord.js';
import { vi } from 'vitest';
import { CommandInteractionRouter } from '../router';
import { Command } from '../types';
import { SpamProtection } from '../../spam/types';

// The router logs through a module-scoped logger, so the only way to assert which branch ran is to capture it.
// `vi.hoisted` is required because `vi.mock` is lifted above ordinary top-level declarations.
const logSpies = vi.hoisted(() => ({
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
}));

vi.mock('../../util/logger', async (importOriginal) => {
    const original = await importOriginal<typeof import('../../util/logger')>();
    return { ...original, makeLogger: () => logSpies };
});

beforeEach(() => {
    for (const spy of Object.values(logSpies)) spy.mockClear();
});

const allowAllSpamProtection: SpamProtection = {
    getSpamValidation: () => ({ ok: true }),
} as unknown as SpamProtection;

function makeAutocompleteInteraction(commandName: string): AutocompleteInteraction<CacheType> {
    return { commandName } as AutocompleteInteraction<CacheType>;
}

function makeDiscordApiError(code: number): DiscordAPIError {
    return new DiscordAPIError({ code, message: 'Unknown interaction' }, code, 404, 'POST', 'https://example.test', {});
}

function makeCommand(name: string, autocomplete?: () => Promise<void>): Command {
    return {
        data: new SlashCommandBuilder().setName(name).setDescription('test command'),
        execute: async () => {},
        ...(autocomplete ? { autocomplete } : {}),
    };
}

describe('CommandInteractionRouter.handleAutocomplete', () => {
    test('should dispatch to the command that owns the name', async () => {
        let called = false;
        const router = new CommandInteractionRouter(
            [
                makeCommand('timezone', async () => {
                    called = true;
                }),
            ],
            allowAllSpamProtection,
        );

        await router.handleAutocomplete(makeAutocompleteInteraction('timezone'));

        expect(called).toBe(true);
    });

    test('should ignore commands that do not implement autocomplete', async () => {
        const router = new CommandInteractionRouter([makeCommand('ping')], allowAllSpamProtection);

        await expect(router.handleAutocomplete(makeAutocompleteInteraction('ping'))).resolves.toBeUndefined();
    });

    test.each([
        ['unknown interaction', RESTJSONErrorCodes.UnknownInteraction],
        ['already acknowledged', RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged],
    ])('should log a superseded interaction (%s) at debug, not error', async (_label, code) => {
        const router = new CommandInteractionRouter(
            [
                makeCommand('timezone', async () => {
                    throw makeDiscordApiError(code);
                }),
            ],
            allowAllSpamProtection,
        );

        await expect(router.handleAutocomplete(makeAutocompleteInteraction('timezone'))).resolves.toBeUndefined();

        expect(logSpies.error).not.toHaveBeenCalled();
        expect(logSpies.debug).toHaveBeenCalledOnce();
    });

    test('should log a genuine failure at error level without throwing', async () => {
        const router = new CommandInteractionRouter(
            [
                makeCommand('timezone', async () => {
                    throw new Error('database is down');
                }),
            ],
            allowAllSpamProtection,
        );

        await expect(router.handleAutocomplete(makeAutocompleteInteraction('timezone'))).resolves.toBeUndefined();

        expect(logSpies.error).toHaveBeenCalledOnce();
        expect(logSpies.debug).not.toHaveBeenCalled();
    });

    test('should not treat an unrelated Discord API error as superseded', async () => {
        const router = new CommandInteractionRouter(
            [
                makeCommand('timezone', async () => {
                    throw makeDiscordApiError(RESTJSONErrorCodes.MissingAccess);
                }),
            ],
            allowAllSpamProtection,
        );

        await router.handleAutocomplete(makeAutocompleteInteraction('timezone'));

        expect(logSpies.error).toHaveBeenCalledOnce();
    });
});
