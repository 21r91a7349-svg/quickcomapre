'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { AlertCircle, Calendar } from 'lucide-react';
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
      <div className="flex items-center justify-center p-6 text-destructive bg-destructive/5 rounded-xl border border-destructive/20">
        <AlertCircle className="w-5 h-5 mr-2" />
        <p>Unable to load price history</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex justify-end mb-4">
        <Tabs defaultValue="30" value={days} onValueChange={setDays} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="7" className="text-xs">7 Days</TabsTrigger>
            <TabsTrigger value="30" className="text-xs">30 Days</TabsTrigger>
            <TabsTrigger value="0" className="text-xs">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {loading ? (
        <div className="w-full h-full min-h-[200px] flex items-end gap-2 pb-4">
          <Skeleton className="w-full h-1/3 rounded-md" />
          <Skeleton className="w-full h-2/3 rounded-md" />
          <Skeleton className="w-full h-1/2 rounded-md" />
          <Skeleton className="w-full h-3/4 rounded-md" />
        </div>
      ) : !data?.chartData || data.chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground border border-dashed rounded-xl bg-muted/20">
          <Calendar className="w-8 h-8 mb-3 opacity-20" />
          <p className="text-sm">Not enough historical data available yet.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-[200px] w-full animate-in fade-in duration-500">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickMargin={8}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis 
                domain={['dataMin', 'dataMax']}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `₹${value}`}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                  backdropFilter: 'blur(8px)',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '13px', fontWeight: 600, padding: '2px 0' }}
                labelStyle={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase' }}
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              {data.platforms.map((platform: string) => (
                <Line
                  key={platform}
                  type="monotone"
                  dataKey={platform}
                  stroke={PLATFORM_COLORS[platform] || 'hsl(var(--primary))'}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                  animationDuration={1500}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
