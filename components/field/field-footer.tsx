import Link from "next/link";

/** Footer for the field-notebook design. */
export function FieldFooter() {
  return (
    <footer className="fd-footer">
      <div className="fd-frame fd-footer-inner">
        <div>
          <h2>Geotechnical Insights Hub</h2>
          <p style={{ margin: 0, maxWidth: "34em", lineHeight: 1.6 }}>
            Articles and calculators for preliminary geotechnical assessment, teaching and research. Every output is a
            screening result: check it independently before it informs a design decision.
          </p>
        </div>
        <div>
          <h2>Explore</h2>
          <ul>
            <li>
              <Link href="/tools" className="fd-link">
                Tools
              </Link>
            </li>
            <li>
              <Link href="/blog" className="fd-link">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/docs/guide" className="fd-link">
                Getting started guide
              </Link>
            </li>
            <li>
              <Link href="/contact" className="fd-link">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2>Legal</h2>
          <ul>
            <li>
              <Link href="/terms" className="fd-link">
                Terms of Use
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="fd-link">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/disclaimer" className="fd-link">
                Disclaimer
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="fd-frame fd-footer-base">
        <span>© {new Date().getFullYear()} Geotechnical Insights Hub</span>
        <span>Preliminary tools · not for design or construction</span>
      </div>
    </footer>
  );
}
