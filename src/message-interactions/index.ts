import { SelectOptionInteraction } from './select-option';
import { linearSpamProtection } from './../spam/index';
import { MessageComponentInteractionRouter } from './router';
import { scheduleService } from '../scheduling/schedule-service';
import { pollService } from '../services/poll-service';
import { guildConnectionService } from '../services/guild-connection';

export const messageComponentInteractionRouter = new MessageComponentInteractionRouter(
    [new SelectOptionInteraction(scheduleService, pollService, guildConnectionService)],
    linearSpamProtection
);
