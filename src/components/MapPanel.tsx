import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Trial } from "@/data/types";

const recruitingIcon = new L.DivIcon({
  html: `<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const closedIcon = new L.DivIcon({
  html: `<div style="background:#6b7280;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ trials }: { trials: Trial[] }) {
  const map = useMap();
  const prevLength = useRef(0);

  useEffect(() => {
    if (trials.length > 0 && trials.length !== prevLength.current) {
      const bounds = L.latLngBounds(trials.map((t) => [t.latitude, t.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      prevLength.current = trials.length;
    }
  }, [trials, map]);

  return null;
}

interface MapPanelProps {
  trials: Trial[];
}

const MapPanel = ({ trials }: MapPanelProps) => {
  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[56.1304, -106.3468]}
        zoom={4}
        className="h-full w-full z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds trials={trials} />
        {trials.map((trial) => (
          <Marker
            key={trial.trial_id}
            position={[trial.latitude, trial.longitude]}
            icon={trial.recruitment_status === "Recruiting" ? recruitingIcon : closedIcon}
          >
            <Popup>
              <div className="text-sm max-w-[240px]">
                <p className="font-bold mb-1">{trial.title}</p>
                <p className="text-muted-foreground">{trial.hospital}</p>
                <p className="text-muted-foreground">{trial.city}, {trial.province}</p>
                <p className="mt-1">
                  <span className={trial.recruitment_status === "Recruiting" ? "text-recruiting font-semibold" : "text-closed font-semibold"}>
                    {trial.recruitment_status}
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 z-[1000] border border-border">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-recruiting inline-block" />
            Recruiting
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-closed inline-block" />
            Closed
          </span>
        </div>
      </div>
    </div>
  );
};

export default MapPanel;
