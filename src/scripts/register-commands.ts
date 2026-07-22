import { registerCommands } from '../commands/register';
import { makeLogger } from '../util/logger';

const log = makeLogger(module);

if (require.main === module) {
    registerCommands().catch((error: unknown) => {
        log.fatal(error, 'Failed to register application commands');
        process.exit(1);
    });
}
