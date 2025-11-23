import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material/styles';
import { Stack } from '@mui/material';
import { useDashboard } from 'context/DashboardContext';
import { formatNumber, formatYAxis } from './util/formatter';
import { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';

interface ChartData {
  NAME: string;
  TOTAL: number;
  [key: string]: string | number;
}

export default function RealTimeAreaChart(): JSX.Element {
  const theme = useTheme();
  const { primary, warning, error, info, secondary, success } = theme.palette;
  const colorSet = [primary.light, warning.light, error.light, info.light, success.light, '#F0A8D0', '#FFAD60', '#6482AD'];
  const [data, setData] = useState<ChartData[]>([]);
  const { isPending, realTimeDataset } = useDashboard();

  useEffect(() => {
    if (realTimeDataset) {
      setData(realTimeDataset);
    }
  }, [realTimeDataset]);

  return (
    <ResponsiveContainer width="100%" height={450}>
      {(isPending || !realTimeDataset) && (
        <Stack justifyContent="center" alignItems="center" sx={{ width: '100%' }}>
          <CircularProgress />
        </Stack>
      )}
      <BarChart
        layout="vertical"
        width={500}
        height={450}
        data={data}
        margin={{
          top: 30,
          right: 70,
          left: 70,
          bottom: 30
        }}
      >
        <CartesianGrid vertical={true} horizontal={false} stroke="#f5f5f5" />
        <YAxis dataKey="NAME" type="category" tick={{ fontSize: 12, color: '#999' }} axisLine={false} tickLine={false} tickMargin={10} />
        <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 12, color: '#999' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value: number) => `${formatNumber(value)}원`} cursor={false} />

        <Bar dataKey="TOTAL" stackId="1" isAnimationActive={false} barSize={30} radius={[3, 5, 5, 3]}>
          {realTimeDataset?.map((entry: ChartData, index: number) => (
            <Cell key={index} fill={colorSet[index] ?? secondary.light} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

