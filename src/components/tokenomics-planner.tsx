"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Slider } from "./ui/slider";

import { Input } from "./ui/input";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { Info, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";

interface DistributionData {
  percentage: number;
  tge: number;
  duration: number;
}

interface Distribution {
  [key: string]: DistributionData;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9B59B6",
];

const chartConfig = {
  publicSale: { label: "Public Sale", color: COLORS[0] },
  privateRounds: { label: "Private Rounds", color: COLORS[1] },
  teamAndAdvisors: { label: "Team And Advisors", color: COLORS[2] },
  development: { label: "Development", color: COLORS[3] },
  ecosystem: { label: "Ecosystem", color: COLORS[4] },
  treasury: { label: "Treasury", color: COLORS[5] },
  liquidityPool: { label: "Liquidity Pool", color: COLORS[6] },
} satisfies ChartConfig;

const TokenomicsPlanner = () => {
  const [totalSupply, setTotalSupply] = useState(1000000000);
  const [initialTokenPrice, setInitialTokenPrice] = useState(0.001);
  const [fdv, setFdv] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const [distribution, setDistribution] = useState<Distribution>({
    publicSale: { percentage: 20, tge: 10, duration: 12 },
    privateRounds: { percentage: 15, tge: 5, duration: 24 },
    teamAndAdvisors: { percentage: 15, tge: 0, duration: 36 },
    development: { percentage: 20, tge: 0, duration: 48 },
    ecosystem: { percentage: 15, tge: 5, duration: 36 },
    treasury: { percentage: 10, tge: 0, duration: 48 },
    liquidityPool: { percentage: 5, tge: 20, duration: 24 },
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const newFdv = Math.max(0, totalSupply * initialTokenPrice);
    setFdv(newFdv);
  }, [totalSupply, initialTokenPrice]);

  const totalPercentage = Object.values(distribution).reduce(
    (sum, data) => sum + data.percentage,
    0
  );

  const generateUnlockSchedule = () => {
    const months = 48;
    const schedule = Array.from({ length: months + 1 }, (_, month) => ({
      month,
      circulating: 0,
      rawCirculating: 0,
    }));

    Object.entries(distribution).forEach(([category, data]) => {
      const tokenAmount = Math.floor((totalSupply * data.percentage) / 100);
      const tgeAmount = Math.floor((tokenAmount * data.tge) / 100);
      const remainingAmount = tokenAmount - tgeAmount;

      const monthlyUnlock = data.duration > 0 ? remainingAmount / data.duration : 0;

      schedule[0].rawCirculating += tgeAmount;

      if (data.duration > 0) {
        for (let month = 1; month <= data.duration; month++) {
          schedule[month].rawCirculating += monthlyUnlock;
        }
      }
    });

    let cumulative = 0;
    return schedule.map((point) => {
      cumulative += point.rawCirculating;
      const actualCirculating = Math.min(cumulative, totalSupply);
      return {
        month: point.month,
        circulating: actualCirculating,
        percentCirculating: (actualCirculating / totalSupply) * 100,
      };
    });
  };

  const calculateMetrics = () => {
    const unlockSchedule = generateUnlockSchedule();
    const tgeCirculating = unlockSchedule[0].circulating;
    const tgeCirculatingPercent = (tgeCirculating / totalSupply) * 100;

    return {
      tgeCirculating,
      tgeCirculatingPercent,
      initialMarketCap: tgeCirculating * initialTokenPrice,
      fdvToMcapRatio: tgeCirculating > 0 
        ? fdv / (tgeCirculating * initialTokenPrice) 
        : Number.POSITIVE_INFINITY,
      warnings: [
        tgeCirculatingPercent > 25 &&
          "High TGE unlock may cause price instability",
        (tgeCirculating > 0 && fdv / (tgeCirculating * initialTokenPrice) > 100) &&
          "High FDV/MCap ratio indicates significant future dilution",
        distribution.teamAndAdvisors.percentage > 20 &&
          "Team allocation appears high",
        distribution.liquidityPool.percentage < 5 &&
          "Low liquidity allocation may cause price volatility",
      ].filter(Boolean),
    };
  };

  const handleDistributionChange = (
    category: string,
    field: keyof DistributionData,
    value: number
  ) => {
    const numValue = Math.max(0, Number(value));

    if (field === "percentage") {
      // Calculate the total percentage without the current category
      const otherCategories = Object.entries(distribution)
        .filter(([cat]) => cat !== category);

      const otherTotal = otherCategories.reduce((sum, [_, data]) => sum + data.percentage, 0);

      // Calculate how much we need to adjust other categories
      const currentValue = distribution[category].percentage;

      if (otherTotal + numValue <= 100) {
        // If we're not exceeding 100%, just update the current category
        setDistribution(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            percentage: Math.round(numValue * 10) / 10
          }
        }));
      } else {
        // If we would exceed 100%, adjust other categories proportionally
        const scale = (100 - numValue) / otherTotal;

        let newDistribution = Object.entries(distribution).reduce((acc, [cat, data]) => {
          if (cat === category) {
            acc[cat] = { ...data, percentage: Math.round(numValue * 10) / 10 };
          } else {
            // Round to 1 decimal place
            let scaledPercentage = Math.round(data.percentage * scale * 10) / 10;
            acc[cat] = { ...data, percentage: scaledPercentage };
          }
          return acc;
        }, {} as Distribution);

        // Ensure total is exactly 100%
        const newTotal = Object.values(newDistribution).reduce((sum, data) => sum + data.percentage, 0);
        if (newTotal !== 100) {
          // Adjust the largest allocation slightly to make total exactly 100%
          const largestCategory = Object.entries(newDistribution)
            .filter(([cat]) => cat !== category)
            .reduce((max, curr) => 
              curr[1].percentage > max[1].percentage ? curr : max
            );

          if (largestCategory[0]) {
            newDistribution[largestCategory[0]].percentage += Math.round((100 - newTotal) * 10) / 10;
          }
        }

        setDistribution(newDistribution);
      }
    } else if (field === "tge") {
      setDistribution(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: Math.min(100, Math.max(0, Math.round(numValue * 10) / 10))
        }
      }));
    } else if (field === "duration") {
      setDistribution(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: Math.max(0, Math.round(numValue))
        }
      }));
    }
  };

  const handleTotalSupplyChange = (value: number) => {
    setTotalSupply(Math.max(1, value));
  };

  const handleTokenPriceChange = (value: number) => {
    setInitialTokenPrice(Math.max(0, value));
  };

  const metrics = calculateMetrics();
  const unlockSchedule = generateUnlockSchedule();

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      <Card className="w-full bg-background border-border">
        <CardHeader className="border-b border-border px-6 py-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2">
              <h2>Advanced Tokenomics Planner</h2>
              <Info className="h-4 w-4 text-muted" />
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-8">
            <div className="grid gap-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Supply</label>
                  <Input
                    type="number"
                    value={totalSupply}
                    onChange={(e) => setTotalSupply(Number(e.target.value))}
                    min="1"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Initial Token Price ($)</label>
                  <Input
                    type="number"
                    value={initialTokenPrice}
                    onChange={(e) => setInitialTokenPrice(Number(e.target.value))}
                    min="0"
                    step="0.000001"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/10 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Initial Market Cap</div>
                  <div className="text-lg font-medium mt-1">
                    ${metrics.initialMarketCap.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Fully Diluted Value</div>
                  <div className="text-lg font-medium mt-1">
                    ${fdv.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">TGE Circulating</div>
                  <div className="text-lg font-medium mt-1">
                    {metrics.tgeCirculatingPercent.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">FDV/MCap Ratio</div>
                  <div className="text-lg font-medium mt-1">
                    {Number.isFinite(metrics.fdvToMcapRatio)
                      ? metrics.fdvToMcapRatio.toFixed(1)
                      : "∞"}x
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Allocation</span>
                  <span
                    className={`text-lg font-medium ${
                      totalPercentage > 100 ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {totalPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-secondary/20 h-2 rounded-full mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      totalPercentage > 100 ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {Object.entries(distribution).map(([category, data]) => (
                  <div
                    key={category}
                    className="space-y-4 border border-border rounded-lg p-4"
                  >
                    <div
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() =>
                        setExpandedCategory(
                          expandedCategory === category ? null : category
                        )
                      }
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {category
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase())}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(totalSupply * (data.percentage / 100)).toLocaleString()}{" "}
                          tokens
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        {expandedCategory === category ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {expandedCategory === category && (
                      <div className="space-y-6 pt-4">
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground">
                            Allocation Percentage
                          </div>
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[data.percentage]}
                              onValueChange={([value]) =>
                                handleDistributionChange(
                                  category,
                                  "percentage",
                                  value
                                )
                              }
                              max={100}
                              step={0.1}
                              className={`flex-1 ${totalPercentage > 100 ? "opacity-50" : ""}`}
                            />
                            <Input
                              type="number"
                              value={data.percentage}
                              onChange={(e) =>
                                handleDistributionChange(
                                  category,
                                  "percentage",
                                  Number(e.target.value)
                                )
                              }
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-20 text-center"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                          <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">
                              TGE Unlock %
                            </label>
                            <Input
                              type="number"
                              value={data.tge}
                              onChange={(e) =>
                                handleDistributionChange(
                                  category,
                                  "tge",
                                  Number(e.target.value)
                                )
                              }
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">
                              Vesting Duration (months)
                            </label>
                            <Input
                              type="number"
                              value={data.duration}
                              onChange={(e) =>
                                handleDistributionChange(
                                  category,
                                  "duration",
                                  Number(e.target.value)
                                )
                              }
                              min="0"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {totalPercentage > 100 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Invalid Distribution</AlertTitle>
                <AlertDescription>
                  Total allocation exceeds 100%. Please adjust the percentages.
                </AlertDescription>
              </Alert>
            )}

            {unlockSchedule && (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Token Distribution</h3>
                  <div className="flex flex-col items-center">
                    <PieChart width={400} height={300}>
                      <Pie
                        data={Object.entries(distribution).map(([name, data]) => ({
                          name: name
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase()),
                          value: data.percentage,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(distribution).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) {
                            return null;
                          }
                          return (
                            <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                              <div className="text-sm">
                                {payload[0].name}: {payload[0].value.toFixed(1)}%
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Token Unlock Schedule</h3>
                  <div className="text-sm text-muted-foreground">
                    Shows cumulative circulating supply percentage over time
                  </div>
                  <div className="h-[300px] w-full">
                    <LineChart
                      width={400}
                      height={300}
                      data={unlockSchedule}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        label={{
                          value: "Months",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis
                        label={{
                          value: "Circulating Supply %",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) {
                            return null;
                          }
                          return (
                            <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                              <div className="text-sm text-muted-foreground">
                                Month {label}
                              </div>
                              <div className="text-sm font-medium">
                                {payload[0].value.toFixed(1)}% Circulating
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="percentage"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenomicsPlanner;