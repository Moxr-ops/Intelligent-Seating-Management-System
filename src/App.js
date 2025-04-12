import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './styles/main.css';
import SeatSystem from './components/GridOfSeats';
import './styles/SeatGrid.css';

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container" style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <header className="app-header">
          <h1>智能教室排座系统</h1>
        </header>
        
        <div className='main-content'>
          <SeatSystem/>
        </div>
      </div>
    </DndProvider>
  );
}