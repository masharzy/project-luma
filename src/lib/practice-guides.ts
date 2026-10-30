export type PracticeGuide = {slug:string;title:string;description:string;intro:string;cta:string;href:string;sections:{title:string;body:string;points?:string[];example?:string;answer?:string}[]};
export const practiceGuides: PracticeGuide[] = [
  {
    "slug": "ielts-listening-practice",
    "title": "IELTS Listening Practice",
    "description": "IELTS Listening practice করো একটি সহজ study plan দিয়ে। Form completion-এর worked example, ভুল বিশ্লেষণ ও Listening test-এর link পাবে এখানে।",
    "intro": "শুধু score দেখলে বোঝা যায় কতটি উত্তর ঠিক হয়েছে। কেন ভুল হলো বুঝতে পারলেই পরের practice-এ পরিবর্তন আনা যায়। একটি test বেছে নাও, নিজের ভুলের কারণ লেখো, তারপর একই দক্ষতা আবার অনুশীলন করো।",
    "cta": "Start Listening practice",
    "href": "/practice",
    "sections": [
      {
        "title": "Build a repeatable routine",
        "body": "প্রথমে একটি Listening module সময় ধরে দাও। অনুশীলনের মধ্যে বারবার pause বা উত্তর দেখা এড়িয়ে চলো। শেষে শুধু ভুলের সংখ্যা নয়, কী ধরনের ভুল হয়েছে সেটাও আলাদা করে লেখো: শব্দ শুনতে পারোনি, paraphrase ধরতে পারোনি, নাকি spelling বা instruction ভুল হয়েছে?",
        "points": [
          "শুরুর আগে প্রতিটি question-এর word limit ও প্রয়োজনীয় উত্তরটির ধরন দেখো।",
          "উত্তর number, name, place নাকি adjective হতে পারে—আগে অনুমান করো।",
          "Review-এর সময় প্রয়োজনীয় audio অংশ আবার শোনো। Transcript থাকলে দ্বিতীয়বার শুনে তারপর মিলিয়ে দেখো।",
          "একই ভুলের ধরন নিয়ে পরের দিন ছোট practice করো।"
        ]
      },
      {
        "title": "Worked example: follow the correction",
        "body": "নিচের কথোপকথনটি JumpToNine-এর তৈরি একটি text-based learning example; এটি Listening audio test নয়। Speaker কীভাবে আগের তথ্য সংশোধন করছে, সেটি লক্ষ্য করো।",
        "example": "Question: The workshop starts at ______.\nInstruction: Write ONE WORD AND/OR A NUMBER.\nSpeaker: “We originally planned to begin at nine, but the room is being cleaned. Please arrive for a ten o’clock start instead.”",
        "answer": "Answer: 10 / ten. “Originally” পুরোনো পরিকল্পনা বোঝাচ্ছে; “instead” নতুন সময়টি নিশ্চিত করছে। 9 লিখলে প্রথম উল্লেখিত তথ্য ধরে নেওয়ার ভুল হবে।"
      },
      {
        "title": "Check the answer, then diagnose the mistake",
        "body": "সঠিক শব্দ শুনেও spelling ভুল হলে একটি আলাদা spelling list রাখো। Number বা date মিস হলে ছোট dictation করো। পুরো বাক্য বুঝেও answer না পেলে question-এর ভাষা ও speaker-এর paraphrase পাশাপাশি লেখো। যেমন “starts” এবং “begin” একই ধারণা প্রকাশ করতে পারে।"
      },
      {
        "title": "Choose full tests or focused practice",
        "body": "পূর্ণ Listening test তোমার মনোযোগ ও ধারাবাহিকতা যাচাই করতে সাহায্য করে। Question Practice নির্দিষ্ট দুর্বলতা নিয়ে কাজের জন্য ব্যবহার করো। Cambridge library বা More Books থেকে module বেছে নেওয়ার আগে free/premium access দেখো। নতুন test দেওয়ার আগে আগেরটির অন্তত কয়েকটি ভুল ব্যাখ্যা করতে পারছ কি না, নিজেকে জিজ্ঞেস করো."
      }
    ]
  },
  {
    "slug": "ielts-reading-practice",
    "title": "IELTS Reading Practice",
    "description": "IELTS Reading practice-এর study plan, True/False/Not Given worked example এবং evidence খোঁজার কৌশল। JumpToNine-এ Reading test শুরু করো।",
    "intro": "Reading-এ উত্তরটি passage-এর evidence দিয়ে প্রমাণ করতে হয়। নিজের সাধারণ জ্ঞান বা অনুমান দিয়ে ফাঁকা জায়গা পূরণ করলে ভুল হতে পারে। ছোট exercise দিয়ে শুরু করে সময় ধরে পূর্ণ module-এ যাও।",
    "cta": "Start Reading practice",
    "href": "/practice",
    "sections": [
      {
        "title": "Read for structure before details",
        "body": "প্রথমবার passage দেখেই প্রতিটি শব্দ অনুবাদ করার চেষ্টা কোরো না। Title, paragraph-এর শুরু ও মূল বক্তব্য দেখে topic-এর একটি মানচিত্র বানাও। তারপর প্রশ্নে ফিরে প্রয়োজনীয় তথ্য খুঁজে বের করো। কোনো unfamiliar শব্দ উত্তরের জন্য জরুরি না হলে সেখানে আটকে থেকো না।",
        "points": [
          "প্রশ্নে নাম, সংখ্যা ও বিশেষ তথ্য চিহ্নিত করো।",
          "Passage-এ একই শব্দের বদলে paraphrase থাকতে পারে।",
          "উত্তরের পাশে কোন বাক্যটি evidence, review-এর সময় লিখে রাখো।",
          "সময় শেষ হলে কোথায় আটকে গিয়েছিলে সেটিও নোট করো।"
        ]
      },
      {
        "title": "Worked example: True, False or Not Given",
        "body": "এটি JumpToNine-এর তৈরি একটি ছোট Reading exercise। Passage-এ যা স্পষ্ট বলা আছে, শুধু সেটির ভিত্তিতে উত্তর দাও।",
        "example": "Passage: “The town library opens at 9 a.m. from Monday to Friday. On Saturdays it opens at 10 a.m.”\n1. The library opens later on Saturday than on Friday.\n2. The library opens at 9 a.m. on Saturday.\n3. The library is closed on Sunday.",
        "answer": "1. True — Friday-এ 9টা, Saturday-এ 10টা।\n2. False — Saturday-এর দেওয়া সময় 10টা, তাই বক্তব্যটি বিরোধী।\n3. Not Given — Sunday সম্পর্কে কোনো তথ্য নেই। নীরবতা থেকে “বন্ধ” ধরে নেওয়া যাবে না।"
      },
      {
        "title": "Separate contradiction from missing information",
        "body": "True/False/Not Given অনুশীলনে প্রথমে statement-এর মূল দাবি খুঁজে বের করো। Passage কি সেটি সমর্থন করছে, তার বিপরীত বলছে, নাকি সিদ্ধান্ত নেওয়ার মতো তথ্য দিচ্ছে না? “সব”, “শুধু”, “সবসময়” ধরনের শব্দে বিশেষ নজর দাও—এগুলো দাবির সীমা বদলে দেয়।"
      },
      {
        "title": "Use a useful review log",
        "body": "একটি খাতায় চারটি column রাখো: question, নিজের answer, সঠিক answer এবং evidence। কেন ভুল হয়েছিল এক লাইনে লেখো। এরপর matching headings, completion বা True/False/Not Given-এর মতো একটি ধরন বেছে focused practice করো। Academic Reading-এর official সময় 60 মিনিট; প্রস্তুতির সময় ধীরে বোঝা ও সময় ধরে দেওয়া—দুটির জন্য আলাদা session রাখতে পারো।"
      }
    ]
  },
  {
    "slug": "ielts-writing-task-2",
    "title": "IELTS Writing Task 2 Practice",
    "description": "IELTS Writing Task 2-এর essay planning, original paragraph example ও self-review checklist। যুক্তি, উদাহরণ ও পরিষ্কার structure দিয়ে লেখার অনুশীলন করো।",
    "intro": "ভালো essay শুধু কঠিন vocabulary-এর তালিকা নয়। প্রশ্নের প্রতিটি অংশের উত্তর, পরিষ্কার অবস্থান এবং যুক্তির ব্যাখ্যা দরকার। লেখার আগে ছোট plan তৈরি করো, পরে সেই plan অনুযায়ী উত্তরটি যাচাই করো।",
    "cta": "Get Writing feedback",
    "href": "/writing-evaluation",
    "sections": [
      {
        "title": "Turn the question into a plan",
        "body": "প্রশ্নে কী বিষয়ে কথা বলা হয়েছে এবং ঠিক কী করতে বলা হয়েছে—দুটিকে আলাদা করো। Agree/disagree, দুই মত আলোচনা, নাকি কারণ ও সমাধান জানতে চেয়েছে? নিজের অবস্থান এক বাক্যে লেখো। তারপর প্রতিটি body paragraph-এর জন্য একটি main idea, তার কারণ ও একটি নির্দিষ্ট উদাহরণ ঠিক করো।",
        "points": [
          "প্রশ্নের সব অংশ plan-এ আছে কি না দেখো।",
          "একটি paragraph-এ একটি প্রধান যুক্তি গড়ে তোলো।",
          "নিজের উদাহরণকে বাস্তব গবেষণা বা statistic হিসেবে সাজিয়ে লিখো না।",
          "Conclusion-এ নিজের অবস্থান ও প্রধান যুক্তির সারাংশ দাও।"
        ]
      },
      {
        "title": "Worked example: develop an idea",
        "body": "এটি JumpToNine-এর নিজস্ব practice prompt ও paragraph example; এটি official question বা band-scored sample নয়।",
        "example": "Prompt: Some people think public libraries should focus on digital resources rather than printed books. To what extent do you agree or disagree?\n\nPlan: Support digital access, but retain printed books for readers who cannot comfortably use screens.\n\nExample paragraph: “Digital resources can make a library useful beyond its opening hours. A student who works in the evening, for example, could borrow an ebook after returning home. However, this benefit depends on reliable internet access, so digital lending should complement a printed collection rather than replace it.”",
        "answer": "Paragraph-টি claim দিয়ে শুরু হয়েছে, তারপর benefit ও example এসেছে। শেষ বাক্যে একটি সীমা যোগ করে অবস্থান পরিষ্কার করেছে। নিজের লেখায় শুধু “technology is convenient” বলার বদলে কার জন্য, কীভাবে সুবিধা হচ্ছে তা ব্যাখ্যা করো।"
      },
      {
        "title": "Review meaning before vocabulary",
        "body": "প্রথম review-এ দেখো পাঠক যুক্তিটি বুঝতে পারছে কি না। কোনো sentence কি আগেরটির ব্যাখ্যা না দিয়ে শুধু একই কথা আবার বলছে? প্রতিটি pronoun-এর reference পরিষ্কার কি না দেখো। এরপর article, subject–verb agreement, tense ও punctuation পরীক্ষা করো। অর্থ ঠিক না থাকলে কঠিন synonym বসিয়ে উন্নতি হবে না।"
      },
      {
        "title": "Use AI feedback as a revision tool",
        "body": "একটি draft জমা দিয়ে feedback পাওয়ার পর দু-তিনটি পরিবর্তন বেছে নতুন draft লেখো। একই সমস্যাটি নতুন প্রশ্নে আবার হচ্ছে কি না দেখো। JumpToNine-এর Writing feedback একটি আনুমানিক AI মূল্যায়ন; এটি official IELTS score বা certified examiner-এর সিদ্ধান্ত নয়। জমা দিতে verified account দরকার; মূল্যায়ন তোমার plan-এর allowance ব্যবহার করে।"
      }
    ]
  }
];
