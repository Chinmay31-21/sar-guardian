import Spline from "@splinetool/react-spline";
import { ArrowRight, BrainCircuit, Radar, ShieldCheck, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import sceneUrl from "@/components/ui/scene.splinecode?url";
import { useEffect, useState, type WheelEvent } from "react";
import { cn } from "@/lib/utils";

type LandingPageProps = {
  onGetStarted: () => void;
};

const highlights = [
  {
    icon: ShieldCheck,
    title: "AML-First Controls",
    description: "Automated scoring and policy-aware checks for high-risk behavior.",
  },
  {
    icon: BrainCircuit,
    title: "AI Narrative Builder",
    description: "Generate structured SAR summaries from transactional context in seconds.",
  },
  {
    icon: Radar,
    title: "Live Risk Intelligence",
    description: "Monitor suspicious flows, entities, and alert movement in real time.",
  },
];

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [modelScale, setModelScale] = useState(1);

  const clampScale = (value: number) => Math.min(2, Math.max(0.75, Number(value.toFixed(2))));

  const handleZoomIn = () => setModelScale((prev) => clampScale(prev + 0.1));
  const handleZoomOut = () => setModelScale((prev) => clampScale(prev - 0.1));
  const handleZoomReset = () => setModelScale(1);

  const handleModelWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const step = event.deltaY > 0 ? -0.05 : 0.05;
    setModelScale((prev) => clampScale(prev + step));
  };

  useEffect(() => {
    const updateViewportState = () => setIsMobileViewport(window.innerWidth < 1024);
    updateViewportState();
    window.addEventListener("resize", updateViewportState);
    return () => window.removeEventListener("resize", updateViewportState);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.25),transparent_38%),radial-gradient(circle_at_86%_90%,rgba(34,197,94,0.18),transparent_42%)]" />

      <section className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <div className="flex items-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24 lg:py-12">
          <div className="mx-auto w-full max-w-2xl space-y-8">
            <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              SAR Guardian Platform
            </p>

            <div className="space-y-5">
              <h1
                className="text-4xl font-semibold leading-tight text-white sm:text-5xl xl:text-6xl"
                style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}
              >
                Detect suspicious patterns before they become compliance risk.
              </h1>
              <p className="max-w-xl text-base text-slate-300 sm:text-lg">
                Unified intelligence, explainable scoring, and SAR workflow automation in one command center.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlights.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4 backdrop-blur"
                >
                  <Icon className="mb-3 h-5 w-5 text-cyan-300" />
                  <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{description}</p>
                </article>
              ))}
            </div>

            <Button
              onClick={onGetStarted}
              size="lg"
              className="group h-12 rounded-lg bg-cyan-300 px-6 text-slate-950 hover:bg-cyan-200"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>

        <div className="relative h-[46vh] min-h-[300px] overflow-hidden border-t border-cyan-300/20 sm:h-[52vh] lg:h-full lg:min-h-0 lg:border-l lg:border-t-0 lg:border-cyan-300/20">
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-950/10" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_54%_54%,rgba(34,211,238,0.24),transparent_44%)]" />

          {!splineLoaded && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="rounded-lg border border-cyan-300/35 bg-slate-900/70 px-4 py-2 text-xs font-medium text-cyan-200 backdrop-blur-md">
                Loading intelligence scene...
              </div>
            </div>
          )}

          <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-lg border border-cyan-300/25 bg-slate-900/75 p-1.5 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cyan-200 transition-colors hover:bg-cyan-300/15"
              aria-label="Zoom out model"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[54px] text-center text-xs font-semibold text-cyan-100">{Math.round(modelScale * 100)}%</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cyan-200 transition-colors hover:bg-cyan-300/15"
              aria-label="Zoom in model"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cyan-200 transition-colors hover:bg-cyan-300/15"
              aria-label="Reset model zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div
            onWheel={handleModelWheel}
            className={cn(
              "absolute inset-0 transition-transform duration-500 ease-out",
              isMobileViewport ? "translate-y-[-13%]" : "translate-y-[-0.1%]",
            )}
          >
            <div
              className="h-full w-full origin-center transition-transform duration-300"
              style={{ transform: `scale(${modelScale})` }}
            >
              <Spline
                scene={sceneUrl}
                style={{ width: "100%", height: "100%" }}
                onLoad={() => {
                  setSplineLoaded(true);
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
