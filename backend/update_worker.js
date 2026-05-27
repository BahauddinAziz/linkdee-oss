import fs from 'fs';

let content = fs.readFileSync('src/services/campaignWorker.js', 'utf8');

// Replace formatTemplate
content = content.replace(
  /function formatTemplate.*?}/s,
  `async function generateIcebreaker(profile) {
  return \`Hi \${profile.firstName || 'there'}, noticed your work at \${profile.company || 'your company'}. Amazing stuff!\`;
}

async function formatTemplate(template, lead) {
  let text = template
    .replace(/\\{first_name\\}/gi, lead.firstName || '')
    .replace(/\\{last_name\\}/gi, lead.lastName || '')
    .replace(/\\{company\\}/gi, lead.company || '');

  if (text.includes('{ai_icebreaker}')) {
    const icebreaker = await generateIcebreaker(lead);
    text = text.replace(/\\{ai_icebreaker\\}/gi, icebreaker);
  }

  return text.trim();
}`
);

// Replace dispatchOutreach
content = content.replace(
  /async function dispatchOutreach\(campaign, step, lead, decryptedToken\) \{.*?const message = formatTemplate/s,
  `async function dispatchOutreach(campaignSender, step, lead, decryptedToken) {
  const { linkedAccount } = campaignSender;
  const { unipileDsn, accountId } = linkedAccount;

  // Extract LinkedIn public identifier from profile URL
  const profileIdentifier = lead.profileUrl.endsWith('/') ? lead.profileUrl.slice(0, -1).split('/in/').pop() : lead.profileUrl.split('/in/').pop();

  const message = await formatTemplate`
);

content = content.replace(
  /const activeCampaigns = await prisma\.campaign\.findMany\(\{[\s\S]*?\}\);/,
  `const activeCampaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' },
    include: {
      steps: { orderBy: { order: 'asc' } },
      senders: {
        include: {
          linkedAccount: {
            select: { id: true, unipileDsn: true, accountId: true, accessToken: true, status: true, dailyActionCount: true, dailyCap: true },
          },
        },
      },
    },
  });`
);

// Replace campaign processing loop logic
content = content.replace(
  /    \/\/ Skip if the linked account is not connected[\s\S]*?    const lead = await prisma.lead.findFirst\({/s,
  `    // Find and lock the next eligible lead
    const lead = await prisma.lead.findFirst({`
);

content = content.replace(
  /      const decryptedToken = decrypt\(campaign.linkedAccount.accessToken\);\s*\/\/ Enrich lead data if firstName\/lastName\/company are missing\s*const enrichedData = await enrichLead\(\s*campaign.linkedAccount.unipileDsn,\s*decryptedToken,\s*campaign.linkedAccount.accountId,\s*lead\s*\);\s*\/\/ Persist enriched data back to the lead \(non-blocking — ignore errors\)\s*if \(enrichedData.firstName \|\| enrichedData.lastName \|\| enrichedData.company\) \{\s*await prisma.lead.update\(\{\s*where: \{ id: lead.id \},\s*data: \{\s*firstName: enrichedData.firstName \|\| lead.firstName,\s*lastName: enrichedData.lastName \|\| lead.lastName,\s*company: enrichedData.company \|\| lead.company,\s*\},\s*\}\).catch\(\(\) => \{\}\);\s*\}\s*\/\/ Build enriched lead for template formatting\s*const enrichedLead = \{ \.\.\.lead, \.\.\.enrichedData \};\s*\/\/ Send the outreach\s*await dispatchOutreach\(campaign, step, enrichedLead, decryptedToken\);/,
  `      // SENDER ROTATION LOGIC
      let selectedSender = null;
      if (lead.currentStepOrder > 1 && lead.senderAccountId) {
        selectedSender = campaign.senders.find((s) => s.linkedAccount.id === lead.senderAccountId);
      }
      
      if (!selectedSender) {
        const eligibleSenders = campaign.senders.filter(
          (s) =>
            s.linkedAccount.status === 'ACTIVE' &&
            s.linkedAccount.accountId &&
            s.linkedAccount.dailyActionCount < s.linkedAccount.dailyCap
        );

        if (eligibleSenders.length > 0) {
          eligibleSenders.sort((a, b) => a.linkedAccount.dailyActionCount - b.linkedAccount.dailyActionCount);
          selectedSender = eligibleSenders[0];
        }
      }

      if (!selectedSender || selectedSender.linkedAccount.status !== 'ACTIVE' || !selectedSender.linkedAccount.accountId || selectedSender.linkedAccount.dailyActionCount >= selectedSender.linkedAccount.dailyCap) {
         await prisma.lead.update({
           where: { id: lead.id },
           data: { status: lead.status },
         });
         continue;
      }

      const decryptedToken = decrypt(selectedSender.linkedAccount.accessToken);

      let enrichedData = {};
      if (!lead.firstName || !lead.lastName || !lead.company || step.template?.includes('{ai_icebreaker}')) {
        enrichedData = await enrichLead(
          selectedSender.linkedAccount.unipileDsn,
          decryptedToken,
          selectedSender.linkedAccount.accountId,
          lead
        );
        if (enrichedData.firstName || enrichedData.lastName || enrichedData.company) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              firstName: enrichedData.firstName || lead.firstName,
              lastName: enrichedData.lastName || lead.lastName,
              company: enrichedData.company || lead.company,
            },
          }).catch(() => {});
        }
      }

      const enrichedLead = { ...lead, ...enrichedData };

      await dispatchOutreach(selectedSender, step, enrichedLead, decryptedToken);`
);

content = content.replace(
  /            errorMessage: null \n          \},/s,
  `            errorMessage: null,
            senderAccountId: selectedSender.linkedAccount.id
          },`
);

content = content.replace(
  /        prisma.campaign.update\(\{\s*where: \{ id: campaign.id \},\s*data: \{ dailyActionCount: \{ increment: 1 \} \},\s*\}\),/,
  `        prisma.campaign.update({
          where: { id: campaign.id },
          data: { dailyActionCount: { increment: 1 } },
        }),
        prisma.linkedInAccount.update({
          where: { id: selectedSender.linkedAccount.id },
          data: { dailyActionCount: { increment: 1 } },
        }),`
);


fs.writeFileSync('src/services/campaignWorker.js', content, 'utf8');

