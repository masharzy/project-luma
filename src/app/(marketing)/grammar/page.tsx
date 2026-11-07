import {grammarFor} from "@/lib/grammar";
import {GrammarApp} from "@/components/grammar/grammar-app";
export const dynamic="force-dynamic";
export const metadata={title:"IELTS Grammar Practice: Tests with Explanations",description:"IELTS grammar practice by topic: tenses, articles, prepositions, conditionals, passive voice and more. Three levels per topic with instant explanations."};
export default async function Page(){return <GrammarApp cats={await grammarFor()}/>;}
