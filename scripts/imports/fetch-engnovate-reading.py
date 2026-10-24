import sys
import urllib.request,pathlib,concurrent.futures,time,re,json
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/luma-engnovate');base='https://engnovate.com/ielts-reading-tests/'
def fetch(bt):
 b,t=bt;p=root/f'{b:02}-{t}.html';url=base+f'cambridge-ielts-{b:02}-academic-reading-test-{t}/'
 for retry in range(3):
  try:
   if p.exists():s=p.read_text()
   else:
    s=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Luma import review/1.0'}),timeout=45).read().decode();p.write_text(s)
   if not re.search(fr'Cambridge IELTS 0?{b} Academic Reading Test {t}',s,re.I):raise ValueError('Identity not verified')
   return {'book':b,'test':t,'module':'reading','url':url,'bytes':len(s),'status':'downloaded_identity_verified'}
  except Exception as e:
   if retry==2:return {'book':b,'test':t,'url':url,'status':'failed','error':str(e)}
   time.sleep(2+retry)
result=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for i,item in enumerate(pool.map(fetch,[(b,t)for b in range(1,22)for t in range(1,5)])):
  result.append(item)
  if i%8==0:print('Fetched',i+1,'/84',item['status'],flush=True)
  (root/'manifest.json').write_text(json.dumps(result,indent=2))
print('DONE',sum(x['status']=='downloaded_identity_verified'for x in result),'/84',flush=True)
