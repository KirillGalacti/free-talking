import { useSearch } from "@/lib/router";
import { FlowProvider } from "@/state/flow";
import { SetupMethodScreen } from "@/screens/setup-method-screen";
import { CounterpartyScreen } from "@/screens/counterparty-screen";
import { DetailsScreen } from "@/screens/details-screen";
import { ExactScreen } from "@/screens/exact-screen";
import { RandomLockScreen, RandomResultScreen } from "@/screens/random-screens";
import { SeedScreen } from "@/screens/seed-screen";
import { BriefScreen } from "@/screens/brief-screen";
import { MeetingScreen } from "@/screens/meeting-screen";
import { ReportScreen } from "@/screens/report-screen";
import { FullReportScreen } from "@/screens/full-report-screen";
import { ReplayScreen } from "@/screens/replay-screen";

function Screen() {
  const search = useSearch();
  const screen = new URLSearchParams(search).get("screen");
  switch (screen) {
    case "counterparty":
      return <CounterpartyScreen />;
    case "details":
      return <DetailsScreen />;
    case "exact":
      return <ExactScreen />;
    case "random":
      return <RandomLockScreen />;
    case "random-result":
      return <RandomResultScreen />;
    case "seed":
      return <SeedScreen />;
    case "brief":
      return <BriefScreen />;
    case "meeting":
      return <MeetingScreen />;
    case "report":
      return <ReportScreen />;
    case "full-report":
      return <FullReportScreen />;
    case "replay":
      return <ReplayScreen />;
    default:
      return <SetupMethodScreen />;
  }
}

export default function App() {
  return (
    <FlowProvider>
      <Screen />
    </FlowProvider>
  );
}
