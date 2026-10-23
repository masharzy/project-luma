import Link from "next/link";
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="brand" href="/">
              luma<span>/ IELTS</span>
            </Link>
            <p>Listening. Reading. Writing.</p>
          </div>
          <div>
            <h3>Practice</h3>
            <Link href="/cambridge">Cambridge library</Link>
            <Link href="/mocks">Scheduled mocks</Link>
          </div>
          <div>
            <h3>Learn</h3>
            <Link href="/resources">Writing & resources</Link>
            <Link href="/pricing">Free & Premium</Link>
          </div>
          <div>
            <h3>Your space</h3>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/auth/sign-up">Create an account</Link>
            <Link href="/auth/forgot-password">Password recovery</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Luma IELTS</span>
          <span>Independent IELTS practice platform</span>
        </div>
      </div>
    </footer>
  );
}
