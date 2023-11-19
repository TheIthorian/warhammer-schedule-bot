import { SelectOptionInteraction } from './select-option';
import { linearSpamProtection } from './../spam/index';
import { MessageComponentInteractionRouter } from './router';

export const messageComponentInteractionRouter = new MessageComponentInteractionRouter(
    [new SelectOptionInteraction()],
    linearSpamProtection
);
