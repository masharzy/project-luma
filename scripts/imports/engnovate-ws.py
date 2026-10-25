"""Public Writing/Speaking source conversion; no source scores, samples or scripts imported."""
import pathlib,json,re,hashlib,sys
from html.parser import HTMLParser
class Node:
 def __init__(self,tag='',attrs=None,parent=None):self.tag=tag;self.attrs=dict(attrs or []);self.parent=parent;self.children=[]
 def all(self,predicate):
  out=[]
  for x in self.children:
   if isinstance(x,Node):
    if predicate(x):out.append(x)
    out+=x.all(predicate)
  return out
 def text(self):return ' '.join((x.text()if isinstance(x,Node)else x)for x in self.children if not isinstance(x,Node)or x.tag not in ['script','style'])
 def has(self,c):return c in self.attrs.get('class','').split()
class DOM(HTMLParser):
 def __init__(self,s):super().__init__(convert_charrefs=True);self.root=Node('root');self.cur=self.root;self.feed(s)
 def handle_starttag(self,t,a):
  n=Node(t,a,self.cur);self.cur.children.append(n)
  if t not in ['img','br','input','hr','meta','link','source','area','wbr','embed']:self.cur=n
 def handle_startendtag(self,t,a):self.handle_starttag(t,a);self.handle_endtag(t)
 def handle_endtag(self,t):
  n=self.cur
  while n.parent:
   if n.tag==t:self.cur=n.parent;return
   n=n.parent
 def handle_data(self,s):self.cur.children.append(s)
def clean(s):return re.sub(r'\s+',' ',s).strip()
def paragraphs(n):
 blocks=n.all(lambda x:x.tag in ['p','li'])
 if not blocks:return [clean(n.text())]
 return [clean(x.text())for x in blocks if clean(x.text())]
def image(n):return n.attrs.get('data-src')or n.attrs.get('src')
def convert(kind,b,t,s,url):
 d=DOM(s).root;h=d.all(lambda x:x.tag=='h1');assert h and re.search(fr'Cambridge IELTS 0?{b} Academic {kind.title()} Test {t}\b',h[0].text()),'Identity mismatch'
 if kind=='writing':
  sections=d.all(lambda x:x.has('ielts-writing-question-section'));assert len(sections)==2,'Expected two tasks';parts=[]
  for i,section in enumerate(sections):
   prompt=section.all(lambda x:x.has('ielts-writing-question'));assert len(prompt)==1,'Missing task prompt';text='\n\n'.join(paragraphs(prompt[0]));assert len(text)>30,'Empty task';images=[image(x)for x in section.all(lambda x:x.tag=='img'and x.has('ielts-writing-image'))];assert len(images)<=1,'Multiple reference images need explicit layout';assert i!=0 or images,'Task 1 image missing'
   p={'id':f'en-c{b}-t{t}-w-p{i+1}','title':f'Task {i+1}','part_number':i+1,'passage_text':text,'question_groups':[]}
   if images:p['image_url']=images[0]
   parts.append(p)
  return {'schemaVersion':1,'durationMinutes':60,'audioUrl':'','parts':parts,'questions':[]}
 qs=d.all(lambda x:bool(re.fullmatch(r'ielts-speaking-question-\d+',x.attrs.get('id',''))));assert qs,'Speaking questions missing';groups={};ids=[]
 for q in qs:
  kind=q.attrs.get('data-question-type');assert kind in ['part_one','part_two','part_three'],'Unknown source question type';num=int(q.attrs['data-question-number']);assert num not in ids,'Duplicate source number';ids.append(num)
  body=q.all(lambda x:x.has('question-text'));assert len(body)==1,'Missing question text';ps=paragraphs(body[0]);assert ps and all(ps),'Empty source question';groups.setdefault(kind,[]).append({'sourceNumber':num,'text':'\n'.join(ps),'paragraphs':ps,'taskCard':kind=='part_two','images':[image(x)for x in body[0].all(lambda x:x.tag=='img')]})
 assert ids==list(range(1,len(ids)+1)),'Source question number gap';assert 1<=len(groups)<=3,'Part count';return {'sourceParts':[{'title':f'Part {i+1}','questions':v}for i,v in enumerate(groups.values())],'timing':{'preparationSeconds':60,'longTurnSeconds':120,'shortAnswerSeconds':90},'part1':[],'part3':[],'rounding':[],'cueCard':{'topic':'','points':[],'explain':''}}
if __name__=='__main__':
 root=pathlib.Path(sys.argv[1]if len(sys.argv)>1 else '/tmp/luma-ws-audit');out=pathlib.Path(sys.argv[2]if len(sys.argv)>2 else 'data/imports/engnovate-ws');out.mkdir(parents=True,exist_ok=True);reports=[]
 for kind in ['writing','speaking']:
  for b in range(1,22):
   for t in range(1,5):
    url=f'https://engnovate.com/ielts-{kind}-tests/cambridge-ielts-{b:02}-academic-{kind}-test-{t}/';r={'module':kind,'book':b,'test':t,'url':url};f=root/f'{kind}-{b:02}-{t}.html'
    try:
     s=f.read_text();document=convert(kind,b,t,s,url);(out/f'{kind}-{b:02}-{t}.json').write_text(json.dumps(document,ensure_ascii=False)+'\n');r.update(status='converted',sourceHash=hashlib.sha256(s.encode()).hexdigest(),parts=len(document.get('sourceParts',document.get('parts',[]))))
    except Exception as e:r.update(status='review',issues=[str(e)])
    reports.append(r)
 (out/'report.json').write_text(json.dumps(reports,indent=2)+'\n');print('Converted',sum(x['status']=='converted'for x in reports),'review',sum(x['status']=='review'for x in reports));print([(x['module'],x['book'],x['test'],x.get('issues'))for x in reports if x['status']=='review'])
