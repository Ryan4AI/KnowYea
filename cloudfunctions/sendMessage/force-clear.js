const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloudbase-d7gxwljzddd575d93' });
const db = cloud.database();
const _ = db.command;
const openid = 'oD7tH3Zy1HUIzU9bJXwmak_SjS-4';

(async () => {
  const collections = ['user_conversations', 'user_progress', 'user_themes', 'user_gardens', 'user_achievements', 'user_favorites', 'themes', 'nodes'];
  
  for (const col of collections) {
    try {
      const res = await db.collection(col).where({ openid }).remove();
      console.log(`${col}:`, JSON.stringify(res));
    } catch(e) {
      console.log(`${col} error:`, e.message);
    }
  }
  
  // 重置 user profile
  try {
    const users = await db.collection('users').where({ openid }).get();
    console.log('users found:', users.data.length);
    for (const u of users.data) {
      await db.collection('users').doc(u._id).update({
        data: { profile: _.set(null), lastActive: Date.now() }
      });
      console.log('user profile cleared:', u._id);
    }
  } catch(e) {
    console.log('users error:', e.message);
  }
  
  console.log('DONE');
})();
