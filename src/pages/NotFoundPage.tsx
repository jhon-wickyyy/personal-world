import { Link } from 'react-router-dom';
import './page.css';

export function NotFoundPage() {
  return (
    <main className="page__main notfound" id="main">
      <div className="page__inner">
        <p className="eyebrow">404</p>
        <h1 className="display">This path does not exist.</h1>
        <p className="lede">
          The world has six pages. The one you asked for is not one of them.
        </p>
        <p>
          <Link className="button" to="/">Return to the world</Link>
        </p>
      </div>
    </main>
  );
}
