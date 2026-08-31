const fs=require('node:fs');
const path=require('node:path');
const {importUpdate}=require('../lib/data.cjs');

const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/import-update.cjs <weekly-update.json>');
const update=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
const result=importUpdate(update);console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
