import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SkillList from './pages/SkillList';
import KnowledgeTracker from './pages/KnowledgeTracker';
import PostLoginCheckIn from './pages/PostLoginCheckIn';
import Calendar from './pages/Calendar';
import { MotionProvider } from './context/MotionContext';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <MotionProvider>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Protected routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout>
                                        <Dashboard />
                                    </DashboardLayout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/skills"
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout>
                                        <SkillList />
                                    </DashboardLayout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/knowledge"
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout>
                                        <KnowledgeTracker />
                                    </DashboardLayout>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/check-in"
                            element={
                                <ProtectedRoute>
                                    <PostLoginCheckIn />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/calendar"
                            element={
                                <ProtectedRoute>
                                    <DashboardLayout>
                                        <Calendar />
                                    </DashboardLayout>
                                </ProtectedRoute>
                            }
                        />

                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </MotionProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

