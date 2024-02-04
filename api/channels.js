import { WebClient } from '@slack/web-api';

export default async function channels (req, res) {
    const keys = process.env.KEYS.split(',');
    const token = req.query.token || req.body?.token || req.headers['authorization']?.substring?.(7);
    const userScoped = req.query.userScoped || req.body?.userScoped;

    if (!keys.includes(token) && !userScoped) return res.status(401).json({ error: 'Unauthorized, C0' });

    const web = new WebClient(userScoped ? token : process.env.BOT_TOKEN);

    const conversations = {};
    
    const fetch = cursor => (console.log('fetching'), web.conversations.list({
        team_id: 'T0266FRGM',
        limit: 500,
        types: 'public_channel,' + userScoped ? 'private_channel' : '',
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
                topic: topicTransform(channel.topic?.value),
                private: channel.is_private
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
            topic: topicTransform(channel.topic?.value),
            private: channel.is_private
        };
    }

    res.status(200).json(conversations);
}