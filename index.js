// index.js
require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;
const streakPageId = process.env.STREAK_PAGE_ID;

//アイデア確認
async function checkTodayIdeas() {
  const today = new Date().toISOString().split('T')[0];

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: '作成日時',
      date: {
        equals: today,
      },
    },
  });

  return response.results.length > 0;
}

//ストリーク情報更新
async function updateStreak(foundIdeaToday) {
  const page = await notion.pages.retrieve({ page_id: streakPageId });
  const props = page.properties;

  let current = props['現在のストリーク'].number || 0;
  let max = props['最大ストリーク'].number || 0;
  const lastUpdated = props['最終更新日'].date.start;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (lastUpdated === today) return; // 同日内に再実行された場合は無視

  if (foundIdeaToday && lastUpdated === yesterday) {
    current += 1;
    if (current > max) max = current;
  } else if (foundIdeaToday) {
    current = 1;
  } else {
    current = 0;
  }

  await notion.pages.update({
    page_id: streakPageId,
    properties: {
      '現在のストリーク': { number: current },
      '最大ストリーク': { number: max },
      '最終更新日': { date: { start: today } },
    },
  });

  console.log(`✅ ストリーク更新：現在 ${current} 日`);
}

(async () => {
  const found = await checkTodayIdeas();
  await updateStreak(found);
})();
