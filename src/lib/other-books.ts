export const otherBookSeries=[
 {slug:"official-guide",name:"Official Cambridge Guide",cover:"/images/books/official-guide.jpg"},
 {slug:"official-materials",name:"Official IELTS Practice Materials",cover:"/images/books/official-materials.jpg"},
 {slug:"practice-tests-plus",name:"Practice Tests Plus",cover:"/images/books/plus-1.jpg"},
 {slug:"achieve-ielts",name:"Achieve IELTS",cover:"/images/books/achieve-ielts.webp"},
 {slug:"barrons",name:"Barron's",cover:"/images/books/barrons.jpg"},
 {slug:"collins",name:"Collins",cover:"/images/books/collins-1.jpg"},
 {slug:"ielts-simulation",name:"IELTS Simulation Tests",cover:"/images/books/ielts-simulation.jpg"},
 {slug:"ielts-trainer",name:"IELTS Trainer",cover:"/images/books/trainer-1.jpg"},
 {slug:"oxford-ielts",name:"Oxford IELTS",cover:"/images/books/oxford-ielts.jpg"},
 {slug:"succeed-ielts",name:"Succeed in IELTS",cover:"/images/books/succeed-ielts.jpg"}
];durations?:Record<string,number>;modules:{module:string;types:string[]}[]};
export function filterBookTests(tests:BookTest[],book:string,module:string,type:string){return tests.filter(t=>(!book||t.bookSlug===book)&&t.modules.some(m=>(!module||m.module===module)&&(!type||m.types.includes(type))));}
