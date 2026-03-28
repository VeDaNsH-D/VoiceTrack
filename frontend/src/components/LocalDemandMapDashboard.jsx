import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { MapView } from "./MapView";
import { SidePanel } from "./SidePanel";

const API_BASE = (
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_BACKEND_URL?.trim() ||
    "http://localhost:5001"
).replace(/\/$/, "");

export function LocalDemandMapDashboard() {
    const [points, setPoints] = useState([]);
    const [insights, setInsights] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [loadingMap, setLoadingMap] = useState(false);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [error, setError] = useState("");

    const loadMapPoints = useCallback(async () => {
        try {
            setLoadingMap(true);
            setError("");

            const response = await axios.get(`${API_BASE}/api/map-points`);
            const payload = response?.data?.data || response?.data || {};
            const rows = Array.isArray(payload.points) ? payload.points : [];

            const nextPoints = rows
                .filter((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
                .map((point) => ({
                    lat: Number(point.lat),
                    lng: Number(point.lng),
                    weight: Number(point.weight) || 1,
                }));

            setPoints(nextPoints);

            if (nextPoints.length < 100) {
                console.warn(`[LocalDemandMapDashboard] Only ${nextPoints.length} map points available; expected 100+ for dense city heatmap.`);
            }
        } catch (_) {
            setError("Unable to load map points.");
        } finally {
            setLoadingMap(false);
        }
    }, []);

    useEffect(() => {
        void loadMapPoints();
    }, [loadMapPoints]);

    const handleMapClick = useCallback(async ({ lat, lng }) => {
        setSelectedPoint({ lat, lng });
        setLoadingInsights(true);
        setError("");

        try {
            const response = await axios.get(`${API_BASE}/api/area-insights`, {
                params: { lat, lng },
            });

            const payload = response?.data?.data || response?.data || {};
            setInsights(payload);
        } catch (_) {
            setError("Failed to load area insights.");
            setInsights(null);
        } finally {
            setLoadingInsights(false);
        }
    }, []);

    return (
        <div className="h-screen bg-slate-100 p-4">
            <div className="mb-3 rounded-xl bg-white px-5 py-3 shadow-md">
                <h1 className="text-xl font-semibold text-slate-900">Local Demand Intelligence Map</h1>
                <p className="text-sm text-slate-500">
                    Click any hotspot on the map to get top items, category trends, and AI recommendations.
                </p>
            </div>

            <div className="grid h-[calc(100vh-120px)] grid-cols-10 gap-4">
                <div className="col-span-7 rounded-xl bg-white p-2 shadow-md">
                    {loadingMap ? (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            Loading transaction density map...
                        </div>
                    ) : (
                        <MapView
                            points={points}
                            onMapClick={handleMapClick}
                            selectedPoint={selectedPoint}
                        />
                    )}
                </div>

                <div className="col-span-3">
                    <SidePanel
                        loading={loadingInsights}
                        error={error}
                        insights={insights}
                        selectedPoint={selectedPoint}
                    />
                </div>
            </div>
        </div>
    );
}
