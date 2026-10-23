import { notFound } from "next/navigation";
import Link from "next/link";
import { PageIntro, PageWrap, EmptyState } from "@/components/page-parts";
import { Icon } from "@/components/ui/icon";
export default async function Page({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const { book } = await params;
  const number = Number(book);
  if (
    !/^\d+$/.test(book) ||
    !Number.isInteger(number) ||
    number < 1 ||
    number > 21
  )
    notFound();
  const premium = number > 10;
  return (
    <PageWrap tone="library-page">
      <PageIntro
        eyebrow={"CAMBRIDGE / " + number}
        title={"Cambridge " + number}
        description={
          premium
            ? "এই বইয়ের practice Premium membership-এর অংশ। Premium access চালু হলে এখান থেকে প্রস্তুতি নিতে পারবে।"
            : "এই বইয়ের Listening ও Reading practice ফ্রিতে করা যাবে। Published test নিচে দেখা যাবে।"
        }
      >
        <Link className="text-link" href="/cambridge">
          ← Back to the shelf
        </Link>
      </PageIntro>
      <div className="book-detail">
        <div className={"book-cover " + (premium ? "premium-detail" : "")}>
          <span>
            CAMBRIDGE
            <br />
            IELTS
          </span>
          <strong>{String(number).padStart(2, "0")}</strong>
          <span>YOUR PRACTICE COLLECTION</span>
        </div>
        <section>
          <span className="access-pill">
            {premium ? "PREMIUM LIBRARY" : "FREE LIBRARY"}
          </span>
          <h2>Take it one test at a time.</h2>
          <p lang="bn">
            Question content publish হওয়ার পর বইয়ের test আর module এখানে সাজানো
            থাকবে।
          </p>
          <div className="book-modules">
            <span>
              <Icon name="headphones" />
              Listening
            </span>
            <span>
              <Icon name="book" />
              Reading
            </span>
          </div>
          {premium && (
            <Link href="/pricing" className="button">
              View Premium <span>↗</span>
            </Link>
          )}
        </section>
      </div>
      {premium ? (
        <div className="premium-lock">
          <Icon name="lock" />
          <h3>Premium access is required.</h3>
          <p lang="bn">
            Free account বা guest access-এ Cambridge ১১–২১-এর question খোলা হবে
            না।
          </p>
        </div>
      ) : (
        <div className="catalog-empty">
          <EmptyState
            title="The tests are being prepared."
            description="এই বইয়ের কোনো test এখনো publish করা হয়নি। অন্য collection-গুলো দেখে নিতে পারো।"
            action="Browse practice"
            href="/practice"
          />
        </div>
      )}
    </PageWrap>
  );
}
