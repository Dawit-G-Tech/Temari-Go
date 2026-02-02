"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, CircleDot } from "lucide-react";

export default function MapPage() {
  const [tab, setTab] = useState("geofences");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Map & Geofences</h1>
        <p className="text-muted-foreground mt-1">
          Locations and geofence zones (school, home, etc.).
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="size-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="geofences" className="flex items-center gap-2">
            <CircleDot className="size-4" />
            Geofences
          </TabsTrigger>
        </TabsList>
        <TabsContent value="locations" className="mt-6">
          <p className="text-muted-foreground">
            Track bus and vehicle locations. (Content coming soon.)
          </p>
        </TabsContent>
        <TabsContent value="geofences" className="mt-6">
          <p className="text-muted-foreground">
            Define and manage geofence zones (school, home, etc.). (Content coming soon.)
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
