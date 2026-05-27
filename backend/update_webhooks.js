import fs from 'fs';

let content = fs.readFileSync('src/controllers/webhookController.js', 'utf8');

// Replace handleMessageCreated
content = content.replace(
  /async function handleMessageCreated.*?\}[\r\n]+(?=async function handleConnectionAccepted)/s,
  `async function handleMessageCreated(payload) {
  const { sender_provider_id: senderProviderId, chat_id: chatId, account_id: accountId, text, id: unipileMessageId } = payload?.data || {};

  if (!senderProviderId || !chatId || !accountId) return;

  const linkedAccount = await prisma.linkedInAccount.findFirst({
    where: { accountId },
  });

  if (linkedAccount) {
    let conversation = await prisma.conversation.findFirst({
      where: { unipileChatId: chatId, linkedAccountId: linkedAccount.id },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: linkedAccount.userId,
          linkedAccountId: linkedAccount.id,
          unipileChatId: chatId,
          targetName: senderProviderId,
          lastMessageAt: new Date(),
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    if (unipileMessageId) {
      await prisma.message.upsert({
        where: { unipileMessageId },
        create: {
          conversationId: conversation.id,
          unipileMessageId,
          text: text || '',
          isFromMe: false,
        },
        update: {},
      });
    }
  }

  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING', 'SENT', 'SENDING'] },
      campaign: { senders: { some: { linkedAccount: { accountId } } } },
    },
    include: { campaign: { select: { id: true } } },
  });

  const lead = leads.find(l => l.profileUrl.includes(senderProviderId));

  if (!lead) return;

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      replied: true,
      status: 'COMPLETED'
    }
  });

  await prisma.campaignLog.create({
    data: {
      campaignId: lead.campaign.id,
      leadId: lead.id,
      level: 'SUCCESS',
      message: 'Target replied! Stopping sequence.',
    },
  });
}
`
);

content = content.replace(
  /campaign: \{ linkedAccount: \{ accountId \} \},/,
  `campaign: { senders: { some: { linkedAccount: { accountId } } } },`
);

fs.writeFileSync('src/controllers/webhookController.js', content, 'utf8');

