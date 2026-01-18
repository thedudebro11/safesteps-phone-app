// src/features/map/SharedMap.native.tsx
import React from "react";
import MapView, { Marker, Region } from "react-native-maps";
import { View, StyleSheet } from "react-native";
import type { LatLng, MapMarker } from "./types";

type Props = {
    center: LatLng;
    markers: MapMarker[];
    height?: number;
    zoomDelta?: number; // roughly controls how "zoomed" the region is
};

export default function SharedMap({
    center,
    markers,
    height = 220,
    zoomDelta = 0.01,
}: Props) {
    const region: Region = {
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: zoomDelta,
        longitudeDelta: zoomDelta,
    };

    return (
        <View style={[styles.wrap, { height }]} pointerEvents="none">
            <MapView
                style={StyleSheet.absoluteFill}
                region={region}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
                pointerEvents="none"
            >

                {markers.map((m) => (
                    <Marker
                        key={m.id}
                        coordinate={{ latitude: m.position.lat, longitude: m.position.lng }}
                        title={m.title}
                        description={m.subtitle}
                    />
                ))}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
    },
});
