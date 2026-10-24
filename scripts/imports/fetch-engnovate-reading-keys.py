import sys
import pathlib,urllib.request,json,re,time,concurrent.futures
from html.parser import HTMLParser
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/luma-engnovate-reading');cache=root/'public-keys';cache.mkdir(exist_ok=True)
def get(url,path):
 if path.exists():return path.read_text()
 for retry in range(3):
  try:
   time.sleep(1)
   s=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Luma import review/1.0'}),timeout=45).read().decode();path.write_text(s);return s
  except Exception:
   if retry==2:raise
   time.sleep(60)
class Archive(HTMLParser):
 def __init__(self,s):super().__init__();self.cur=None;self.rows=[];self.feed(s)
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a' and 'ira-archive-link' in d.get('class',''):self.cur={'url':d['href'],'text':''}
 def handle_data(self,s):
  if self.cur is not None:self.cur['text']+=' '+s
 def handle_endtag(self,t):
  if t=='a' and self.cur is not None:
   txt=' '.join(self.cur['text'].split());m=re.search(r'From Cambridge IELTS (\d+) Academic Reading Test ([1-4]).*?Part ([1-3])',txt)
   if m and 1<=int(m[1])<=21:self.rows.append({**self.cur,'book':int(m[1]),'test':int(m[2]),'part':int(m[3])})
   self.cur=None
rows=[]
def page(n):return Archive(get('https://engnovate.com/ielts-reading-answers/'+(''if n==1 else f'page/{n}/'),cache/f'index-{n}.html')).rows
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
 for i,r in enumerate(pool.map(page,range(1,67))):
  rows.extend(r)
  if i%10==0:print('INDEX',i+1,'selected',len(rows),flush=True)
byid={(r['book'],r['test'],r['part']):r for r in rows};(cache/'manifest.json').write_text(json.dumps(list(byid.values()),indent=2));print('PUBLIC PART PAGES',len(byid),flush=True)
def key(r):
 try:
  s=get(r['url'],cache/f"{r['book']:02}-{r['test']}-{r['part']}.html");return {**r,'ok':True}
 except Exception as e:return {**r,'ok':False,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
 for i,r in enumerate(pool.map(key,byid.values())):
  if i%24==0:print('PUBLIC KEYS FETCHED',i+1,flush=True)
  if not r['ok']:print('FAILED',r,flush=True)
print('DONE',flush=True)
