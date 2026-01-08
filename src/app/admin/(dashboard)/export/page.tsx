"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Calendar, Users, FileSpreadsheet } from "lucide-react";
import { format, addMonths } from "date-fns";

const eventTypes = [
  { value: "all", label: "All Event Types" },
  { value: "mass", label: "Mass" },
  { value: "clow", label: "CLOW" },
  { value: "volunteer", label: "Volunteer" },
  { value: "ministry", label: "Ministry" },
  { value: "other", label: "Other" },
];

export default function ExportPage() {
  const today = new Date();
  const nextMonth = addMonths(today, 1);

  const [scheduleStartDate, setScheduleStartDate] = useState(
    format(today, "yyyy-MM-dd")
  );
  const [scheduleEndDate, setScheduleEndDate] = useState(
    format(nextMonth, "yyyy-MM-dd")
  );
  const [scheduleEventType, setScheduleEventType] = useState("all");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleScheduleExport = async () => {
    setIsExporting("schedule");
    try {
      const params = new URLSearchParams({
        startDate: scheduleStartDate,
        endDate: scheduleEndDate,
        eventType: scheduleEventType,
      });

      const response = await fetch(`/api/export/schedule?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `schedule-export-${scheduleStartDate}-to-${scheduleEndDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error("Error exporting schedule:", error);
    } finally {
      setIsExporting(null);
    }
  };

  const handlePeopleExport = async () => {
    setIsExporting("people");
    try {
      const response = await fetch("/api/export/people");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `peer-ministers-${format(today, "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error("Error exporting people:", error);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Export Data</h1>
        <p className="text-gray-500">
          Download schedules and peer minister data as CSV files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-navy" />
              </div>
              <div>
                <CardTitle>Schedule Export</CardTitle>
                <CardDescription>
                  Export events and assignments to CSV
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={scheduleStartDate}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={scheduleEndDate}
                  onChange={(e) => setScheduleEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={scheduleEventType} onValueChange={setScheduleEventType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleScheduleExport}
              disabled={isExporting === "schedule"}
              className="w-full"
            >
              {isExporting === "schedule" ? (
                "Exporting..."
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Schedule CSV
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Includes event details, slot assignments, and volunteer information
            </p>
          </CardContent>
        </Card>

        {/* People Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-rust/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-rust" />
              </div>
              <div>
                <CardTitle>Peer Ministers Export</CardTitle>
                <CardDescription>
                  Export peer minister directory to CSV
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Included Data</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Name and phone number</li>
                <li>• Active/inactive status</li>
                <li>• Notification preferences</li>
                <li>• Total and upcoming assignments</li>
                <li>• Account creation date</li>
              </ul>
            </div>

            <Button
              onClick={handlePeopleExport}
              disabled={isExporting === "people"}
              className="w-full"
            >
              {isExporting === "people" ? (
                "Exporting..."
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Peer Ministers CSV
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Exports all peer ministers regardless of status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="border-info/20 bg-info/5">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <FileSpreadsheet className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">About CSV Exports</p>
              <p className="text-gray-600 mt-1">
                CSV files can be opened in Excel, Google Sheets, or any spreadsheet
                application. They are compatible with most data management and
                reporting tools.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
