import ThreatGlobe from "./preview";

type GlobalThreatMapProps = {
  title?: string;
};

export const GlobalThreatMap = ({ title }: GlobalThreatMapProps) => {
  return <ThreatGlobe title={title ?? "Real-Time Suspicious Transactions Across Countries"} />;
};

export default GlobalThreatMap;