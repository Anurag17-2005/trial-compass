import { useEffect, useRef } from "react";
import L from "leaflet";
import { Trial } from "@/data/types";

const MapPanel = ({ trials }: { trials: Trial[] }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [56.1304, -106.3468],
      zoom: 4,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    markersRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    trials.forEach((trial) => {
      const color = trial.recruitment_status === "Recruiting" ? "#16a34a" : "#6b7280";
      const icon = new L.DivIcon({
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([trial.latitude, trial.longitude], { icon });
      marker.bindPopup(`
        <div style="max-width:240px;font-size:13px">
          <p style="font-weight:700;margin-bottom:4px">${trial.title}</p>
          <p style="color:#6b7280">${trial.hospital}</p>
          <p style="color:#6b7280">${trial.city}, ${trial.province}</p>
          <p style="margin-top:4px;font-weight:600;color:${color}">${trial.recruitment_status}</p>
        </div>
      `);
      markersRef.current!.addLayer(marker);
    });

    if (trials.length > 0) {
      const bounds = L.latLngBounds(trials.map((t) => [t.latitude, t.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [trials]);

  return (
    <div className="h-full w-full relative">
      <div ref={containerRef} className="h-full w-full z-0" />
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
