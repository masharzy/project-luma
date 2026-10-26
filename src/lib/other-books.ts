export const otherBooks = [
  {slug:"collins-1",series:"Collins",title:"IELTS Practice Tests",volume:"Volume 1",isbn:"9780007499694",cover:"/images/books/collins-1.jpg"},
  {slug:"collins-2",series:"Collins",title:"IELTS Practice Tests",volume:"Volume 2",isbn:"9780007598137",cover:"/images/books/collins-2.jpg"},
  {slug:"collins-3",series:"Collins",title:"IELTS Practice Tests",volume:"Volume 3",isbn:"9780008453220",cover:"/images/books/collins-3.jpg"},
  {slug:"barrons",series:"Barron's",title:"IELTS Practice Exams",volume:"Academic",isbn:"9781506268156",cover:"/images/books/barrons.jpg"},
  {slug:"plus-1",series:"Practice Tests Plus",title:"IELTS Practice Tests Plus",volume:"Book 1",isbn:"9780582471696",cover:"/images/books/plus-1.jpg"},
  {slug:"plus-2",series:"Practice Tests Plus",title:"IELTS Practice Tests Plus",volume:"Book 2",isbn:"9781405833127",cover:"/images/books/plus-2.jpg"},
  {slug:"plus-3",series:"Practice Tests Plus",title:"IELTS Practice Tests Plus",volume:"Book 3",isbn:"9781408262535",cover:"/images/books/plus-3.jpg"},
] as const;
export function validBookSlug(value:unknown):value is string {return typeof value === "string" && otherBooks.some(b=>b.slug===value);}
export type BookTest={id:string;title:string;bookSlug:string;modules:{module:string;types:string[]}[]};
export function filterBookTests(tests:BookTest[],book:string,module:string,type:string){return tests.filter(t=>(!book||t.bookSlug===book)&&t.modules.some(m=>(!module||m.module===module)&&(!type||m.types.includes(type))));}
