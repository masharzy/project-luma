import { PracticeGuidePage } from "@/components/practice-guide-page";
import { practiceGuides } from "@/lib/practice-guides";
import { publicPageMetadata } from "@/lib/seo";
const guide = practiceGuides[0];
export const metadata = publicPageMetadata(guide.title, guide.description, "/ielts-listening-practice");
export default function Page() { return <PracticeGuidePage guide={guide}/>; }
