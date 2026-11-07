#!/usr/bin/env python3
"""Merge and validate vocabulary chunks, order them, write data/vocabulary.json.
usage: build.py <chunk-dir> <out.json>"""
import json,sys,glob,re,collections
TOPICS={"Education","Environment","Technology","Health","Work & Economy","Society & Family","Government & Law","Media & Communication","Travel & Transport","Arts & Culture","Science & Research","Crime & Safety","Behaviour & Character","General Academic"}
USES={"Writing Task 1","Writing Task 2","Speaking","Reading"}
POS={"noun","verb","adjective","adverb","preposition"}
STEM_OK={"city","cry","hang","leaf","note"}  # irregular forms (cities, cried, hung, leaves, noting)
def stem_ok(word,text):
    if word in STEM_OK:return True
    t=text.lower(); s=word[:max(4,len(word)-3)] if len(word)>4 else word
    return s in t
def check(w):
    e=[]
    if not re.fullmatch(r"[a-z][a-z -]*",w.get("word","")):e.append("word")
    if not w.get("pos") or not set(w["pos"])<=POS:e.append("pos")
    if w.get("tier") not in("core","advanced","niche"):e.append("tier")
    if w.get("band") not in(6,7,8):e.append("band")
    if not(1<=len(w.get("topics",[]))<=3 and set(w["topics"])<=TOPICS):e.append("topics")
    if not(1<=len(w.get("use",[]))<=3 and set(w["use"])<=USES):e.append("use")
    if not w.get("meaning_en","").strip():e.append("meaning_en")
    if not re.search(r"[ঀ-৿]",w.get("meaning_bn","")):e.append("meaning_bn")
    ex=w.get("examples",[])
    if len(ex)!=2 or [x.get("kind") for x in ex]!=["writing","speaking"]:e.append("examples")
    else:
        for x in ex:
            if not stem_ok(w["word"],x.get("text","")):e.append("example_word:"+x.get("kind",""))
    if not(2<=len(w.get("collocations",[]))<=4):e.append("collocations")
    if not(2<=len(w.get("synonyms",[]))<=3):e.append("synonyms")
    t=w.get("test") or {}
    if t.get("sentence","").count("_____")!=1:e.append("test_blank")
    d=t.get("distractors",[])
    if len(d)!=3 or len({x.lower() for x in d})!=3 or t.get("answer","").lower() in {x.lower() for x in d}:e.append("distractors")
    if not stem_ok(w.get("word",""),t.get("answer","")) :e.append("test_answer")
    return e
PREP={"among","behind","beside","beyond","beneath","despite","toward","upon"}
def main():
    rows=[]
    for f in sorted(glob.glob(sys.argv[1]+"/chunk_*.json")):rows+=json.load(open(f))
    bad={w.get("word","?"):check(w) for w in rows}
    bad={k:v for k,v in bad.items() if v}
    seen=collections.Counter(w["word"] for w in rows)
    dup=[k for k,v in seen.items() if v>1]
    sent=collections.Counter(x["text"] for w in rows for x in w.get("examples",[]))
    dupsent=[k for k,v in sent.items() if v>1]
    print("words",len(rows),"invalid",len(bad),"duplicate words",len(dup),"duplicate sentences",len(dupsent))
    for k,v in list(bad.items())[:40]:print(" ",k,v)
    if bad or dup:
        json.dump(bad,open(sys.argv[2]+".invalid.json","w"),indent=1);sys.exit(1)
    tiers={"core":0,"advanced":1,"niche":2}
    def order(ws):
        groups=collections.defaultdict(list)
        for w in sorted(ws,key=lambda w:w["word"]):groups[(w["band"],w["topics"][0])].append(w)
        out=[]
        for band in(7,8,6):
            ks=sorted(k for k in groups if k[0]==band);lists=[groups[k] for k in ks]
            while any(lists):
                for l in lists:
                    if l:out.append(l.pop(0))
        return out
    final=[]
    for t in("core","advanced","niche"):final+=order([w for w in rows if w["tier"]==t])
    for i,w in enumerate(final,1):w["position"]=i
    for w in final:
        if w["word"] in PREP:w["pos"]=["preposition"]
    json.dump(final,open(sys.argv[2],"w"),ensure_ascii=False,indent=0)
    print("tiers",collections.Counter(w["tier"] for w in final));print("bands",collections.Counter(w["band"] for w in final))
    print("free100 topics",collections.Counter(w["topics"][0] for w in final[:100]),"tiers",collections.Counter(w["tier"] for w in final[:100]))
main()
