import { config } from '../config';

type GetInviteLinkInput = { clientId: string; permissionsInt: number };
export function getInviteLink({
    clientId,
    permissionsInt,
}: GetInviteLinkInput) {
    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('permissions', permissionsInt.toString());
    url.searchParams.set('scope', 'bot applications.commands');

    return url.toString();
}

if (require.main === module) {
    const link = getInviteLink({
        clientId: config.clientId,
        permissionsInt: config.permissionsInt,
    });

    process.stdout.write(link);
}
