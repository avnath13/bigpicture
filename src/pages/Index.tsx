import { Helmet } from "react-helmet-async";
import { AnnualCalendar } from "@/components/AnnualCalendar";

export default function Index() {
  return (
    <>
      <Helmet>
        <title>BigPicture — Your Year at a Glance</title>
        <meta
          name="description"
          content="A beautiful personal annual calendar. See your whole year at a glance, plan events with drag-to-create, and never lose the big picture."
        />
        <meta property="og:title" content="BigPicture — Your Year at a Glance" />
        <meta
          property="og:description"
          content="See your whole year at a glance. Plan events, filter by category, and keep the big picture."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://bigpicture.app/" />
      </Helmet>
      <AnnualCalendar />
    </>
  );
}
