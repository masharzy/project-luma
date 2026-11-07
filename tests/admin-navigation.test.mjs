import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/admin/navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports});
const {adminNavigation,adminLinkActive,adminPageLabel,adminTheme}=module.exports;
const links=adminNavigation.flatMap(g=>g.links);
test('all admin destinations are real, unique routes and all management sections are reachable',()=>{
 assert.equal(links.length,19);assert.equal(new Set(links.map(l=>l.href)).size,links.length);
 for(const link of links)assert.ok(fs.existsSync('src/app/(management)'+link.href+'/page.tsx'),link.href+' must exist');
 const dirs=fs.readdirSync('src/app/(management)/admin',{withFileTypes:true}).filter(d=>d.isDirectory()&&!['engine','tests','questions','speaking-diagnostic'].includes(d.name));
 for(const dir of dirs.filter(d=>!fs.readFileSync('src/app/(management)/admin/'+d.name+'/page.tsx','utf8').includes('permanentRedirect')))assert.ok(links.some(l=>l.href==='/admin/'+dir.name),dir.name+' missing from menu');
});
test('nested pages keep the correct active section, without matching other prefixes',()=>{
 assert.equal(adminLinkActive('/admin/cambridge/21','/admin/cambridge'),true);
 assert.equal(adminLinkActive('/admin/resources/new','/admin/resources'),true);
 assert.equal(adminLinkActive('/admin/users','/admin'),false);
 assert.equal(adminLinkActive('/admin/users-extra','/admin/users'),false);
 assert.equal(adminPageLabel('/admin/engine/cambridge/1/reading'),'Question editor');
});
test('theme cookie only accepts supported values',()=>{
 for(const value of ['dark','light'])assert.equal(adminTheme(value),value);
 for(const value of [undefined,null,'system','DARK','<script>','dark;other=x'])assert.equal(adminTheme(value),'system');
});
test('admin layout remains guarded; new shell does not replace the learner workspace',()=>{
 const layout=fs.readFileSync('src/app/(management)/admin/layout.tsx','utf8');assert.match(layout,/await requireAdmin\(\)/);assert.match(layout,/await cookies\(\)/);
 assert.ok(!fs.readFileSync('src/components/workspace-shell.tsx','utf8').includes('admin-compact.css'));
});
