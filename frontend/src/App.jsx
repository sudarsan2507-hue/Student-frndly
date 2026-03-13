import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SkillList from './pages/SkillList';
import KnowledgeTracker from './pages/KnowledgeTracker';
import PostLoginCheckIn from './pages/PostLoginCheckIn';
import Calendar from './pages/Calendar';
import AdminDashboard from './pages/AdminDashboard';
import StudentMessages from './pages/StudentMessages';
import { MotionProvider } from './context/MotionContext';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

/** Guard: admin-only, redirects students to /dashboard */
const AdminRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
    return children;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <MotionProvider>
                    <Routes>
                        {/* Public */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Admin */}
                        <Route path="/admin" element={
                            <AdminRoute>
                                <DashboardLayout>
                                    <AdminDashboard />
                                </DashboardLayout>
                            </AdminRoute>
                        } />

                        {/* Student check-in */}
                        <Route path="/check-in" element={<ProtectedRoute><PostLoginCheckIn /></ProtectedRoute>} />

                        {/* Student pages */}
                        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/skills" element={<ProtectedRoute><DashboardLayout><SkillList /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/knowledge" element={<ProtectedRoute><DashboardLayout><KnowledgeTracker /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/calendar" element={<ProtectedRoute><DashboardLayout><Calendar /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/messages" element={<ProtectedRoute><DashboardLayout><StudentMessages /></DashboardLayout></ProtectedRoute>} />

                        {/* Default */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </MotionProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
