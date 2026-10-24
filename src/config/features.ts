export const modules = [
  {
    id: "listening",
    name: "Listening",
    icon: "headphones",
    number: "01",
    line: "Listen for the little details.",
    description: "Audio শুনে প্রশ্ন বুঝতে আর সঠিক উত্তর খুঁজতে প্রস্তুতি নাও।",
    meta: "Audio · Questions · Review",
  },
  {
    id: "reading",
    name: "Reading",
    icon: "book",
    number: "02",
    line: "Read between the lines.",
    description:
      "Passage থেকে প্রয়োজনের তথ্য খোঁজা, অর্থ বোঝা আর উত্তর দেওয়ার practice।",
    meta: "Passages · Questions · Review",
  },
  {
    id: "writing",
    name: "Writing",
    icon: "pen",
    number: "03",
    line: "Give your ideas a little structure.",
    description:
      "Task 1 ও Task 2-এর উত্তর গোছাতে, পরিষ্কারভাবে ভাবতে আর লিখতে শেখো।",
    meta: "Task 1 · Task 2 · Your words",
  },
  {id:"speaking",name:"Speaking",icon:"headphones",number:"04",line:"Find your voice.",description:"প্রশ্ন শুনে নিজের উত্তর record করো, নিজের গতিতে অনুশীলন করো।",meta:"Parts 1–3 · Record · Review"},
] as const;
export const resourceCategories = [
  {
    href: "/resources/writing",
    label: "WRITING SAMPLES",
    title: "An idea, well written.",
    description: "Sample answer আর Writing guide দেখে নিজের উত্তর আরও গোছাও।",
    number: "01",
  },
  {
    href: "/vocabulary",
    label: "VOCABULARY",
    title: "Find the right word.",
    description: "শব্দের অর্থের সঙ্গে তার ব্যবহারটাও শেখো।",
    number: "02",
  },
  {
    href: "/grammar",
    label: "GRAMMAR",
    title: "Let the sentence flow.",
    description: "সঠিক grammar দিয়ে বাক্য আরও পরিষ্কার আর সাবলীল করো।",
    number: "03",
  },
  {
    href: "/resources/ebooks",
    label: "THE EBOOK SHELF",
    title: "Keep a good book close.",
    description: "প্রস্তুতির প্রয়োজনীয় বই, হাতের কাছেই।",
    number: "04",
  },
] as const;
