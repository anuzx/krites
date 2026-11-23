"use client";

import {
  ArrowRight,
  Brain,
  ChevronDown,
  Clock,
  FileText,
  ListChecks,
  Route,
  Sparkles,
  Target,
} from "lucide-react";

import { GhostFibersBackground } from "@/components/GhostFibersBackground";
import { Button } from "@/components/ui/button";
import { SpotlightNavbar } from "@/components/ui/spotlight-navbar";
import type { NavItem } from "@/components/ui/spotlight-navbar";

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const HERO_CHIPS = [
  { icon: FileText, label: "Resume + GitHub aware" },
  { icon: Target, label: "Role-specific questions" },
  { icon: Clock, label: "10 / 20 / 30 min" },
  { icon: ListChecks, label: "Multiple-choice answers" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "Understands your background",
    body: "Add your resume and GitHub — the agent reads your real experience before it asks anything.",
  },
  {
    icon: Target,
    title: "Tailored to the job",
    body: "Pick a job description and get questions that match the role, stack and seniority.",
  },
  {
    icon: Clock,
    title: "You set the pace",
    body: "Choose a 10, 20 or 30 minute session and practice in the time you actually have.",
  },
  {
    icon: ListChecks,
    title: "Guided answers",
    body: "Answer by choosing from curated options, so every session stays structured and focused.",
  },
];

const STEPS = [
  {
    icon: FileText,
    title: "Add your profile",
    body: "Upload your resume and connect your GitHub account.",
  },
  {
    icon: Target,
    title: "Pick a job description",
    body: "Select the role you are targeting from the available options.",
  },
  {
    icon: Route,
    title: "Take the interview",
    body: "Answer AI questions by picking from tailored choices, then review your feedback.",
  },
];

const FAQS = [
  {
    q: "What do I need to get started?",
    a: "Your resume and your GitHub username. The AI uses both to understand what you have actually built.",
  },
  {
    q: "How are the questions chosen?",
    a: "You select a job description and the agent generates questions relevant to that role for you to answer.",
  },
  {
    q: "How long is an interview?",
    a: "You choose 10, 20 or 30 minutes before you begin, and you can stop at any point.",
  },
];

function scrollTo(href: string) {
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HomePage() {
  return (
    <main className="relative w-full bg-neutral-950 text-neutral-100">
      {/* Fixed animated ghost-fiber background (WebGL2, Canvas 2D fallback). */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <GhostFibersBackground
          glowColor="#e5e5e5"
          secondaryColor="#a3a3a3"
          speed={0.5}
          threads={72}
          density={1}
          scale={1}
          rotation={18}
          className="h-full w-full"
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-neutral-950/70 via-neutral-950/40 to-neutral-950/90" />

      {/* Spotlight navbar */}
      <header className="fixed inset-x-0 top-0 z-50">
        <SpotlightNavbar
          items={NAV_ITEMS}
          className="pt-6"
          onItemClick={(item) => scrollTo(item.href)}
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-neutral-300 hover:bg-white/5 hover:text-white"
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-full bg-white px-3.5 text-black hover:bg-neutral-200"
              >
                Get started
              </Button>
            </>
          }
        />
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 pb-20 pt-28 text-center"
      >
        <div className="flex max-w-4xl flex-col items-center gap-6">
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Practice interviews that
            <span className="block text-neutral-400">actually feel real.</span>
          </h1>

          <p className="max-w-2xl text-pretty text-base leading-relaxed text-neutral-400 sm:text-lg">
            Upload your resume, connect your GitHub and choose a job description. An AI agent studies
            your background and asks role-specific questions — and you answer by picking from options
            tailored to the job.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => scrollTo("#how-it-works")}
              className="h-11 rounded-full bg-white px-6 text-black hover:bg-neutral-200"
            >
              Start a free interview
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollTo("#features")}
              className="h-11 rounded-full border-white/15 bg-transparent px-6 text-neutral-300 hover:bg-white/5 hover:text-white"
            >
              Explore features
            </Button>
          </div>

          <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {HERO_CHIPS.map((chip) => (
              <li
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-neutral-400 backdrop-blur-sm"
              >
                <chip.icon className="size-3.5 text-neutral-500" />
                {chip.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-neutral-600">
          <ChevronDown className="size-5 animate-bounce" />
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 w-full border-t border-white/5 bg-neutral-950/95 px-6 py-24 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to prep
            </h2>
            <p className="mt-3 text-neutral-400">
              A focused interview loop built around your real experience.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/5 text-neutral-300">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="text-base font-medium text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative z-10 w-full border-t border-white/5 bg-neutral-950 px-6 py-24"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-3 text-neutral-400">
              Three steps from your resume to a scored interview.
            </p>
          </div>

          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/5 text-sm font-semibold text-neutral-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <step.icon className="mb-3 size-5 text-neutral-400" />
                <h3 className="text-base font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex justify-center">
            <Button
              size="lg"
              onClick={() => scrollTo("#home")}
              className="h-11 rounded-full bg-white px-6 text-black hover:bg-neutral-200"
            >
              Start practicing now
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 w-full border-t border-white/5 bg-neutral-950 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked</h2>
            <p className="mt-3 text-neutral-400">Quick answers before your first session.</p>
          </div>

          <dl className="mt-12 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            {FAQS.map((faq) => (
              <div key={faq.q} className="p-6">
                <dt className="text-base font-medium text-white">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-neutral-400">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-neutral-950 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Sparkles className="size-4 text-neutral-400" />
            AI Mock Interview
          </div>
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} AI Mock Interview. Practice smarter.
          </p>
        </div>
      </footer>
    </main>
  );
}

export default HomePage;
