import { WebClient } from '@slack/web-api';

export default async function channels (req, res) {
    const keys = process.env.KEYS.split(',');
    const userScopedToken = req.query.userScopedToken || req.body?.userScopedToken || req.headers['userScopedToken']?.substring?.(7);
    const token = req.query.token || req.body?.token || req.headers['authorization']?.substring?.(7);

    const web = keys.includes(token) ? new WebClient(process.env.BOT_TOKEN) :
        userScopedToken ? new WebClient(userScopedToken) : null;

    if (!keys.includes(token)) return res.status(401).json({ error: 'Unauthorized' });

    const conversations = {};
    
    const fetch = cursor => (console.log('fetching'), web.conversations.list({
        team_id: 'T0266FRGM',
        limit: 500,
        ...(cursor ? { cursor } : {})
    }));

    let lastFetched = await fetch();

    const topicTransform = topic => {
        if (!topic) return '';

        topic = topic.split('&amp;').join('&');

        const matches = topic.match(/:[^:\s]*(?:::[^:\s]*)*:/g) ?? [];

        for (const match of matches) {
            topic = topic.replace(match, '');
        }

        const channelMatches = topic.match(/<#C.*?\|.*?>/g) ?? [];

        for (const match of channelMatches) {
            topic = topic.replace(match, '#' + match.split('|').reverse().map(a => a.substring(0, a.length - 1))[0]);
        }

        return topic;
    };

    while (lastFetched?.response_metadata?.next_cursor) {
        for (const channel of lastFetched.channels) {
            conversations[channel.name] = {
                id: channel.id,
                name: channel.name,
                members: channel.num_members,
                archived: channel.is_archived,
                topic: topicTransform(channel.topic?.value)
            };
        }
        lastFetched = await fetch(lastFetched.response_metadata.next_cursor);
    }

    for (const channel of lastFetched.channels) {
        conversations[channel.name] = {
            id: channel.id,
            name: channel.name,
            members: channel.num_members,
            archived: channel.is_archived,
            topic: topicTransform(channel.topic?.value)
        };
    }

    res.status(200).json(conversations);
}