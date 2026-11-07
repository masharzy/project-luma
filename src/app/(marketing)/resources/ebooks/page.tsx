import {ebooksFor} from "@/lib/ebooks";
import {EbookApp} from "@/components/ebooks/ebook-app";
export const dynamic="force-dynamic";
export const metadata={title:"IELTS Ebook Shelf: Read Online with Notes and Bookmarks",description:"Original IELTS ebooks for Writing, Speaking, Reading, Listening and study planning. Read in your browser with highlights, notes, bookmarks, search and reading themes."};
export default async function Page(){return <EbookApp books={await ebooksFor()}/>;}
