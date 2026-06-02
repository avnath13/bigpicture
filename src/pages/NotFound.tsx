import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page not found — BigPicture</title>
      </Helmet>
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-7xl font-extrabold text-primary">404</p>
        <h1 className="font-display text-2xl font-bold text-foreground">
          This page is off the calendar.
        </h1>
        <p className="max-w-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link to="/">Back to your year</Link>
        </Button>
      </main>
    </>
  );
}
