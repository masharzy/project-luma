import {writingSamples} from "@/lib/writing-samples";
import {WritingApp} from "@/components/writing-samples/writing-app";
export const dynamic="force-dynamic";
export const metadata={title:"IELTS Writing Samples: Task 1 and Task 2 Model Answers",description:"Original IELTS Academic Writing Task 1 charts and Task 2 essays with Band 7 and Band 8 model answers, examiner comments, structure notes and useful language."};
export default async function Page(){return <WritingApp samples={await writingSamples()}/>;}
