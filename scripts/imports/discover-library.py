import urllib.request,json,re,pathlib,concurrent.futures,time,sys
from html.parser import HTMLParser
from urllib.parse import urljoin
BASE='https://practicepteonline.com';cache=pathlib.Path('/tmp/luma-source-cache')
def get(url):
 key=re.sub('[^a-zA-Z0-9.-]','_',url.removeprefix(BASE)).strip('_') or 'index';p=cache/(key+'.html')
 if p.exists():return p.read_text()
 for retry in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Luma-import-review/1.0'});s=urllib.request.urlopen(req,timeout=45).read().decode();p.write_text(s);return s
  except Exception:
   if retry==2:raise
   time.sleep(2+retry)
class Links(HTMLParser):
 def __init__(self,s):super().__init__();self.links=[];self.current=None;self.depth=0;self.feed(s)
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='a':self.current=[a.get('href',''),'']
 def handle_data(self,s):
  if self.current:self.current[1]+=s
 def handle_endtag(self,t):
  if t=='a' and self.current:self.links.append(self.current);self.current=None
root=get(BASE+'/cambridge-ielts-1-13-tests/');books=[]
for href,text in Links(root).links:
 m=re.search(r'Cambridge\s+(\d+)',text,re.I)
 if m and 'Official IELTS Tests' in text:books.append({'book':int(m[1]),'url':urljoin(BASE,href)})
assert sorted(b['book'] for b in books)==list(range(1,22)),books
manifest=[]
def book(b):
 s=get(b['url']);out=[]
 for href,text in Links(s).links:
  t=' '.join(text.split());m=re.search(r'(listening|(?:academic\s+)?reading)\s+(?:test\s*)?(\d+)(?:\.(\d+))?',t,re.I)
  if not m or 'general' in t.lower():continue
  n=int(m[3] or m[2]);module='listening' if 'listening' in m[1].lower() else 'reading'
  if 1<=n<=4:out.append({'book':b['book'],'test':n,'module':module,'url':urljoin(BASE,href),'label':t})
 return out
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for result in pool.map(book,books):manifest.extend(result)
manifest.sort(key=lambda x:(x['book'],x['test'],x['module']));pathlib.Path('/tmp/luma-source-manifest.json').write_text(json.dumps(manifest,indent=2))
print('BOOKS',len(books),'MODULES',len(manifest),flush=True)
from collections import Counter
print('PER BOOK',dict(sorted(Counter(x['book'] for x in manifest).items())),flush=True)
if '--discover-only' in sys.argv:sys.exit(0)
def fetch(m):
 try:s=get(m['url']);return {'book':m['book'],'test':m['test'],'module':m['module'],'bytes':len(s),'ok':True}
 except Exception as e:return {**m,'ok':False,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for i,result in enumerate(pool.map(fetch,manifest)):
  if not result['ok']:print('FAILED',result,flush=True)
  if i%16==0:print('FETCHED',i+1,'/',len(manifest),flush=True)
print('DONE',flush=True)
