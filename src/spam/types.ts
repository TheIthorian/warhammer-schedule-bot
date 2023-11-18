export type GetSpamValidationResult = { ok: true } | { ok: false; message: string };

export interface SpamProtection {
    getSpamValidation(command: string, userId: string): GetSpamValidationResult;
}
