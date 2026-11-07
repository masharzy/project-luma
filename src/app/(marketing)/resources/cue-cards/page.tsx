import {cueCardsFor} from "@/lib/cue-cards";
import {CueApp} from "@/components/cue-cards/cue-app";
export const metadata={title:"IELTS Speaking Cue Cards by Topic",description:"IELTS Speaking Part 2 cue cards by topic with step-by-step sample answers, Part 3 model answers and useful vocabulary."};
export const dynamic="force-dynamic";
export default async function Page(){
 const {cards,categories}=await cueCardsFor();
 return <CueApp cards={cards} categories={categories}/>;
}
