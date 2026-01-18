// src/features/map/SharedMap.web.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import type { LatLng, MapMarker } from "./types";
import "./leaflet.web.css";

type Props = {
    center: LatLng;
    markers: MapMarker[];
    height?: number;
    zoom?: number;
};

type RL = typeof import("react-leaflet");
type LeafletNS = typeof import("leaflet");

export default function SharedMap({ center, markers, height = 220, zoom = 15 }: Props) {
    const [ready, setReady] = useState(false);
    const [RL, setRL] = useState<RL | null>(null);

    // Only run in actual browser runtime
    useEffect(() => {
        let mounted = true;

        (async () => {
            if (typeof window === "undefined") return;

            const leaflet = (await import("leaflet")) as unknown as LeafletNS;
            const reactLeaflet = (await import("react-leaflet")) as unknown as RL;

            // Fix Leaflet marker icon paths in bundlers
            const DefaultIcon = leaflet.icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });
            leaflet.Marker.prototype.options.icon = DefaultIcon;


            if (!mounted) return;
            setRL(reactLeaflet);
            setReady(true);
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const centerTuple = useMemo(() => [center.lat, center.lng] as [number, number], [center.lat, center.lng]);

    if (!ready || !RL) {
        return (
            <View style={[styles.wrap, { height }]}>
                <View style={styles.loading}>
                    {/* keep it simple, no spinner dependency */}
                </View>
            </View>
        );
    }

    const { MapContainer, TileLayer, Marker, Popup } = RL;

    return (
        <View style={[styles.wrap, { height }]}>
            <MapContainer center={centerTuple} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {markers.map((m) => {
                    const pos = [m.position.lat, m.position.lng] as [number, number];
                    return (
                        <Marker key={m.id} position={pos}>
                            {(m.title || m.subtitle) && (
                                <Popup>
                                    <div style={{ fontWeight: 800 }}>{m.title ?? "Location"}</div>
                                    {m.subtitle && <div style={{ opacity: 0.85 }}>{m.subtitle}</div>}
                                </Popup>
                            )}
                        </Marker>
                    );
                })}
            </MapContainer>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
    },
    loading: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.02)",
    },
});
