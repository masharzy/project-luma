import Link from "next/link";
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="brand" href="/">
              JumpToNine
            </Link>
            <p>Listening. Reading. Writing. Speaking.</p>
          </div>
          <div>
            <h3>Practice</h3><Link href="/mocks">Mock exams</Link>
            <Link href="/cambridge">Cambridge library</Link>
            <Link href="/other-books">More Books</Link>
            <Link href="/practice">Test & Question Practice</Link>
          </div>
          <div>
            <h3>Learn</h3>
            <Link href="/resources">Resources</Link>
            <Link href="/ielts-listening-practice">IELTS Listening Practice</Link>
            <Link href="/ielts-reading-practice">IELTS Reading Practice</Link>
            <Link href="/ielts-writing-task-2">Writing Task 2 Guide</Link>
            <Link href="/about">About JumpToNine</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/pp">Privacy Policy</Link>
            <Link href="/tos">Terms of Service</Link>
          </div>
          <div>
            <h3>Your space</h3>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/auth/sign-up">Create an account</Link>
            <Link href="/auth/forgot-password">Password recovery</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} JumpToNine</span>
          <span>Independent IELTS practice platform</span>
        </div>
      </div>
    </footer>
  );
}
