// project import
import Routes from 'routes';
import ThemeCustomization from 'themes';
import ScrollTop from 'components/ScrollTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SocketProvider from 'context/SocketContext';
import DashBoardProvider from 'context/DashboardContext';
import './App.css';

// ==============================|| APP - THEME, ROUTER, LOCAL  ||============================== //
const queryClient = new QueryClient();

const App = (): JSX.Element => (
  <ThemeCustomization>
    <ScrollTop>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <DashBoardProvider>
            <Routes />
          </DashBoardProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ScrollTop>
  </ThemeCustomization>
);

export default App;

