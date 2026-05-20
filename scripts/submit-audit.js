const https = require('https');
const fs = require('fs');
const path = require('path');

const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '../credentials/app-secret.json'), 'utf8'));
const APPID = creds.appid;
const SECRET = creds.secret;

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) resolve(json.access_token);
        else reject(new Error(json.errmsg || '获取token失败'));
      });
    }).on('error', reject);
  });
}

async function submitAudit(accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});
    
    const options = {
      hostname: 'api.weixin.qq.com',
      path: `/wxa/submit_audit?access_token=${accessToken}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const json = JSON.parse(body);
        if (json.errcode === 0) {
          resolve(json);
        } else {
          reject(new Error(`errcode: ${json.errcode}, errmsg: ${json.errmsg}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== 千里学堂 提交审核 ===\n');
  
  try {
    console.log('1. 获取 access_token...');
    const token = await getAccessToken();
    console.log('✅ 获取成功\n');

    console.log('2. 提交审核...');
    const result = await submitAudit(token);
    console.log('✅ 提交审核成功');
    console.log('审核ID:', result.auditid);
    console.log('预计审核时间: 1-7天');
  } catch (err) {
    console.log('❌ 失败:', err.message);
  }
}

main();
