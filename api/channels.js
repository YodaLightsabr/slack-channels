import { WebClient } from '@slack/web-api';

export default async function channels (req, res) {
    const keys = process.env.KEYS.split(',');
    const token = req.query.token || req.body?.token || req.headers['authorization']?.substring?.(7);

    if (!keys.includes(token)) return res.status(401).json({ error: 'Unauthorized' });

    const web = new WebClient(process.env.BOT_TOKEN);

    const conversations = {};
    
    const fetch = cursor => (console.log('fetching'), web.conversations.list({
        team_id: 'T0266FRGM',
        limit: 500,
        ...(cursor ? { cursor } : {})
    }));

    let lastFetched = await fetch();

    while (lastFetched?.response_metadata?.next_cursor) {
        for (const channel of lastFetched.channels) {
            conversations[channel.name] = {
                id: channel.id,
                name: channel.name,
                members: channel.num_members
            };
        }
        lastFetched = await fetch(lastFetched.response_metadata.next_cursor);
    }

    for (const channel of lastFetched.channels) {
        conversations[channel.name] = {
            id: channel.id,
            name: channel.name,
            members: channel.num_members
        };
    }

    res.status(200).json(conversations);
}