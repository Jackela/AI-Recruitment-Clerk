import fs from "fs";
import pdf from "pdf-parse-fork";
const tokenize = (text) => {
  const spaced = (text || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const base = spaced.toLowerCase().split(/[^a-z0-9+#\.\-]+/).filter((t) => t && t.length > 1);
  const out = new Set();
  for (const t of base) {
    out.add(t);
    if (t.includes('aws')) out.add('aws');
    if (t.includes('azure')) out.add('azure');
    if (t.includes('kubernetes')) out.add('kubernetes');
    if (t.includes('k8s')) out.add('kubernetes');
    if (t.includes('gcp')) out.add('gcp');
    if (t.includes('eks')) out.add('kubernetes');
  }
  return Array.from(out);
};
const path='./简历.pdf';
const b=fs.readFileSync(path);
pdf(b).then(r=>{
  const tokens = tokenize(r.text);
  console.log(tokens.filter(t=>['aws','azure','kubernetes','eks','k8s'].includes(t)).join(','));
}).catch(e=>{ console.error('ERR', e); process.exit(1); });
