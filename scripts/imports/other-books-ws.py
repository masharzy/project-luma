"""Convert selected book Writing and Speaking files from the user-supplied ZIP offline."""
import importlib.util,json,pathlib,sys,hashlib,re,os
spec=importlib.util.spec_from_file_location('ws',pathlib.Path(__file__).with_name('engnovate-ws.py'))
ws=importlib.util.module_from_spec(spec);spec.loader.exec_module(ws)
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(os.environ.get('IMPORT_OUTPUT','data/imports/other-books'));out.mkdir(parents=True,exist_ok=True);reports=[]
for b in json.loads(pathlib.Path(__file__).with_name(os.environ.get('IMPORT_CONFIG','other-books-config.json')).read_text()):
 for t in range(1,b['tests']+1):
  for module in ['writing','speaking']:
   if not (root/b['folder']/f'Test-{t}'/f'{module}.html').exists():continue
   r=dict(slug=b['slug'],title=b['title'],test=t,module=module,issues=[])
   try:
    s=(root/b['folder']/f'Test-{t}'/f'{module}.html').read_text()
    # The source uses zero-padded display numbers for Simulation; retain all question HTML.
    h=ws.DOM(s).root.all(lambda n:n.tag=='h1')[0]
    expected=f"{b['title']} Academic {module.title()} Test {t}"
    actual=re.sub(r'\s*\(Online Test\)\s*$','',ws.clean(h.text()),flags=re.I)
    assert re.sub(r'Test 0+(\d+)',r'Test \1',actual,flags=re.I).lower()==expected.lower(),'Book/test identity mismatch'
    doc=ws.convert(module,1,t,s,'',series=b['slug'],expected_title=actual)
    if module=='writing':
     for i,p in enumerate(doc['parts']):p['id']=f"en-{b['slug']}-t{t}-w-p{i+1}"
     assert len(doc['parts'])==2,'Expected two Writing tasks'
    else:assert len(doc['sourceParts'])==3,'Expected three Speaking parts'
    name=f"{b['slug']}-test-{t}-{module}.json";(out/name).write_text(json.dumps(doc,ensure_ascii=False)+'\n')
    r.update(file=name,status='validated',sourceHash=hashlib.sha256(s.encode()).hexdigest())
   except Exception as e:r.update(status='review',issues=[str(e)])
   reports.append(r)
(out/'report-ws.json').write_text(json.dumps(reports,indent=2)+'\n')
print(json.dumps({'validated':sum(r['status']=='validated' for r in reports),'review':[r for r in reports if r['status']!='validated']}))
