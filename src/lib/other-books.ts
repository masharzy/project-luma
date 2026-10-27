export const otherBookSeries=[
 {slug:"collins",name:"Collins",cover:"/images/books/collins-1.jpg"},
 {slug:"barrons",name:"Barron's",cover:"/images/books/barrons.jpg"},
 {slug:"practice-tests-plus",name:"Practice Tests Plus",cover:"/images/books/plus-1.jpg"},
 {slug:"achieve-ielts",name:"Achieve IELTS",cover:"/images/books/achieve-ielts.svg"},
 {slug:"ielts-trainer",name:"IELTS Trainer",cover:"/images/books/trainer-1.svg"},
 {slug:"official-guide",name:"Official Cambridge Guide",cover:"/images/books/official-guide.svg"},
 {slug:"official-materials",name:"Official IELTS Practice Materials",cover:"/images/books/official-materials.svg"},
 {slug:"oxford-ielts",name:"Oxford IELTS",cover:"/images/books/oxford-ielts.svg"},
 {slug:"succeed-ielts",name:"Succeed in IELTS",cover:"/images/books/succeed-ielts.svg"},
 {slug:"ielts-simulation",name:"IELTS Simulation Tests",cover:"/images/books/ielts-simulation.svg"},
] as const;
export function bookHref(slug:string){const book=otherBooks.find(b=>b.slug===slug);const series=otherBookSeries.find(s=>s.name===book?.series);return series?`/other-books/${series.slug}/${slug}`:'/other-books';}
export const otherBooks = [
  {slug:"collins-1",series:"Collins",title:"IELTS Practice Tests",volume:"Volume 1",isbn:"9780007499694",cover:"/images/books/collins-1.jpg"},
  {slug:"collins-2",series:"Collins",title:"IELTS Practice Tests",volume:"Volume 2",isbn:"9780007598137",cover:"/images/books/collins-2.jpg"},
  {slug:"collins-3",series:"Collins",title:"IELTS Practice Tests",volume:"Volume 3",isbn:"9780008453220",cover:"/images/books/collins-3.jpg"},
  {slug:"barrons",series:"Barron's",title:"IELTS Practice Exams",volume:"Academic",isbn:"9781506268156",cover:"/images/books/barrons.jpg"},
  {slug:"plus-1",series:"Practice Tests Plus",title:"IELTS Practice Tests Plus",volume:"Book 1",isbn:"9780582471696",cover:"/images/books/plus-1.jpg"},
  {slug:"plus-2",series:"Practice Tests Plus",title:"IELTS Practice Tests Plus",volume:"Book 2",isbn:"9781405833127",cover:"/images/books/plus-2.jpg"},
  {slug:"plus-3",series:"Practice Tests Plus",title:"IELTS Practice Tests Plus",volume:"Book 3",isbn:"9781408262535",cover:"/images/books/plus-3.jpg"},
  {"slug": "achieve-ielts", "series": "Achieve IELTS", "title": "Practice Test Book", "volume": "Academic", "isbn": "", "cover": "/images/books/achieve-ielts.svg"},
  {"slug": "trainer-1", "series": "IELTS Trainer", "title": "Six Practice Tests", "volume": "Book 1", "isbn": "", "cover": "/images/books/trainer-1.svg"},
  {"slug": "trainer-2", "series": "IELTS Trainer", "title": "Six Practice Tests", "volume": "Book 2", "isbn": "", "cover": "/images/books/trainer-2.svg"},
  {"slug": "official-guide", "series": "Official Cambridge Guide", "title": "The Official Cambridge Guide to IELTS", "volume": "Academic", "isbn": "", "cover": "/images/books/official-guide.svg"},
  {"slug": "official-materials", "series": "Official IELTS Practice Materials", "title": "Official IELTS Practice Materials", "volume": "Academic", "isbn": "", "cover": "/images/books/official-materials.svg"},
  {"slug": "oxford-ielts", "series": "Oxford IELTS", "title": "IELTS Practice Tests", "volume": "Academic", "isbn": "", "cover": "/images/books/oxford-ielts.svg"},
  {"slug": "succeed-ielts", "series": "Succeed in IELTS", "title": "9 Practice Tests", "volume": "Academic", "isbn": "", "cover": "/images/books/succeed-ielts.svg"},
  {"slug": "ielts-simulation", "series": "IELTS Simulation Tests", "title": "IELTS Simulation Tests", "volume": "Academic", "isbn": "", "cover": "/images/books/ielts-simulation.svg"},
] as const;
export function validBookSlug(value:unknown):value is string {return typeof value === "string" && otherBooks.some(b=>b.slug===value);}
export type BookTest={speakingSetId?:string;id:string;title:string;bookSlug:string;access?:"free"|"premium";sections?:string[];durations?:Record<string,number>;modules:{module:string;types:string[]}[]};
export function filterBookTests(tests:BookTest[],book:string,module:string,type:string){return tests.filter(t=>(!book||t.bookSlug===book)&&t.modules.some(m=>(!module||m.module===module)&&(!type||m.types.includes(type))));}
