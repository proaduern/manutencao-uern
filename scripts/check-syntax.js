const ts = require('typescript');
const fs = require('fs');

const content = fs.readFileSync('src/app/chamados/[id]/page.tsx', 'utf8');
const sf = ts.createSourceFile('page.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

console.log('Diagnostics count:', sf.parseDiagnostics.length);
for (const d of sf.parseDiagnostics) {
  const pos = sf.getLineAndCharacterOfPosition(d.start);
  console.log('Linha ' + (pos.line + 1) + ':' + (pos.character + 1) + ' - ' + d.messageText);
}
