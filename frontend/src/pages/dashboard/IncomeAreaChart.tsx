import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@mui/material/styles';
import { formatNumber, formatYAxis } from './util/formatter';
import { useMonthlyData } from './dataset/monthlyIncome';
import CircularProgress from '@mui/material/CircularProgress';
import { Stack } from '@mui/material';

interface IncomeAreaChartProps {
  slot?: string;
}

interface MonthlyData {
  MONTH: string;
  [key: string]: string | number;
}

export default function IncomeAreaChart({ slot }: IncomeAreaChartProps): JSX.Element {
  const theme = useTheme();
  const { primary, secondary, error, warning, info, success } = theme.palette;
  const colorSet = [primary.light, warning.light, error.light, info.light, success.light, '#F0A8D0', '#FFAD60', '#6482AD'];

  const { monthlyData, isPending } = useMonthlyData(slot);

  const allKeys = [...new Set(monthlyData?.flatMap((item: MonthlyData) => Object.keys(item)))].filter((key: string) => key !== 'MONTH');
  
  return (
    <ResponsiveContainer width="100%" height={450}>
      {(isPending || (slot === 'month' && !monthlyData)) && (
        <Stack justifyContent="center" alignItems="center" sx={{ width: '100%' }}>
          <CircularProgress />
        </Stack>
      )}

      <BarChart
        layout="vertical"
        width={500}
        height={450}
        data={slot === 'week' ? monthlyData : monthlyData}
        margin={{
          top: 15,
          right: 20,
          left: 10,
          bottom: 15
        }}
      >
        <CartesianGrid vertical={true} horizontal={false} stroke="#f5f5f5" />
        <YAxis
          dataKey="MONTH"
          type="category"
          tickFormatter={(value: string) => {
            return `${value?.split('-')[1]}월`;
          }}
          tick={{ fontSize: 12, color: '#999' }}
          axisLine={false}
          tickLine={{ stroke: '#ddd' }}
          tickSize={5}
          tickMargin={10}
        />
        <XAxis
          type="number"
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12, color: '#999' }}
          axisLine={false}
          tickLine={{ stroke: '#ddd' }}
          tickSize={5}
          tickMargin={10}
        />
        <Tooltip formatter={(value: number) => `${formatNumber(value)}원`} />
        {allKeys?.map((key: string, idx: number) => (
          <Bar key={key} dataKey={key} stackId="1" barSize={25} radius={[0, 3, 3, 0]} fill={colorSet[idx] ?? secondary.light} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

