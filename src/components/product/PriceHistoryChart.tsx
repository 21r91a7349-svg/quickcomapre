'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingDown, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PriceHistoryChartProps {
  productId: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  'Blinkit': '#f59e0b', // amber-500
  'BigBasket': '#16a34a', // green-600
  'Zepto': '#9333ea', // purple-600
  'Swiggy Instamart': '#f97316' // orange-500
};

export function PriceHistoryChart({ productId }: PriceHistoryChartProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/${productId}/history?days=${days}`);
        if (!res.ok) throw new Error('Failed to fetch price history');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [productId, days]);

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex items-center justify-center p-6 text-destructive">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p>Unable to load price history</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 space-y-4 sm:space-y-0">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            Price History
          </CardTitle>
          <CardDescription>Compare historical pricing across platforms</CardDescription>
        </div>
        
        <Tabs defaultValue="30" value={days} onValueChange={setDays} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="7">7 Days</TabsTrigger>
            <TabsTrigger value="30">30 Days</TabsTrigger>
            <TabsTrigger value="0">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <Skeleton className="h-20 w-full rounded-xl" />
               <Skeleton className="h-20 w-full rounded-xl" />
               <Skeleton className="h-20 w-full rounded-xl" />
               <Skeleton className="h-20 w-full rounded-xl" />
            </div>
            <Skeleton className="w-full h-[300px] rounded-xl" />
          </div>
        ) : !data?.chartData || data.chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border border-dashed rounded-xl bg-muted/20">
            <Calendar className="w-10 h-10 mb-3 opacity-20" />
            <p>Not enough historical data available yet.</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Lowest Price</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">₹{data.stats.lowest?.toFixed(2)}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Highest Price</p>
                <p className="text-2xl font-bold text-destructive">₹{data.stats.highest?.toFixed(2)}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Average Price</p>
                <p className="text-2xl font-bold">₹{data.stats.average?.toFixed(2)}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <TrendingDown className="w-24 h-24" />
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Max Savings</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-primary">₹{data.stats.currentSavings?.toFixed(2) || '0.00'}</p>
                  {data.stats.currentSavings > 0 && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      <TrendingDown className="w-3 h-3 mr-1" /> Save
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="w-full h-[350px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `₹${value}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                    labelStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                  
                  {data.platforms.map((platform: string) => (
                    <Line
                      key={platform}
                      type="monotone"
                      dataKey={platform}
                      stroke={PLATFORM_COLORS[platform] || 'hsl(var(--primary))'}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick fallback Badge component to avoid creating another file if it's missing in some scope
function Badge({ children, variant = 'default', className = '' }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}
