import {cueCardsFor} from "@/lib/cue-cards";
import {CueApp} from "@/components/cue-cards/cue-app";
export const metadata={title:"IELTS Speaking Cue Cards by Topic",description:"IELTS Speaking Part 2 cue cards by topic with Part 3 questions, useful language and a built-in 1-minute preparation and 2-minute speaking timer."};
export const dynamic="force-dynamic";
export default async function Page(){
 const {cards,categories}=await cueCardsFor();
 return <CueApp cards={cards} categories={categories}/>;
}
