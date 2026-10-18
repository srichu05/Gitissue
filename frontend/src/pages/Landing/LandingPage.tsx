import { Navbar } from '@/components/templates/akor/navbar';
import { Hero } from '@/components/templates/akor/hero';
import { Services } from '@/components/templates/akor/services';
import { Showcase } from '@/components/templates/akor/showcase';
import { About } from '@/components/templates/akor/about';
import { Workflow } from '@/components/templates/akor/workflow';
import { Footer } from '@/components/templates/akor/footer';

export function LandingPage() {
  return (
    <div className="akor relative min-h-svh bg-background text-foreground antialiased selection:bg-primary/35 selection:text-foreground">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Showcase />
        <About />
        <Workflow />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
