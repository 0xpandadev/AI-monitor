const fs=require('node:fs');
const path=require('node:path');
const {importProfileBatch}=require('../lib/data.cjs');

const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/import-profile-batch.cjs <profile-batch.json>');
const batch=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
const result=importProfileBatch(batch);
console.log(JSON.stringify(result,null,2));
if(!result.ok)process.exitCode=1;
