import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { csvService } from "@/lib/csv-service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Reading } from "@shared/schema";

const ITEMS_PER_PAGE = 10;

export default function DataView() {
  const [currentPage, setCurrentPage] = useState(0);
  const { toast } = useToast();

  const { data: readingsResponse, isLoading } = useQuery({
    queryKey: ["/api/readings", { limit: ITEMS_PER_PAGE, offset: currentPage * ITEMS_PER_PAGE }],
    queryFn: async () => {
      const response = await fetch(`/api/readings?limit=${ITEMS_PER_PAGE}&offset=${currentPage * ITEMS_PER_PAGE}`);
      if (!response.ok) throw new Error('Failed to fetch readings');
      return response.json();
    },
  });

  const { data: allReadingsData } = useQuery({
    queryKey: ["/api/readings", "all"],
    queryFn: async () => {
      const response = await fetch("/api/readings?limit=10000");
      if (!response.ok) throw new Error('Failed to fetch all readings');
      const data = await response.json();
      return data.readings || [];
    },
  });

  const readings = readingsResponse?.readings || [];
  const totalCount = readingsResponse?.pagination?.total || 0;
  const hasMore = readingsResponse?.pagination?.hasMore || false;
  const allReadings: Reading[] = allReadingsData || [];

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleDownloadCSV = () => {
    try {
      csvService.downloadCSV(allReadings);
      toast({
        title: "CSV Downloaded",
        description: `Exported ${allReadings.length} readings to CSV file`,
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to generate CSV file",
        variant: "destructive",
      });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const calculateAverage = () => {
    if (!allReadings.length) return 0;
    const numericReadings = allReadings
      .map(r => parseFloat(r.value))
      .filter(v => !isNaN(v));
    
    if (numericReadings.length === 0) return 0;
    
    const sum = numericReadings.reduce((acc, val) => acc + val, 0);
    return (sum / numericReadings.length).toFixed(2);
  };

  const getModeColor = (mode: string) => {
    return mode === "auto" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";
  };

  const getConfidenceColor = (confidence: string | null) => {
    if (!confidence) return "bg-gray-100 text-gray-800";
    const conf = parseFloat(confidence);
    if (conf >= 0.8) return "bg-green-100 text-green-800";
    if (conf >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      {/* Statistics */}
      <section role="group" aria-labelledby="stats-section">
        <h2 id="stats-section" className="text-lg font-semibold mb-4">Statistics</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary" data-testid="text-total-readings">
                {totalCount}
              </div>
              <div className="text-sm text-muted-foreground">Total Readings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary" data-testid="text-average-reading">
                {calculateAverage()}
              </div>
              <div className="text-sm text-muted-foreground">Average</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CSV Data Table */}
      <section role="group" aria-labelledby="data-table-section">
        <div className="flex items-center justify-between mb-4">
          <h2 id="data-table-section" className="text-lg font-semibold">Stored Data</h2>
          <Button
            onClick={handleDownloadCSV}
            disabled={!allReadings.length}
            size="sm"
            data-testid="button-download-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        {readings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No readings captured yet.</p>
              <p className="text-sm mt-2">Start capturing readings with the camera.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((reading: Reading) => (
                    <TableRow key={reading.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTimestamp(reading.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        <div className="flex flex-col">
                          <span>{reading.value}</span>
                          <span className="text-xs text-muted-foreground">{reading.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="capitalize">{reading.quantity}</span>
                          {reading.confidence && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs mt-1 ${getConfidenceColor(reading.confidence)}`}
                            >
                              {Math.round(parseFloat(reading.confidence) * 100)}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={`text-xs ${getModeColor(reading.mode)}`}
                        >
                          {reading.mode}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  Showing {currentPage * ITEMS_PER_PAGE + 1}-{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount} entries
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 0}
                    aria-label="Previous page"
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasMore}
                    aria-label="Next page"
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
