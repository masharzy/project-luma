import { PracticeGuidePage } from "@/components/practice-guide-page";
import { practiceGuides } from "@/lib/practice-guides";
import { publicPageMetadata } from "@/lib/seo";
const guide = practiceGuides[1];
export const metadata = publicPageMetadata(guide.title, guide.description, "/ielts-reading-practice");
export default function Page() { return <PracticeGuidePage guide={guide}/>; }
