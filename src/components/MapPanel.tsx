import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import { Trial, UserProfile } from "@/data/types";
import {
  getTrialColor,
  calculateDistance,
  calculateTrialSuitability,
} from "@/lib/trialMatching";
import TrialCalendar from "./TrialCalendar";

interface MapPanelProps {
  trials: Trial[];
  userProfile?: UserProfile;
  onTrialClick?: (trial: Trial) => void;
}

export interface MapPanelRef {
  zoomToTrial: (trial: Trial) => void;
  zoomToTrials: (trialsToZoom: Trial[]) => void;
}

const MapPanel = forwardRef<MapPanelRef, MapPanelProps>(
  ({ trials, userProfile, onTrialClick }, ref) => {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);
    const routesRef = useRef<L.LayerGroup | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const initializedRef = useRef(false);
    const activeRouteRef = useRef<L.Polyline | null>(null);

    useImperativeHandle(ref, () => ({
      zoomToTrial: (trial: Trial) => {
        if (mapRef.current && markersRef.current && routesRef.current) {
          // Clear any existing route
          if (activeRouteRef.current) {
            routesRef.current.removeLayer(activeRouteRef.current);
            activeRouteRef.current = null;
          }

          // Draw route for this specific trial if user profile exists
          if (userProfile) {
            const suitabilityScore = calculateTrialSuitability(trial, userProfile);
            const color = getTrialColor(suitabilityScore);
            
            // Fetch and draw route
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${userProfile.longitude},${userProfile.latitude};${trial.longitude},${trial.latitude}?overview=full&geometries=geojson`
            )
              .then(response => response.json())
              .then(data => {
                if (data.routes && data.routes.length > 0) {
                  const route = data.routes[0];
                  const coordinates = route.geometry.coordinates.map(
                    (coord: [number, number]) => [coord[1], coord[0]] as L.LatLngTuple
                  );
                  
                  // Draw the actual road route
                  const polyline = L.polyline(coordinates, {
                    color: color,
                    weight: 3,
                    opacity: 0.7,
                  });
                  activeRouteRef.current = polyline;
                  routesRef.current!.addLayer(polyline);
                }
              })
              .catch(error => {
                console.warn("Routing failed:", error);
              });

            // Create bounds that include both user location and trial
            const bounds = L.latLngBounds([
              [userProfile.latitude, userProfile.longitude],
              [trial.latitude, trial.longitude],
            ]);
            
            // Calculate distance to determine appropriate zoom
            const distance = calculateDistance(
              userProfile.latitude,
              userProfile.longitude,
              trial.latitude,
              trial.longitude
            );
            
            // Determine max zoom based on distance
            let maxZoom = 11;
            if (distance < 10) maxZoom = 12;      // Very close: zoom in more
            else if (distance < 50) maxZoom = 10;  // Close: moderate zoom
            else if (distance < 200) maxZoom = 8;  // Medium: zoom out
            else maxZoom = 7;                      // Far: zoom out more
            
            // Fit bounds with dynamic padding and zoom
            mapRef.current.fitBounds(bounds, { 
              padding: [100, 100],
              maxZoom: maxZoom
            });
          } else {
            // If no user profile, just zoom to trial
            mapRef.current.setView([trial.latitude, trial.longitude], 10, {
              animate: true,
              duration: 1,
            });
          }
          
          // Find and open the popup for this trial
          setTimeout(() => {
            markersRef.current?.eachLayer((layer) => {
              if (layer instanceof L.Marker) {
                const latLng = layer.getLatLng();
                if (latLng.lat === trial.latitude && latLng.lng === trial.longitude) {
                  layer.openPopup();
                }
              }
            });
          }, 500);
        }
      },
      zoomToTrials: (trialsToZoom: Trial[]) => {
        if (mapRef.current && trialsToZoom.length > 0) {
          // Clear any existing route when showing multiple trials
          if (activeRouteRef.current && routesRef.current) {
            routesRef.current.removeLayer(activeRouteRef.current);
            activeRouteRef.current = null;
          }

          const bounds = L.latLngBounds(
            trialsToZoom
              .filter((t) => t.latitude && t.longitude)
              .map((t) => [t.latitude, t.longitude] as L.LatLngTuple)
          );

          if (userProfile && bounds.isValid()) {
            const userLatLng = L.latLng(
              userProfile.latitude,
              userProfile.longitude
            );
            bounds.extend(userLatLng);
          }

          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
          }
        }
      },
    }));

    useEffect(() => {
      if (!containerRef.current || initializedRef.current) return;

      try {
        // Clear any existing leaflet remnants
        if (containerRef.current.childNodes.length > 0) {
          containerRef.current.innerHTML = "";
        }

        const centerLat = userProfile ? userProfile.latitude : 56.1304;
        const centerLon = userProfile ? userProfile.longitude : -106.3468;

        mapRef.current = L.map(containerRef.current, {
          center: [centerLat, centerLon],
          zoom: userProfile ? 6 : 4,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);

        markersRef.current = L.layerGroup().addTo(mapRef.current);
        routesRef.current = L.layerGroup().addTo(mapRef.current);
        initializedRef.current = true;

        // Add user location marker if profile exists
        if (userProfile) {
          const userIcon = L.divIcon({
            html: `<div style="position:relative;width:32px;height:40px;">
              <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#ef4444"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
              </svg>
            </div>`,
            className: "",
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40],
          });
          userMarkerRef.current = L.marker(
            [userProfile.latitude, userProfile.longitude],
            { icon: userIcon }
          );
          userMarkerRef.current.bindPopup(
            `<div style="font-size:13px"><p style="font-weight:700;margin:0">${userProfile.name}</p><p style="color:#666;margin:0">${userProfile.city}, ${userProfile.province}</p></div>`
          );
          userMarkerRef.current.addTo(mapRef.current);
        }

        // Trigger a resize to ensure map renders properly
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 100);
      } catch (error) {
        console.error("Error initializing map:", error);
      }

      return () => {
        if (mapRef.current) {
          mapRef.current.off();
          mapRef.current.remove();
          mapRef.current = null;
        }
        initializedRef.current = false;
      };
    }, [userProfile]);

    useEffect(() => {
      if (!mapRef.current || !markersRef.current || !routesRef.current || trials.length === 0) return;

      markersRef.current.clearLayers();
      // Don't clear routes here - they're managed by click events

      trials.forEach((trial) => {
        if (!trial.latitude || !trial.longitude) return;

        // Determine color based on suitability if user profile exists
        let color = "#9ca3af"; // default gray
        let markerSize = 28;

        if (userProfile) {
          const suitabilityScore = calculateTrialSuitability(trial, userProfile);
          color = getTrialColor(suitabilityScore);
          // Make highly suitable trials slightly larger
          if (suitabilityScore >= 75) markerSize = 32;
        } else {
          color =
            trial.recruitment_status === "Recruiting" ? "#16a34a" : "#6b7280";
        }

        const icon = new L.DivIcon({
          html: `<div style="position:relative;width:${markerSize}px;height:${markerSize + 8}px;">
            <svg width="${markerSize}" height="${markerSize + 8}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="${color}"/>
              <circle cx="16" cy="16" r="5" fill="white"/>
            </svg>
          </div>`,
          className: "",
          iconSize: [markerSize, markerSize + 8],
          iconAnchor: [markerSize / 2, markerSize + 8],
          popupAnchor: [0, -(markerSize + 8)],
        });

        let popupContent = `<div style="max-width:240px;font-size:13px">
          <p style="font-weight:700;margin:0 0 4px 0">${trial.title}</p>
          <p style="color:#666;margin:0 0 2px 0">${trial.hospital}</p>
          <p style="color:#666;margin:0 0 4px 0">${trial.city}, ${trial.province}</p>`;

        // Add suitability and distance info if user profile exists
        if (userProfile) {
          const suitabilityScore = calculateTrialSuitability(trial, userProfile);
          const distance = calculateDistance(
            userProfile.latitude,
            userProfile.longitude,
            trial.latitude,
            trial.longitude
          );
          const suitabilityLabel =
            suitabilityScore >= 75
              ? "Excellent match"
              : suitabilityScore >= 50
                ? "Good match"
                : suitabilityScore >= 25
                  ? "Fair match"
                  : "Limited match";

          popupContent += `<p style="margin:4px 0 0 0;font-weight:600;color:${color}">${suitabilityLabel} (${suitabilityScore}%)</p>`;
          popupContent += `<p style="margin:2px 0 0 0;color:#666">Distance: ${distance.toFixed(1)} km</p>`;
        } else {
          popupContent += `<p style="margin:4px 0 0 0;font-weight:600;color:${color}">${trial.recruitment_status}</p>`;
        }

        popupContent += `<div style="margin-top:8px;display:flex;gap:4px;">
          <a href="/trial/${trial.trial_id}" style="flex:1;text-align:center;padding:6px 12px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:12px;font-weight:500;">View Details</a>
        </div>`;
        popupContent += "</div>";

        const marker = L.marker([trial.latitude, trial.longitude], { icon });
        marker.bindPopup(popupContent, { maxWidth: 250 });
        
        // Add click handler to show route when marker is clicked
        marker.on('click', () => {
          // Notify parent component that this trial was clicked
          if (onTrialClick) {
            onTrialClick(trial);
          }
          
          if (userProfile && routesRef.current) {
            // Clear any existing route
            if (activeRouteRef.current) {
              routesRef.current.removeLayer(activeRouteRef.current);
              activeRouteRef.current = null;
            }

            // Fetch and draw route for clicked trial
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${userProfile.longitude},${userProfile.latitude};${trial.longitude},${trial.latitude}?overview=full&geometries=geojson`
            )
              .then(response => response.json())
              .then(data => {
                if (data.routes && data.routes.length > 0) {
                  const route = data.routes[0];
                  const coordinates = route.geometry.coordinates.map(
                    (coord: [number, number]) => [coord[1], coord[0]] as L.LatLngTuple
                  );
                  
                  // Draw the actual road route
                  const polyline = L.polyline(coordinates, {
                    color: color,
                    weight: 3,
                    opacity: 0.7,
                  });
                  activeRouteRef.current = polyline;
                  routesRef.current!.addLayer(polyline);
                }
              })
              .catch(error => {
                console.warn("Routing failed:", error);
              });
          }
        });

        markersRef.current!.addLayer(marker);
      });

      // Fit bounds with all markers
      const bounds = L.latLngBounds(
        trials
          .filter((t) => t.latitude && t.longitude)
          .map((t) => [t.latitude, t.longitude] as L.LatLngTuple)
      );

      // Include user location in bounds if available
      if (userProfile && bounds.isValid()) {
        const userLatLng = L.latLng(userProfile.latitude, userProfile.longitude);
        bounds.extend(userLatLng);
      }

      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
      }
    }, [trials, userProfile]);

    const handleDateSelect = (date: Date, trialsOnDate: Trial[]) => {
      // When a date is selected, zoom to show those trials
      if (trialsOnDate.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(
          trialsOnDate.map((t) => [t.latitude, t.longitude] as L.LatLngTuple)
        );
        
        if (userProfile) {
          bounds.extend([userProfile.latitude, userProfile.longitude]);
        }
        
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
      }
    };

    return (
      <div className="h-full w-full flex flex-col relative overflow-hidden bg-background">
        <div
          ref={containerRef}
          className="flex-1 w-full"
          style={{ minHeight: 0 }}
        />
        
        {/* Trial Calendar - positioned absolutely over the map */}
        <div className="absolute top-0 right-0 h-full pointer-events-none z-[1001]">
          <div className="pointer-events-auto">
            <TrialCalendar trials={trials} onDateSelect={handleDateSelect} />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-2 z-[1000] border border-border shadow-sm">
          <div className="flex flex-col gap-2 text-xs">
            {!userProfile ? (
              <>
                <div className="flex items-center gap-2">
                  <svg width="16" height="20" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#16a34a"/>
                    <circle cx="16" cy="16" r="5" fill="white"/>
                  </svg>
                  <span>Recruiting</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="20" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#6b7280"/>
                    <circle cx="16" cy="16" r="5" fill="white"/>
                  </svg>
                  <span>Closed</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <svg width="16" height="20" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#10b981"/>
                    <circle cx="16" cy="16" r="5" fill="white"/>
                  </svg>
                  <span>Excellent match (&gt;75%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="20" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#f59e0b"/>
                    <circle cx="16" cy="16" r="5" fill="white"/>
                  </svg>
                  <span>Good match (50-74%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="20" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#3b82f6"/>
                    <circle cx="16" cy="16" r="5" fill="white"/>
                  </svg>
                  <span>Fair match (25-49%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="20" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#9ca3af"/>
                    <circle cx="16" cy="16" r="5" fill="white"/>
                  </svg>
                  <span>Limited match (&lt;25%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="20" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#ef4444"/>
                    <circle cx="16" cy="16" r="6" fill="white"/>
                  </svg>
                  <span>Your location</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MapPanel.displayName = "MapPanel";

export default MapPanel;
