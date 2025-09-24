import fs from "fs";
import pdf from "pdf-parse-fork";
const path='./简历.pdf';
if(!fs.existsSync(path)){ console.error('file not found'); process.exit(2); }
const b=fs.readFileSync(path);
pdf(b).then(r=>{
  console.log(r.text.slice(0,1000));
  console.log('---len', r.text.length);
}).catch(e=>{ console.error('ERR', e); process.exit(1); });
