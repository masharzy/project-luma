import Link from "next/link";
import { publicPageMetadata } from "@/lib/seo";
export const metadata = publicPageMetadata("About JumpToNine", "JumpToNine একটি স্বাধীন IELTS practice platform। আমাদের practice tools, learning resources ও AI feedback-এর ব্যবহার এবং সীমা সম্পর্কে জানো।", "/about");
export default function AboutPage() {
 return <article className="practice-guide guide-article container" lang="bn">
 <header className="guide-intro"><span className="eyebrow">OUR PLATFORM</span><h1 lang="en">About JumpToNine</h1><p>IELTS প্রস্তুতিকে নিয়মিত অনুশীলন ও পরিষ্কার review-এর মাধ্যমে এগিয়ে নেওয়ার একটি স্বাধীন online platform।</p></header>
 <section><h2 lang="en">Practice, review, repeat</h2><p>JumpToNine-এ Listening ও Reading practice, বই অনুযায়ী test খোঁজা এবং নির্দিষ্ট question type অনুশীলন করা যায়। Writing ও Speaking-এর AI feedback নিজের উত্তর revise করার সহায়ক হিসেবে ব্যবহার করা যায়। কোন test free আর কোনটির জন্য premium access দরকার, তা সংশ্লিষ্ট পেজে দেখানো হয়।</p><p><Link href="/practice">Practice tests</Link>, <Link href="/cambridge">Cambridge library</Link> এবং <Link href="/other-books">More Books</Link> থেকে প্রস্তুতি শুরু করো। বর্তমান মূল্য ও allowance-এর জন্য <Link href="/pricing">Pricing</Link> দেখো।</p></section>
 <section><h2 lang="en">What our feedback means</h2><p>AI feedback ও আনুমানিক band একটি learning aid। এগুলো official IELTS result নয়, certified examiner-এর মূল্যায়নের বিকল্পও নয়। AI ভুল করতে পারে; কোনো পরামর্শ অস্পষ্ট হলে নিজের লেখার evidence ও official assessment guidance-এর সঙ্গে মিলিয়ে দেখো। আমরা নির্দিষ্ট band বা পরীক্ষার ফলের নিশ্চয়তা দিই না।</p></section>
 <section><h2 lang="en">Learning materials</h2><p>আমাদের study guide-এর ছোট worked examples নিজস্ব learning exercise হিসেবে চিহ্নিত। বইয়ের নাম সংশ্লিষ্ট collection চেনানোর জন্য ব্যবহার করা হয়। JumpToNine IELTS-এর official test provider বা বইয়ের প্রকাশকের প্রতিনিধি নয়। পরীক্ষার সর্বশেষ নিয়মের জন্য <a href="https://ielts.org/">official IELTS website</a> দেখো।</p></section>
 <section><h2 lang="en">Your account and information</h2><p>কোন তথ্য সংগ্রহ করা হয় ও কীভাবে ব্যবহার করা হয় জানতে <Link href="/pp">Privacy Policy</Link> পড়ো। ব্যবহার, feedback বা content সম্পর্কে যোগাযোগের তথ্য পাবে <Link href="/tos">Terms of Service</Link> এবং Privacy Policy-তে।</p></section>
 </article>;
}
