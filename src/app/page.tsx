import Link from 'next/link'
import {
  ArrowRight,
  BrainCircuit,
  GitCompare,
  Sparkles,
  TrendingDown,
} from 'lucide-react'

const benefits = [
  {
    icon: BrainCircuit,
    title: 'It remembers what matters',
    description:
      'Your preferences and budget help shape recommendations that feel more like you.',
  },
  {
    icon: GitCompare,
    title: 'Compare with more context',
    description:
      'See options across shopping platforms and understand the trade-offs in one place.',
  },
  {
    icon: TrendingDown,
    title: 'Make the timing make sense',
    description:
      'Follow price history and get a clearer picture before you decide to buy.',
  },
]

export default function LandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#fbfaf7] text-[#181814]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="shopDitto home">
          <span className="grid size-9 place-items-center rounded-xl bg-[#1f5039] text-white">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">shopDitto</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-[#62635b] md:flex">
          <Link className="transition hover:text-[#181814]" href="#how-it-works">How it works</Link>
          <Link className="transition hover:text-[#181814]" href="#why-shopditto">Why shopDitto</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium transition hover:bg-black/5 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-[#1f5039] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173d2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5039] focus-visible:ring-offset-2"
          >
            Get started <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-32 lg:pt-24">
        <div className="pointer-events-none absolute -right-36 -top-24 size-[30rem] rounded-full bg-[#dcebdc]/70 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dfe5dc] bg-white/80 px-3.5 py-2 text-xs font-medium text-[#375b45] shadow-sm">
            <Sparkles className="size-3.5" aria-hidden="true" />
            A little more you in every decision
          </div>
          <h1 className="text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Shopping that
            <br />
            <span className="text-[#35734f]">gets to know you.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#62635b] sm:text-lg sm:leading-8">
            Meet your personal shopping intelligence. It remembers what you like,
            compares your options, and helps you feel good about what you choose.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1f5039] px-6 text-sm font-semibold text-white shadow-lg shadow-[#1f5039]/15 transition hover:-translate-y-0.5 hover:bg-[#173d2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5039] focus-visible:ring-offset-2"
            >
              Build your shopping twin
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#dfe1d9] bg-white/70 px-6 text-sm font-semibold text-[#34362f] transition hover:bg-white"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#77786f]">
            Free to explore. No checkout here — just better-informed decisions.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[#e8f1e5] via-[#f4eee0] to-[#e6eeea] blur-2xl" />
          <div className="relative rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-[0_28px_80px_-36px_rgba(31,80,57,0.32)] backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#7a7c70]">Your shopping snapshot</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">A better fit, not just a better deal.</h2>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#edf4eb] text-[#35734f]">
                <BrainCircuit className="size-5" aria-hidden="true" />
              </span>
            </div>

            <div className="mt-7 rounded-2xl border border-[#eceee8] bg-[#fbfcf9] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Your preferences, in the picture</p>
                  <p className="mt-1 text-xs text-[#77786f]">Budget · trusted brands · what you value</p>
                </div>
                <span className="rounded-full bg-[#e5f1e6] px-2.5 py-1 text-[11px] font-semibold text-[#35734f]">Remembered</span>
              </div>
              <div className="mt-4 flex gap-2" aria-hidden="true">
                <span className="h-2 flex-[1.2] rounded-full bg-[#3f7955]" />
                <span className="h-2 flex-1 rounded-full bg-[#83a889]" />
                <span className="h-2 flex-[0.8] rounded-full bg-[#cadbc8]" />
                <span className="h-2 flex-[0.55] rounded-full bg-[#e1e8dd]" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f6f2e9] p-4">
                <GitCompare className="size-5 text-[#97713a]" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold">Options side by side</p>
                <p className="mt-1 text-xs leading-5 text-[#77786f]">Compare price, fit, and details together.</p>
              </div>
              <div className="rounded-2xl bg-[#edf4eb] p-4">
                <TrendingDown className="size-5 text-[#35734f]" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold">Price with context</p>
                <p className="mt-1 text-xs leading-5 text-[#77786f]">Use trends to inform your timing.</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#eceee8] p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1f5039] text-white">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <p className="text-sm leading-6 text-[#4e5048]">
                Recommendations shaped around <span className="font-semibold text-[#20221d]">your priorities.</span>
              </p>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-full border border-white/80 bg-white px-4 py-3 text-xs font-medium text-[#4a5148] shadow-lg sm:flex">
            <span className="size-2 rounded-full bg-[#62a873]" />
            Shopping with a little more clarity
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[#e8e8e0] bg-white/70">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:px-12">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#548060]">A smarter way to decide</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
              Less tab-hopping.
              <br />
              More confidence.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#62635b]">
              shopDitto brings your shopping context together, so you can spend
              less time juggling options and more time choosing what fits.
            </p>
          </div>
          <div id="why-shopditto" className="grid gap-3 sm:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="rounded-2xl border border-[#eceee8] bg-[#fbfaf7] p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eaf1e8] text-[#35734f]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-5 text-xs font-medium text-[#8a8c82]">0{index + 1}</p>
                <h3 className="mt-2 text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6c6e65]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center sm:px-8 lg:px-12">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ready to make shopping feel more personal?</h2>
          <p className="mt-2 text-sm text-[#6c6e65]">Start with what matters to you. Your assistant will take it from there.</p>
        </div>
        <Link
          href="/signup"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#1f5039] px-6 text-sm font-semibold text-white transition hover:bg-[#173d2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5039] focus-visible:ring-offset-2"
        >
          Get started <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>

      <footer className="border-t border-[#e8e8e0] px-5 py-6 text-center text-xs text-[#77786f] sm:px-8">
        shopDitto · Cross-platform shopping intelligence
      </footer>
    </main>
  )
}
