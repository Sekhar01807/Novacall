import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import LandingPage from './pages/landingPage';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/videoMeet/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import ProfileComponent from './pages/profile';
import NotFound from './pages/notFound';

function App() {
  return (
    <div className="App">

      <Router>

        <AuthProvider>


          <Routes>

            <Route path='/' element={<LandingPage />} />

            <Route path='/auth' element={<Authentication />} />

            <Route path='/home' element={<HomeComponent />} />
            <Route path='/profile' element={<ProfileComponent />} />
            <Route path='/history' element={<History />} />
            <Route path='/404' element={<NotFound />} />
            <Route path='/:url' element={<VideoMeetComponent />} />
            <Route path='*' element={<NotFound />} />
          </Routes>
        </AuthProvider>

      </Router>
    </div>
  );
}

export default App;