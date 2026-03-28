export function Footer() {
  const year = new Date().getFullYear()

  const cols = [
    {
      title: 'Product',
      links: ['Features', 'How It Works', 'Pricing', 'Changelog'],
    },
    {
      title: 'Use Cases',
      links: ['Vegetable Vendors', 'Kirana Stores', 'Dairy Traders', 'Fruit Sellers'],
    },
    {
      title: 'Company',
      links: ['About', 'Blog', 'Careers', 'Contact'],
    },
    {
      title: 'Legal',
      links: ['Privacy Policy', 'Terms of Service', 'Refund Policy'],
    },
  ]

  return (
    <footer className="footer-bg pt-16 pb-8">
      <div className="container-web">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 text-white/85">
                <svg viewBox="0 0 100 100" fill="none">
                  <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
                  <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[17px] font-extrabold text-white tracking-tight">VoiceTrace</span>
            </div>
            <p className="text-[13px] leading-relaxed text-white/40 font-medium max-w-[200px]">
              AI business intelligence for India's street vendors and small traders.
            </p>
          </div>

          {/* Link cols */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-[11.5px] font-bold uppercase tracking-widest text-white/30 mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-[13.5px] text-white/45 hover:text-white/80 font-medium transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/08 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12.5px] text-white/25 font-medium">© {year} VoiceTrace. All rights reserved.</p>
          <p className="text-[12.5px] text-white/25 font-medium">Made with ♥ for India's vendors.</p>
        </div>
      </div>
    </footer>
  )
}
